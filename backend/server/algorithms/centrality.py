import math
from collections import deque
from typing import Dict, Set, List, Tuple
from schemas.analytics import CentralityScores
from storage_engine.repository import GraphRepository
import numpy as np
from logger_config import get_logger
from core.exceptions import (
    CentralityError,
    MetricCalculationError,
)

# ═══════════════════════════════════════════
# Zig Bridge - High-Performance Computing
# ═══════════════════════════════════════════
from tribecore import CentralityBridge

logger = get_logger(__name__)


class CentralityAnalyzer:

    def __init__(
            self,
            repository: GraphRepository,
            graph_id: str | None = None,
    ):

        self.repository = repository
        self.graph_id = graph_id

        self.nodes = (
            repository
            .registry
            .get_all_nodes(
                graph_id
            )
        )

        self.n = len(
            self.nodes
        )

        # Build lookup tables for fast node/index conversions.

        self.node_to_idx = {
            node: i
            for i, node
            in enumerate(
                self.nodes
            )
        }

        self.idx_to_node = {
            i: node
            for i, node
            in enumerate(
                self.nodes
            )
        }

        self._cache = {}

        self._neighbor_cache = None

        self.small_network_threshold = 100
        self.large_network_threshold = 1000

        self.base_weights = {
            'degree': 0.15,
            'betweenness': 0.35,
            'closeness': 0.20,
            'eigenvector': 0.20,
            'pagerank': 0.10,
            'harmonic': 0.00,
        }

        self.use_geometric_mean = True

        # ─── Initialize Zig compute bridge ───
        self._zig = CentralityBridge()

    def _neighbors(
            self,
            node_id: str,
    ) -> Set[str]:

        # Reuse the cached neighbor map to avoid repeated repository lookups.

        graph = self._get_neighbor_map()

        return graph.get(
            node_id,
            set(),
        )

    def _get_neighbor_map(
            self,
    ) -> Dict[str, Set[str]]:

        if self._neighbor_cache is not None:
            return self._neighbor_cache

        # Load all neighbor relationships in a single batch.

        result = (
            self.repository
            .neighbors_batch(
                self.nodes,
                self.graph_id,
            )
        )

        self._neighbor_cache = {
            node_id: set(neighbors)
            for node_id, neighbors
            in result.items()
        }

        return self._neighbor_cache

    # ─── Helper: convert numpy array result to node-keyed dict ───
    def _scores_to_dict(self, scores_array: np.ndarray) -> Dict[str, float]:
        """Convert Zig output array to {node_id: score} mapping."""
        return {
            self.idx_to_node[i]: float(scores_array[i])
            for i in range(len(scores_array))
        }

    # ─── Helper: normalize dict scores to [0, 1] ───
    @staticmethod
    def _normalize_dict(scores: Dict[str, float]) -> Dict[str, float]:
        max_val = max(scores.values()) if scores else 1.0
        if max_val > 0:
            return {k: v / max_val for k, v in scores.items()}
        return scores

    # Adjust metric weights based on the network size.

    def _get_dynamic_weights(self) -> Dict[str, float]:

        weights = self.base_weights.copy()

        if self.n < self.small_network_threshold:

            weights['betweenness'] = 0.45
            weights['degree'] = 0.10
            weights['closeness'] = 0.15
            weights['eigenvector'] = 0.15
            weights['pagerank'] = 0.10
            weights['harmonic'] = 0.05

        elif self.n > self.large_network_threshold:

            weights['betweenness'] = 0.20
            weights['degree'] = 0.10
            weights['closeness'] = 0.15
            weights['eigenvector'] = 0.30
            weights['pagerank'] = 0.20
            weights['harmonic'] = 0.05
        else:
            weights['harmonic'] = 0.00

        total = sum(weights.values())
        if total != 1.0:
            weights = {k: v / total for k, v in weights.items()}

        return weights

    # ========== 1. Degree Centrality ==========
    def compute_degree_centrality(
            self,
    ):

        if self.n <= 1:
            return {
                node: 0.0
                for node in self.nodes
            }

        degrees = {}

        max_deg = 1

        for node in self.nodes:
            degree = (
                self.repository
                .degree(
                    node,
                    self.graph_id,
                )
            )

            degrees[node] = degree

            max_deg = max(
                max_deg,
                degree,
            )

        return {
            node:
                degree / max_deg
            for node, degree
            in degrees.items()
        }

    # ========== 2. Betweenness Centrality (Brandes Algorithm) ==========
    # ⚡ Still in Python - BFS traversal requires Python-level graph access.
    #    Future: Can be migrated to Zig with full adjacency matrix.
    def compute_betweenness_centrality(self) -> Dict[str, float]:
        try:
            cache_key = "betweenness"
            if cache_key in self._cache:
                return self._cache[cache_key]

            betweenness = {node: 0.0 for node in self.nodes}

            for s in self.nodes:
                stack = []
                pred = {node: [] for node in self.nodes}
                sigma = {node: 0 for node in self.nodes}
                dist = {node: -1 for node in self.nodes}

                sigma[s] = 1
                dist[s] = 0
                queue = deque([s])

                while queue:
                    v = queue.popleft()
                    stack.append(v)

                    for w in self._neighbors(v):
                        if dist[w] < 0:
                            dist[w] = dist[v] + 1
                            queue.append(w)

                        if dist[w] == dist[v] + 1:
                            sigma[w] += sigma[v]
                            pred[w].append(v)

                delta = {node: 0.0 for node in self.nodes}

                while stack:
                    w = stack.pop()
                    for v in pred[w]:
                        if sigma[w] > 0:
                            delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])

                    if w != s:
                        betweenness[w] += delta[w]

            if self.n > 2:
                norm_factor = 1.0 / ((self.n - 1) * (self.n - 2))
                for node in betweenness:
                    betweenness[node] *= norm_factor

            self._cache[cache_key] = betweenness
            return betweenness

        except Exception as e:
            logger.exception(
                "Betweenness centrality failed"
            )

            raise MetricCalculationError(
                "Failed to compute betweenness.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    # ========== 3. Closeness Centrality (Zig-accelerated) ==========
    def compute_closeness_centrality(self) -> Dict[str, float]:
        try:
            cache_key = "closeness"
            if cache_key in self._cache:
                return self._cache[cache_key]

            if self.n == 0:
                return {}

            # ⚡ Offload BFS-based closeness computation to Zig
            neighbor_map = self._get_neighbor_map()
            scores_array = self._zig.closeness(
                self.node_to_idx,
                neighbor_map
            )

            closeness = self._scores_to_dict(scores_array)

            # Additional normalization (Zig already normalizes, but keeping max-val safeguard)
            closeness = self._normalize_dict(closeness)

            self._cache[cache_key] = closeness
            return closeness

        except Exception as e:
            logger.exception(
                "Closeness centrality failed"
            )

            raise MetricCalculationError(
                "Failed to compute closeness.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    # ========== 4. Harmonic Centrality (Zig-accelerated) ==========
    def compute_harmonic_centrality(self) -> Dict[str, float]:
        try:
            cache_key = "harmonic"
            if cache_key in self._cache:
                return self._cache[cache_key]

            if self.n == 0:
                return {}

            # ⚡ Offload harmonic centrality to Zig
            neighbor_map = self._get_neighbor_map()
            scores_array = self._zig.harmonic(
                self.node_to_idx,
                neighbor_map
            )

            harmonic = self._scores_to_dict(scores_array)
            harmonic = self._normalize_dict(harmonic)

            self._cache[cache_key] = harmonic
            return harmonic

        except Exception as e:
            logger.exception(
                "Harmonic centrality failed"
            )

            raise MetricCalculationError(
                "Failed to compute harmonic.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    # ========== 5. Eigenvector Centrality (Zig-accelerated) ==========
    def compute_eigenvector_centrality(
            self,
            iterations: int = 100,
            tol: float = 1e-6,
    ) -> Dict[str, float]:
        try:
            cache_key = "eigenvector"

            if cache_key in self._cache:
                return self._cache[cache_key]

            if self.n == 0:
                return {}

            # ⚡ Offload power iteration to Zig
            neighbor_map = self._get_neighbor_map()
            scores_array = self._zig.eigenvector(
                self.node_to_idx,
                neighbor_map,
                max_iter=iterations,
                tolerance=tol
            )

            centrality = self._scores_to_dict(scores_array)
            centrality = self._normalize_dict(centrality)

            self._cache[cache_key] = centrality
            return centrality

        except Exception as e:
            logger.exception(
                "Eigenvector centrality failed"
            )

            raise MetricCalculationError(
                "Failed to compute eigenvector.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    # ========== 6. PageRank (Zig-accelerated) ==========
    def compute_pagerank(
            self,
            damping: float = 0.85,
            iterations: int = 100
    ) -> Dict[str, float]:
        try:
            cache_key = "pagerank"
            if cache_key in self._cache:
                return self._cache[cache_key]

            if self.n == 0:
                return {}

            # ⚡ Offload PageRank to Zig
            neighbor_map = self._get_neighbor_map()
            scores_array = self._zig.pagerank(
                self.node_to_idx,
                neighbor_map,
                damping=damping,
                max_iter=iterations,
                tolerance=1e-8
            )

            pr = self._scores_to_dict(scores_array)
            pr = self._normalize_dict(pr)

            self._cache[cache_key] = pr
            return pr

        except Exception as e:
            logger.exception(
                "Pagerank centrality failed"
            )

            raise MetricCalculationError(
                "Failed to compute pagerank.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    # ========== 7. Geometric Mean Combination ==========
    def _geometric_mean(self, scores: List[float], weights: List[float]) -> float:

        if not scores or not weights:
            return 0.0

        valid_scores = []
        valid_weights = []
        for s, w in zip(scores, weights):
            if s > 1e-6:
                valid_scores.append(s)
                valid_weights.append(w)

        if not valid_scores:
            return 0.0

        log_sum = 0.0
        total_weight = sum(valid_weights)

        for s, w in zip(valid_scores, valid_weights):
            log_sum += w * math.log(s)

        return math.exp(log_sum / total_weight) if total_weight > 0 else 0.0

    def _linear_mean(self, scores: List[float], weights: List[float]) -> float:
        if not scores:
            return 0.0
        total_weight = sum(weights)
        if total_weight == 0:
            return 0.0
        return sum(s * w for s, w in zip(scores, weights)) / total_weight

    # ========== 8. Role Detection ==========
    def _assign_roles(
            self,
            degree: Dict[str, float],
            betweenness: Dict[str, float],
            closeness: Dict[str, float],
            eigenvector: Dict[str, float],
            pagerank: Dict[str, float],
    ) -> Dict[str, str]:

        roles = {}

        nodes = self.nodes

        if not nodes:
            return roles

        # -----------------------------
        # Raw Degree
        # -----------------------------

        raw_degree = {
            node: self.repository.degree(
                node,
                self.graph_id,
            )
            for node in nodes
        }

        degree_values = np.array(
            list(raw_degree.values())
        )

        # -----------------------------
        # Thresholds
        # -----------------------------

        bridge_threshold = np.percentile(
            np.array(
                [
                    betweenness[n]
                    for n in nodes
                ]
            ),
            95,
        )

        influencer_values = np.array(
            [
                0.4 * eigenvector[n]
                + 0.4 * pagerank[n]
                + 0.2 * closeness[n]
                for n in nodes
            ]
        )

        influencer_threshold = np.percentile(
            influencer_values,
            90,
        )

        hub_threshold = max(
            5,
            np.percentile(
                degree_values,
                90,
            )
        )

        # -----------------------------
        # Role Assignment
        # -----------------------------

        for node in nodes:

            real_degree = raw_degree[node]

            bridge_score = betweenness[node]

            influencer_score = (
                    0.4 * eigenvector[node]
                    + 0.4 * pagerank[node]
                    + 0.2 * closeness[node]
            )

            # --------------------------------
            # Isolated
            # --------------------------------

            if real_degree == 0:
                roles[node] = "isolated"

            # --------------------------------
            # Bridge
            # --------------------------------

            elif (
                    bridge_score >= bridge_threshold
                    and
                    bridge_score > 0
            ):
                roles[node] = "bridge"

            # --------------------------------
            # Influencer
            # --------------------------------

            elif (
                    influencer_score
                    >= influencer_threshold
            ):
                roles[node] = "influencer"

            # --------------------------------
            # Hub
            # --------------------------------

            elif (
                    real_degree
                    >= hub_threshold
            ):
                roles[node] = "hub"

            # --------------------------------
            # Normal
            # --------------------------------

            else:
                roles[node] = "normal"

        return roles

    # ========== 9. Main Method ==========
    def compute_all_centralities(self, use_geometric_mean: bool = None) -> Dict[str, CentralityScores]:
        try:
            if use_geometric_mean is None:
                self.use_geometric_mean = self.n > 200
            else:
                self.use_geometric_mean = use_geometric_mean

            logger.info(
                "Computing centrality metrics for %d nodes.",
                self.n,
            )

            weights = self._get_dynamic_weights()

            degree = self.compute_degree_centrality()

            betweenness = self.compute_betweenness_centrality()

            closeness = self.compute_closeness_centrality()

            harmonic = self.compute_harmonic_centrality()

            eigenvector = self.compute_eigenvector_centrality()

            pagerank = self.compute_pagerank()

            result = {}

            for node in self.nodes:

                # Combine all centrality metrics into a single overall score.

                scores = [
                    degree[node],
                    betweenness[node],
                    closeness[node],
                    eigenvector[node],
                    pagerank[node],
                    harmonic[node]
                ]
                weight_list = [
                    weights['degree'],
                    weights['betweenness'],
                    weights['closeness'],
                    weights['eigenvector'],
                    weights['pagerank'],
                    weights.get('harmonic', 0.0)
                ]

                if self.use_geometric_mean:
                    overall = self._geometric_mean(scores, weight_list)
                else:
                    overall = self._linear_mean(scores, weight_list)

                overall = max(0.0, min(1.0, overall))

                # Classify each node based on its centrality profile.

                roles = self._assign_roles(
                    degree,
                    betweenness,
                    closeness,
                    eigenvector,
                    pagerank,
                )

                result[node] = CentralityScores(
                    degree=round(degree[node], 4),
                    betweenness=round(betweenness[node], 4),
                    closeness=round(closeness[node], 4),
                    eigenvector=round(eigenvector[node], 4),
                    pagerank=round(pagerank[node], 4),
                    harmonic=round(harmonic[node], 4),
                    overall=round(overall, 4),
                    role=roles[node]
                )

            logger.info(
                "Centrality computation completed."
            )

            return result

        except Exception as e:
            logger.exception(
                "Centrality computation failed"
            )

            raise CentralityError(
                "Failed to compute centralities.",
                graph_id=self.graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    def get_top_influencers(self, k: int = 10) -> List[Tuple[str, float]]:

        results = self.compute_all_centralities()
        sorted_users = sorted(results.items(), key=lambda x: x[1].overall, reverse=True)
        return [(user, data.overall) for user, data in sorted_users[:k]]

    def get_top_bridges(self, k: int = 10) -> List[Tuple[str, float]]:

        betweenness = self.compute_betweenness_centrality()
        sorted_users = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)
        return [(user, score) for user, score in sorted_users[:k]]

    def clear_cache(self):
        self._cache.clear()

    def get_stats(self) -> Dict:
        return {
            'total_users': self.n,
            'total_edges': len(
                self.repository
                .registry
                .get_all_edges(
                    self.graph_id
                )
            ),
            'use_geometric_mean': self.use_geometric_mean,
            'network_size_category': 'small' if self.n < self.small_network_threshold
            else 'large' if self.n > self.large_network_threshold
            else 'medium',
            'dynamic_weights': self._get_dynamic_weights(),
            'cache_size': len(self._cache)
        }