import math
import numpy as np
from datetime import datetime
from typing import Dict
from storage_engine.repository import GraphRepository
from schemas.analytics import EdgeWeightResult
from logger_config import get_logger
from core.exceptions import EdgeWeightCalculationError

logger = get_logger(__name__)


class ProfessionalEdgeWeightCalculator:

    def __init__(
            self,
            repository: GraphRepository,
            graph_id: str | None = None,
            metadata=None,
            friendship_dates=None,
            interaction_data=None,
    ):
        self.repository = repository
        self.graph_id = graph_id
        self.metadata = metadata or {}
        self.friendship_dates = friendship_dates or {}
        self.interaction_data = interaction_data or {}
        self._cache = {}

        self.edge_map = self._build_edge_map()

        self.weights = {
            "interaction": 0.20,
            "profile": 0.15,
            "longevity": 0.20,
            "structural": 0.15,
            "clustering": 0.15,
            "triangle": 0.10,
            "reciprocity": 0.05,
        }

        self.longevity_half_life_days = 730

        # Preload graph data in one batch for structural metrics only
        self._node_ids: list[str] = []
        self._neighbor_map: Dict[str, set] = {}
        self.centralities: Dict[str, float] = {}

        self._preload_graph_data()

    def _preload_graph_data(self):
        """Preload neighbors and degree-based centralities in one batch."""
        self._node_ids = self.repository.registry.get_all_nodes(self.graph_id)
        if not self._node_ids:
            return

        # Batch: all neighbors (for structural + triangle + centralities)
        neighbors_batch = self.repository.neighbors_batch(self._node_ids, self.graph_id)
        self._neighbor_map = {nid: set(neighs) for nid, neighs in neighbors_batch.items()}

        # Batch: degree-based centralities
        degrees = self.repository.degree_batch(self._node_ids, self.graph_id)
        max_deg = max(degrees.values()) if degrees else 1
        self.centralities = {
            nid: (degrees.get(nid, 0) / max_deg if max_deg > 0 else 0.0)
            for nid in self._node_ids
        }

    def _precompute_centralities(self) -> Dict[str, float]:
        return self.centralities

    # ========== 1. Interaction Strength ==========
    def _compute_interaction_strength(self, u: str, v: str) -> float:
        cache_key = f"interact:{u}:{v}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Use repository method for accurate common neighbor count
        common_count = self.repository.count_common_neighbors(u, v, self.graph_id)
        result = math.tanh(common_count / 10.0)
        self._cache[cache_key] = result
        return result

    # ========== 2. Profile Similarity ==========
    def _compute_profile_similarity(self, u: str, v: str) -> float:
        return 0.0

    # ========== 3. Longevity Bonus ==========
    def _compute_longevity_bonus(self, u: str, v: str) -> float:
        edge_id = self._get_edge_id(u, v)
        if edge_id is None:
            return 0.5

        friendship_date = self.friendship_dates.get(edge_id)
        if not friendship_date:
            return 0.5

        days_ago = (datetime.now() - friendship_date).days
        return 1 - math.exp(-days_ago / self.longevity_half_life_days)

    # ========== 4. Structural Importance ==========
    def _compute_structural_importance(self, u: str, v: str) -> float:
        cent_u = self.centralities.get(u, 0.0)
        cent_v = self.centralities.get(v, 0.0)
        if cent_u <= 0 or cent_v <= 0:
            return 0.0
        return math.sqrt(cent_u * cent_v)

    # ========== 5. Clustering Coefficient ==========
    def _compute_clustering_coefficient(self, u: str, v: str) -> float:
        cache_key = f"cluster:{u}:{v}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        common = self.repository.common_neighbors(u, v, self.graph_id)

        if len(common) < 2:
            self._cache[cache_key] = 0.0
            return 0.0

        edges_count = 0
        common_list = list(common)

        for i in range(len(common_list)):
            for j in range(i + 1, len(common_list)):
                if self.repository.has_edge(common_list[i], common_list[j], self.graph_id):
                    edges_count += 1

        max_possible = len(common) * (len(common) - 1) / 2
        result = edges_count / max_possible if max_possible > 0 else 0.0
        self._cache[cache_key] = result
        return result

    # ========== 6. Triangle Participation ==========
    def _compute_triangle_participation(self, u: str, v: str) -> float:
        # Use preloaded neighbor sets for fast set intersection
        neigh_u = self._neighbor_map.get(u, set())
        neigh_v = self._neighbor_map.get(v, set())
        return 1.0 if neigh_u & neigh_v else 0.3

    # ========== 7. Reciprocity ==========
    def _compute_reciprocity_score(self, u: str, v: str) -> float:
        edge_id = self._get_edge_id(u, v)
        if edge_id is None:
            return 1.0
        if edge_id in self.interaction_data:
            u_to_v, v_to_u = self.interaction_data[edge_id]
            if max(u_to_v, v_to_u) > 0:
                return min(u_to_v, v_to_u) / max(u_to_v, v_to_u)
        return 1.0

    # ========== Main Method ==========
    def compute_edge_weight(self, source: str, target: str) -> EdgeWeightResult:
        try:
            edge_id = self._get_edge_id(source, target) or ""

            interaction = self._compute_interaction_strength(source, target)
            profile = self._compute_profile_similarity(source, target)
            longevity = self._compute_longevity_bonus(source, target)
            structural = self._compute_structural_importance(source, target)
            clustering = self._compute_clustering_coefficient(source, target)
            triangle = self._compute_triangle_participation(source, target)
            reciprocity = self._compute_reciprocity_score(source, target)

            raw_score = (
                self.weights['interaction'] * interaction +
                self.weights['profile'] * profile +
                self.weights['longevity'] * longevity +
                self.weights['structural'] * structural +
                self.weights['clustering'] * clustering +
                self.weights['triangle'] * triangle +
                self.weights['reciprocity'] * reciprocity
            )

            raw_score = max(0.0, min(1.0, raw_score))
            weight = int(round(raw_score * 100))

            return EdgeWeightResult(
                edge_id=edge_id,
                source=source,
                target=target,
                raw_score=raw_score,
                weight=weight,
                components={
                    'interaction': round(interaction, 3),
                    'profile': round(profile, 3),
                    'longevity': round(longevity, 3),
                    'structural': round(structural, 3),
                    'clustering': round(clustering, 3),
                    'triangle': round(triangle, 3),
                    'reciprocity': round(reciprocity, 3),
                },
            )

        except Exception as e:
            logger.exception("Edge weight calculation failed")
            raise EdgeWeightCalculationError(
                "Failed to compute edge weight.",
                graph_id=self.graph_id,
                details={"source": source, "target": target, "reason": str(e)},
            ) from e

    def compute_all_edge_weights(self) -> Dict:
        logger.info("Computing edge weights")
        edges = self.repository.get_edges(self.graph_id)
        return {
            (edge.source, edge.target) if edge.source <= edge.target else (edge.target, edge.source):
            self.compute_edge_weight(edge.source, edge.target)
            for edge in edges
        }

    def get_edge_statistics(self) -> Dict:
        results = self.compute_all_edge_weights()
        weights = np.array([r.weight for r in results.values()], dtype=np.float64)

        if len(weights) == 0:
            return {'total_edges': 0}

        return {
            'total_edges': len(weights),
            'min_weight': int(np.min(weights)),
            'max_weight': int(np.max(weights)),
            'avg_weight': round(float(np.mean(weights)), 2),
            'median_weight': round(float(np.median(weights)), 2),
            'weight_distribution': {
                'very_weak (0-20)': int(np.sum(weights <= 20)),
                'weak (21-40)': int(np.sum((weights >= 21) & (weights <= 40))),
                'medium (41-60)': int(np.sum((weights >= 41) & (weights <= 60))),
                'strong (61-80)': int(np.sum((weights >= 61) & (weights <= 80))),
                'very_strong (81-100)': int(np.sum(weights >= 81)),
            },
        }

    def apply_weights(self):
        logger.info("Applying edge weights")
        results = self.compute_all_edge_weights()
        edges = self.repository.get_edges(self.graph_id)

        for edge in edges:
            key = (edge.source, edge.target) if edge.source <= edge.target else (edge.target, edge.source)
            result = results.get(key)
            if result is not None:
                edge.data.Weight = result.weight
                self.repository.update_edge(edge)

        logger.info("Edge weights applied")

    def _build_edge_map(self) -> dict[tuple[str, str], str]:
        edges = self.repository.get_edges(self.graph_id)
        return {
            (e.source, e.target) if e.source <= e.target else (e.target, e.source): e.id
            for e in edges
        }

    def _get_edge_id(self, u: str, v: str) -> str | None:
        return self.edge_map.get((u, v) if u <= v else (v, u))

    def clear_cache(self):
        self._cache.clear()
        self._neighbor_map.clear()
        self._node_ids.clear()