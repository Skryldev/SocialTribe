from dataclasses import dataclass
from algorithms.leiden_community_detector import LeidenCommunityDetector
import numpy as np
from collections import deque
import time
import statistics
from logger_config import get_logger

logger = get_logger(__name__)

@dataclass(slots=True)
class StabilityMetrics:
    overall_stability: float
    avg_within_consensus: float
    avg_between_consensus: float

@dataclass(slots=True)
class EnsembleResult:
    final_communities: list[list[str]]
    stability_metrics: StabilityMetrics
    modularity_history: list[float]
    num_runs: int
    consensus_matrix: list[list[float]]

class EnsembleCommunityDetector:

    def __init__(
            self,
            repository,
            graph_id=None,
    ):
        self.repository = repository
        self.graph_id = graph_id

    def _generate_resolution_spectrum(
            self,
            base_resolution: float,
            num_runs: int,
    ) -> list[float]:

        if num_runs <= 1:
            return [base_resolution]

        min_res = max(0.5, base_resolution - 0.2)
        max_res = min(2.0, base_resolution + 0.2)

        resolutions = []

        for i in range(num_runs):
            t = i / (num_runs - 1)
            r = min_res + (max_res - min_res) * t
            resolutions.append(round(r, 2))

        return resolutions

    def _run_ensemble(
            self,
            resolution: float,
            ensemble_runs: int,
    ):

        resolutions = [resolution] * ensemble_runs
        partitions = []
        modularity_history = []

        for res in resolutions:
            detector = LeidenCommunityDetector(
                repository=self.repository,
                graph_id=self.graph_id,
            )

            result = detector.detect(resolution=res)

            communities = [
                c["members"]
                for c in result["communities"]
            ]

            partitions.append(communities)
            modularity_history.append(result["modularity"])

        return partitions, modularity_history, resolutions

    def _build_node_index(self):

        node_ids = self.repository.get_node_ids(self.graph_id)

        node_to_idx = {n: i for i, n in enumerate(node_ids)}
        idx_to_node = {i: n for n, i in node_to_idx.items()}

        return node_ids, node_to_idx, idx_to_node

    # Weight each partition according to its modularity score.

    def _quality_weights(self, modularities: list[float]):

        if not modularities:
            return []

        minimum = min(modularities)
        shifted = [q - minimum + 0.1 for q in modularities]
        total = sum(shifted)

        if total == 0:
            return [1.0 / len(modularities)] * len(modularities)

        return [w / total for w in shifted]

    def _build_consensus_matrix(
            self,
            partitions: list[list[list[str]]],
            modularities: list[float],
            node_to_idx: dict[str, int],
    ):
        """⚡ Optimized: vectorized co-occurrence accumulation."""
        n = len(node_to_idx)
        matrix = np.zeros((n, n), dtype=np.float64)
        weights = self._quality_weights(modularities)

        for run_idx, communities in enumerate(partitions):
            weight = weights[run_idx]

            for community in communities:
                if len(community) <= 1:
                    continue

                indices = np.array(
                    [node_to_idx[n] for n in community],
                    dtype=np.int32,
                )

                # ─── Vectorized co-occurrence: block += weight ───
                if len(indices) > 0:
                    for idx_i in range(len(indices)):
                        i = indices[idx_i]
                        # Row slice: from diagonal to end
                        matrix[i, indices[idx_i:]] += weight

                        # Symmetric (lower triangle) - exclude diagonal
                        if idx_i < len(indices) - 1:
                            matrix[indices[idx_i + 1:], i] += weight

        return matrix

    def _extract_communities(
            self,
            matrix: np.ndarray,
            idx_to_node: dict[int, str],
            threshold: float,
    ) -> list[list[str]]:
        """⚡ Optimized: BFS using numpy adjacency for faster neighbor lookup."""
        n = len(matrix)

        # Pre-compute binary adjacency at threshold
        adj_mask = matrix >= threshold
        np.fill_diagonal(adj_mask, False)

        visited = np.zeros(n, dtype=bool)
        communities = []

        for start in range(n):
            if visited[start]:
                continue

            # BFS with numpy vectorization for neighbor discovery
            queue = deque([start])
            visited[start] = True
            component = []

            while queue:
                node = queue.popleft()
                component.append(idx_to_node[node])

                # ⚡ Vectorized: get all unvisited neighbors above threshold
                neighbors = np.where(adj_mask[node] & ~visited)[0]

                if len(neighbors) > 0:
                    visited[neighbors] = True
                    queue.extend(neighbors.tolist())

            communities.append(component)

        communities.sort(key=len, reverse=True)
        return communities

    def _overall_stability(self, matrix: np.ndarray) -> float:
        """⚡ Optimized: vectorized upper triangle mean."""
        n = len(matrix)
        if n <= 1:
            return 1.0

        # Get upper triangle values (excluding diagonal)
        triu_indices = np.triu_indices(n, k=1)
        upper_values = matrix[triu_indices]

        if len(upper_values) == 0:
            return 0.0

        return float(np.mean(upper_values))

    def _avg_within_consensus(
            self,
            matrix: np.ndarray,
            communities: list[list[str]],
            node_to_idx: dict[str, int],
    ) -> float:
        """⚡ Optimized: numpy slicing for intra-community edges."""
        values = []

        for community in communities:
            if len(community) <= 1:
                continue

            indices = np.array(
                [node_to_idx[n] for n in community],
                dtype=np.int32,
            )

            # Extract submatrix for this community (upper triangle only)
            submatrix = matrix[np.ix_(indices, indices)]
            triu_indices = np.triu_indices(len(indices), k=1)
            intra_values = submatrix[triu_indices]

            if len(intra_values) > 0:
                values.extend(intra_values.tolist())

        if not values:
            return 0.0

        return float(np.mean(values))

    def _avg_between_consensus(
            self,
            matrix: np.ndarray,
            communities: list[list[str]],
            node_to_idx: dict[str, int],
    ) -> float:
        """⚡ Optimized: numpy slicing for inter-community edges."""
        values = []

        for c1 in range(len(communities)):
            indices1 = np.array(
                [node_to_idx[n] for n in communities[c1]],
                dtype=np.int32,
            )

            for c2 in range(c1 + 1, len(communities)):
                indices2 = np.array(
                    [node_to_idx[n] for n in communities[c2]],
                    dtype=np.int32,
                )

                # Extract cross-community submatrix
                cross_values = matrix[np.ix_(indices1, indices2)]

                if cross_values.size > 0:
                    values.extend(cross_values.flatten().tolist())

        if not values:
            return 0.0

        return float(np.mean(values))

    def _stability_metrics(
            self,
            matrix: np.ndarray,
            communities: list[list[str]],
            node_to_idx: dict[str, int],
    ):

        return {
            "overallStability": self._overall_stability(matrix),
            "avgWithinConsensus": self._avg_within_consensus(
                matrix, communities, node_to_idx,
            ),
            "avgBetweenConsensus": self._avg_between_consensus(
                matrix, communities, node_to_idx,
            ),
        }

    def detect(
            self,
            resolution: float = 1.0,
            ensemble_runs: int = 16,
            consensus_threshold: float = 0.5,
    ):

        logger.info("Starting ensemble community detection.")

        start = time.perf_counter()

        node_ids, node_to_idx, idx_to_node = self._build_node_index()

        partitions, modularity_history, resolutions = self._run_ensemble(
            resolution, ensemble_runs,
        )

        # Build the consensus matrix from all ensemble partitions.
        matrix = self._build_consensus_matrix(
            partitions, modularity_history, node_to_idx,
        )

        final_communities = self._extract_communities(
            matrix, idx_to_node, consensus_threshold,
        )

        # Measure the stability of the consensus solution.
        stability = self._stability_metrics(
            matrix, final_communities, node_to_idx,
        )

        sizes = [len(c) for c in final_communities]

        execution_ms = (time.perf_counter() - start) * 1000

        logger.info(
            "Ensemble community detection completed in %.2f ms.",
            execution_ms,
        )

        return {
            "success": True,
            "data": {
                "finalCommunities": [
                    {"members": c, "size": len(c)}
                    for c in final_communities
                ],
                "stabilityMetrics": stability,
                "modularityHistory": modularity_history,
                "bestModularity": max(modularity_history, default=0.0),
                "avgModularity": statistics.mean(modularity_history)
                if modularity_history
                else 0.0,
                "largestCommunitySize": max(sizes, default=0),
                "smallestCommunitySize": min(sizes, default=0),
                "avgCommunitySize": statistics.mean(sizes) if sizes else 0.0,
                "communitySizeDistribution": sorted(sizes, reverse=True),
                "numFinalCommunities": len(final_communities),
                "numRuns": len(modularity_history),
                "resolution": resolution,
                "ensembleRuns": ensemble_runs,
                "consensusThreshold": consensus_threshold,
                "executionTimeMs": round(execution_ms, 2),
            },
        }