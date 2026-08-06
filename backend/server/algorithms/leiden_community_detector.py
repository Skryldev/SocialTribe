from dataclasses import dataclass
import random
import numpy as np
from logger_config import get_logger

# ═══════════════════════════════════════════
# Zig Bridge - Leiden Core Engine
# ═══════════════════════════════════════════
from tribecore import LeidenBridge

logger = get_logger(__name__)


@dataclass(slots=True)
class CommunityGraph:
    node_ids: list[str]
    node_id_to_index: dict[str, int]
    index_to_node_id: dict[int, str]
    adjacency: dict[int, list[int]]
    # Zig-ready packed representation
    adjacency_flat: np.ndarray | None = None
    adjacency_offsets: np.ndarray | None = None
    adjacency_lengths: np.ndarray | None = None


@dataclass(slots=True)
class CommunityState:
    node_to_community: list[int]
    communities: list[list[int]]
    improved: bool = False


class LeidenCommunityDetector:

    def __init__(self, repository, graph_id=None):
        self.repository = repository
        self.graph_id = graph_id
        self._zig = LeidenBridge()

    def _build_graph(self) -> CommunityGraph:
        node_ids = self.repository.get_node_ids(self.graph_id)
        node_id_to_index = {nid: i for i, nid in enumerate(node_ids)}
        index_to_node_id = {i: nid for nid, i in node_id_to_index.items()}
        adjacency = self._build_adjacency(node_ids, node_id_to_index)

        graph = CommunityGraph(
            node_ids=node_ids,
            node_id_to_index=node_id_to_index,
            index_to_node_id=index_to_node_id,
            adjacency=adjacency,
        )

        self._pack_adjacency_for_zig(graph)
        return graph

    def _build_adjacency(
            self,
            node_ids: list[str],
            node_id_to_index: dict[str, int],
    ) -> dict[int, list[int]]:
        neighbors = self.repository.neighbors_batch(node_ids, self.graph_id)
        adjacency = {i: set() for i in range(len(node_ids))}

        for source_id, neighs in neighbors.items():
            source = node_id_to_index.get(source_id)
            if source is None:
                continue
            for target_id in neighs:
                target = node_id_to_index.get(target_id)
                if target is None or source == target:
                    continue
                adjacency[source].add(target)
                adjacency[target].add(source)

        return {node: sorted(list(neighs)) for node, neighs in adjacency.items()}

    def _pack_adjacency_for_zig(self, graph: CommunityGraph):
        """Convert adjacency dict to flat numpy arrays for Zig."""
        offsets = [0]
        flat_list = []
        lengths = []

        for node in range(len(graph.node_ids)):
            neighbors = graph.adjacency[node]
            lengths.append(len(neighbors))
            flat_list.extend(neighbors)
            offsets.append(offsets[-1] + len(neighbors))

        graph.adjacency_flat = np.array(flat_list, dtype=np.int32)
        graph.adjacency_offsets = np.array(offsets[:-1], dtype=np.int32)
        graph.adjacency_lengths = np.array(lengths, dtype=np.int32)

    def _degree(self, graph: CommunityGraph, node: int) -> int:
        if graph.adjacency_lengths is not None:
            return graph.adjacency_lengths[node]
        return len(graph.adjacency[node])

    def _total_graph_weight(self, graph: CommunityGraph) -> float:
        if graph.adjacency_lengths is not None:
            return float(np.sum(graph.adjacency_lengths)) / 2.0
        return sum(len(n) for n in graph.adjacency.values()) / 2

    def _community_weights(
            self,
            graph: CommunityGraph,
            node: int,
            node_to_community: list[int],
    ) -> dict[int, int]:
        weights = {}
        for neighbor in graph.adjacency[node]:
            comm = node_to_community[neighbor]
            weights[comm] = weights.get(comm, 0) + 1
        return weights

    def _community_volume(self, graph: CommunityGraph, community: list[int]) -> int:
        if graph.adjacency_lengths is not None:
            return int(np.sum(graph.adjacency_lengths[community]))
        return sum(self._degree(graph, n) for n in community)

    def _modularity_gain(
            self, k_i_in: int, sigma_tot: int, k_i: int, m: float, resolution: float,
    ) -> float:
        if m == 0:
            return 0.0
        return k_i_in - resolution * (sigma_tot * k_i) / (2.0 * m)

    def _initialize_partition(self, graph: CommunityGraph) -> CommunityState:
        n = len(graph.node_ids)
        return CommunityState(
            node_to_community=list(range(n)),
            communities=[[i] for i in range(n)],
        )

    def _random_permutation(self, n: int) -> list[int]:
        nodes = list(range(n))
        random.shuffle(nodes)
        return nodes

    def _move_node(
            self,
            node: int,
            from_community: int,
            to_community: int,
            state: CommunityState,
    ):
        if from_community == to_community:
            return
        src = state.communities[from_community]
        if node in src:
            src.remove(node)
        state.communities[to_community].append(node)
        state.node_to_community[node] = to_community

    def _find_best_move(
            self,
            graph: CommunityGraph,
            node: int,
            state: CommunityState,
            resolution: float,
            m: float,
    ) -> tuple[int, float]:
        current = state.node_to_community[node]
        comm_weights = self._community_weights(graph, node, state.node_to_community)
        node_deg = self._degree(graph, node)

        cur_k_in = comm_weights.get(current, 0)
        cur_sigma = self._community_volume(graph, state.communities[current]) - node_deg
        cur_gain = self._modularity_gain(cur_k_in, cur_sigma, node_deg, m, resolution)

        best_comm = current
        best_delta = 0.0

        for comm, k_i_in in comm_weights.items():
            if comm == current:
                continue
            sigma_tot = self._community_volume(graph, state.communities[comm])
            cand_gain = self._modularity_gain(k_i_in, sigma_tot, node_deg, m, resolution)
            delta = cand_gain - cur_gain

            if delta > best_delta:
                best_delta = delta
                best_comm = comm

        return best_comm, best_delta

    def _local_moving_phase(
            self,
            graph: CommunityGraph,
            state: CommunityState,
            resolution: float,
            m: float,
    ) -> CommunityState:
        improved = False
        order = self._random_permutation(len(graph.node_ids))

        # Use Zig if packed adjacency is available
        if graph.adjacency_flat is not None:
            n = len(graph.node_ids)

            node_to_comm = np.array(state.node_to_community, dtype=np.int32)
            comm_lens = np.array([len(c) for c in state.communities], dtype=np.int32)
            comm_flat = (
                np.concatenate([np.array(c, dtype=np.int32) for c in state.communities])
                if state.communities
                else np.array([], dtype=np.int32)
            )

            result_code = self._zig.local_moving(
                graph.adjacency_flat,
                graph.adjacency_offsets,
                graph.adjacency_lengths,
                n, m, resolution,
                node_to_comm, comm_flat, comm_lens,
                np.array(order, dtype=np.int32),
            )

            if result_code == 0:
                new_communities = []
                offset = 0
                for length in comm_lens:
                    if length > 0:
                        new_communities.append(comm_flat[offset:offset + length].tolist())
                    else:
                        new_communities.append([])
                    offset += length

                state.communities = new_communities
                state.node_to_community = node_to_comm.tolist()
                state.improved = True
                self._compact_communities(state)
                return state

        # Python fallback
        for node in order:
            current = state.node_to_community[node]
            target, gain = self._find_best_move(graph, node, state, resolution, m)
            if target != current and gain > 0:
                self._move_node(node, current, target, state)
                improved = True

        if improved:
            self._compact_communities(state)

        state.improved = improved
        return state

    def _optimize_partition(
            self,
            graph: CommunityGraph,
            resolution: float,
    ) -> CommunityState:
        state = self._initialize_partition(graph)
        m = self._total_graph_weight(graph)

        for _ in range(50):
            previous = len(state.communities)
            state = self._local_moving_phase(graph, state, resolution, m)
            state = self._refinement_phase(graph, state, resolution, m)
            if not state.improved and previous == len(state.communities):
                break

        return state

    def _compact_communities(self, state: CommunityState):
        communities = []
        mapping = {}

        for old_idx, comm in enumerate(state.communities):
            if not comm:
                continue
            mapping[old_idx] = len(communities)
            communities.append(comm)

        state.communities = communities
        for node, comm in enumerate(state.node_to_community):
            state.node_to_community[node] = mapping.get(comm, 0)

    def _refinement_phase(
            self,
            graph: CommunityGraph,
            state: CommunityState,
            resolution: float,
            m: float,
    ) -> CommunityState:
        new_communities = []
        new_node_to_community = [-1] * len(graph.node_ids)
        improved = False

        for community in state.communities:
            if not community:
                continue
            if len(community) <= 1:
                self._append_community(community, new_communities, new_node_to_community)
                continue

            refined = self._refine_community(graph, community, resolution, m)
            if len(refined) > 1:
                improved = True

            for comm in refined:
                self._append_community(comm, new_communities, new_node_to_community)

        state.communities = new_communities
        state.node_to_community = new_node_to_community
        state.improved = improved
        return state

    def _append_community(
            self,
            community: list[int],
            communities: list[list[int]],
            node_to_community: list[int],
    ):
        comm_id = len(communities)
        communities.append(list(community))
        for node in community:
            node_to_community[node] = comm_id

    def _build_subgraph(
            self,
            graph: CommunityGraph,
            community: list[int],
    ) -> dict[int, list[int]]:
        community_set = set(community)
        return {
            node: [n for n in graph.adjacency[node] if n in community_set]
            for node in community
        }

    def _refine_community(
            self,
            graph: CommunityGraph,
            community: list[int],
            resolution: float,
            m: float,
    ) -> list[list[int]]:
        if len(community) <= 1:
            return [community]

        subgraph = self._build_subgraph(graph, community)
        node_to_local = {node: idx for idx, node in enumerate(community)}
        local_to_node = {idx: node for node, idx in node_to_local.items()}

        local_graph = CommunityGraph(
            node_ids=[str(i) for i in range(len(community))],
            node_id_to_index={},
            index_to_node_id={},
            adjacency={
                node_to_local[node]: [node_to_local[n] for n in subgraph[node]]
                for node in community
            },
        )

        self._pack_adjacency_for_zig(local_graph)
        local_state = self._initialize_partition(local_graph)
        local_state = self._local_moving_phase(local_graph, local_state, resolution, m)

        return [
            [local_to_node[i] for i in comm]
            for comm in local_state.communities
            if comm
        ]

    def _calculate_modularity(
            self,
            graph: CommunityGraph,
            state: CommunityState,
            resolution: float,
    ) -> float:
        # Use Zig for modularity calculation
        if graph.adjacency_flat is not None:
            n = len(graph.node_ids)
            node_to_comm = np.array(state.node_to_community, dtype=np.int32)
            comm_lens = np.array([len(c) for c in state.communities], dtype=np.int32)
            comm_flat = (
                np.concatenate([np.array(c, dtype=np.int32) for c in state.communities])
                if state.communities
                else np.array([], dtype=np.int32)
            )

            return self._zig.modularity(
                graph.adjacency_flat,
                graph.adjacency_offsets,
                graph.adjacency_lengths,
                n,
                self._total_graph_weight(graph),
                resolution,
                node_to_comm,
                comm_flat,
                comm_lens,
            )

        # Python fallback
        m = self._total_graph_weight(graph)
        if m == 0:
            return 0.0

        degrees = {node: len(graph.adjacency[node]) for node in graph.adjacency}
        q = 0.0

        for community in state.communities:
            if not community:
                continue
            comm_set = set(community)
            internal = 0
            degree_sum = 0

            for node in community:
                degree_sum += degrees[node]
                for neighbor in graph.adjacency[node]:
                    if neighbor in comm_set:
                        internal += 1

            internal /= 2
            q += internal / m - resolution * (degree_sum / (2 * m)) ** 2

        return float(q)

    def detect(self, resolution: float = 1.0):
        logger.info("Starting Leiden community detection.")

        graph = self._build_graph()

        if not graph.node_ids:
            return {
                "communities": [],
                "modularity": 0.0,
                "num_communities": 0,
                "resolution": resolution,
            }

        if len(graph.node_ids) == 1:
            return {
                "communities": [{"members": [graph.node_ids[0]], "size": 1}],
                "modularity": 0.0,
                "num_communities": 1,
                "resolution": resolution,
            }

        state = self._optimize_partition(graph, resolution)
        modularity = self._calculate_modularity(graph, state, resolution)

        communities = []
        for community in state.communities:
            if not community:
                continue
            members = [graph.index_to_node_id[node] for node in community]
            communities.append({"members": members, "size": len(members)})

        communities.sort(key=lambda c: c["size"], reverse=True)

        logger.info(
            "Leiden community detection completed with %d communities.",
            len(communities),
        )

        return {
            "communities": communities,
            "modularity": modularity,
            "num_communities": len(communities),
            "resolution": resolution,
        }