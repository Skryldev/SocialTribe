from collections import deque
from time import perf_counter
import random
from storage_engine.repository import GraphRepository
from core.simulation_seed_store import simulation_seed_store
from core.exceptions import InvalidKValueError
from logger_config import get_logger

logger = get_logger(__name__)


class InfluenceMaximizer:

    def __init__(
            self,
            repository: GraphRepository,
            graph_id: str | None = None,
    ):
        self.repository = repository
        self.graph_id = repository._graph_id(graph_id)
        self._neighbor_cache = None
        self._node_ids = None

    def _get_neighbor_map(self) -> dict:
        """Batch-load all neighbors once for O(1) lookup."""
        if self._neighbor_cache is not None:
            return self._neighbor_cache

        nodes = self.repository.get_nodes(self.graph_id)
        self._node_ids = [n.id for n in nodes]
        result = self.repository.neighbors_batch(self._node_ids, self.graph_id)
        self._neighbor_cache = {nid: set(neighs) for nid, neighs in result.items()}
        return self._neighbor_cache

    def bfs_spread(self, seeds: set[str]) -> int:
        """BFS with pre-loaded neighbor map."""
        if not seeds:
            return 0

        neighbor_map = self._get_neighbor_map()
        visited = set(seeds)
        queue = deque(seeds)

        while queue:
            node = queue.popleft()
            for nb in neighbor_map.get(node, set()):
                if nb not in visited:
                    visited.add(nb)
                    queue.append(nb)

        return len(visited)

    def find_optimal_k(self, k: int):
        """Greedy selection with delta-tracking."""
        node_ids = self._get_node_ids()
        max_k = len(node_ids)

        if k < 1 or k > max_k:
            raise InvalidKValueError(
                f"Invalid k value: k must be between 1 and {max_k}",
                details={"k": k, "max_k": max_k},
            )

        neighbor_map = self._get_neighbor_map()

        # Pre-compute individual spreads
        node_spread = {nid: len(neighbor_map.get(nid, set())) + 1 for nid in node_ids}

        # Start with highest-degree node
        sorted_by_degree = sorted(node_spread.items(), key=lambda x: x[1], reverse=True)

        selected = set()
        seeds = []
        marginal_gains = []

        best_first = sorted_by_degree[0][0]
        selected.add(best_first)
        seeds.append(best_first)
        marginal_gains.append(node_spread[best_first])

        current_reachable = set(selected)
        for node in neighbor_map.get(best_first, set()):
            current_reachable.add(node)

        for _ in range(k - 1):
            best_id = None
            best_gain = -1
            best_new_reachable = None

            candidates = [n for n in node_ids if n not in selected]

            for node_id in candidates:
                if node_spread[node_id] <= best_gain:
                    continue

                new_nodes = set()
                for nb in neighbor_map.get(node_id, set()):
                    if nb not in current_reachable:
                        new_nodes.add(nb)
                if node_id not in current_reachable:
                    new_nodes.add(node_id)

                gain = len(new_nodes)

                if gain > best_gain:
                    best_gain = gain
                    best_id = node_id
                    best_new_reachable = new_nodes

            if best_id is None:
                break

            selected.add(best_id)
            seeds.append(best_id)
            marginal_gains.append(best_gain)
            current_reachable.update(best_new_reachable)

        return seeds, marginal_gains

    def find_degree_k(self, k: int):
        """Batch degree fetch + incremental BFS."""
        node_ids = self._get_node_ids()
        degrees = self.repository.degree_batch(node_ids, self.graph_id)

        ordered = sorted(degrees.items(), key=lambda x: x[1], reverse=True)
        seeds = [node_id for node_id, _ in ordered[:k]]

        gains = []
        selected = set()
        current_reachable = set()
        neighbor_map = self._get_neighbor_map()

        for seed in seeds:
            before = len(current_reachable)
            selected.add(seed)

            if seed not in current_reachable:
                current_reachable.add(seed)

            queue = deque([seed])
            visited_local = {seed}

            while queue:
                node = queue.popleft()
                for nb in neighbor_map.get(node, set()):
                    if nb not in visited_local:
                        visited_local.add(nb)
                        if nb not in current_reachable:
                            current_reachable.add(nb)
                        queue.append(nb)

            gains.append(len(current_reachable) - before)

        return seeds, gains

    def find_random_k(self, k: int):
        """Random baseline."""
        node_ids = self._get_node_ids()
        random.shuffle(node_ids)
        seeds = node_ids[:k]

        gains = []
        selected = set()

        for seed in seeds:
            before = len(selected)
            selected.add(seed)
            spread = self.bfs_spread(selected)
            gains.append(spread - before)

        return seeds, gains

    def _get_node_ids(self):
        """Cached node ID list."""
        if self._node_ids is None:
            nodes = self.repository.get_nodes(self.graph_id)
            self._node_ids = [n.id for n in nodes]
        return self._node_ids

    def run(self, k: int, method: str = "optimal"):
        logger.info(
            "Running influence maximization.",
            extra={"extra_data": {"graph_id": self.graph_id, "k": k, "method": method}},
        )

        start = perf_counter()

        if method == "degree":
            seeds, gains = self.find_degree_k(k)
        elif method == "random":
            seeds, gains = self.find_random_k(k)
        else:
            seeds, gains = self.find_optimal_k(k)

        total_spread = self.bfs_spread(set(seeds))
        simulation_seed_store.set_seeds(self.graph_id, seeds)

        elapsed = (perf_counter() - start) * 1000

        logger.info("Influence maximization completed.")

        return {
            "seeds": seeds,
            "marginalGains": gains,
            "totalSpread": total_spread,
            "executionTimeMs": round(elapsed, 2),
        }

    def clear_cache(self):
        """Clear cached neighbor map (call after graph changes)."""
        self._neighbor_cache = None
        self._node_ids = None