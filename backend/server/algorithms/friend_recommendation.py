from storage_engine.repository import GraphRepository
from typing import Dict
import numpy as np
from logger_config import get_logger
from core.exceptions import (
    UserNotFoundError,
    InvalidUserDataError,
    NormalizationError,
    FriendRecommendationError,
)

logger = get_logger(__name__)


class LinkPredictor:

    def __init__(
            self,
            repository: GraphRepository,
            graph_id: str | None = None,
    ):
        self.repository = repository
        self.graph_id = graph_id
        self._cache = {}

        self.weights = {
            'normalized_common': 0.3,
            'adamic_adar': 0.3,
            'resource_allocation': 0.2,
            'distance_bonus': 0.2,
        }

        self.normalization_config = {
            'method': 'zscore',
            'zscore_threshold': 0.5,
            'min_score': 0.0,
            'max_score': 1.0,
        }

    # Build a unique cache key for a pairwise similarity metric.

    def _cache_key(self, prefix: str, u: str, v: str):
        gid = self.repository._graph_id(self.graph_id)
        return f"{gid}:{prefix}:{u}:{v}"

    def set_weights(
            self,
            normalized_common: float,
            adamic_adar: float,
            resource_allocation: float,
            distance_bonus: float,
    ):
        total = normalized_common + adamic_adar + resource_allocation + distance_bonus
        if abs(total - 1.0) > 0.01:
            raise FriendRecommendationError("Weights must sum to 1.")
        self.weights['normalized_common'] = normalized_common
        self.weights['adamic_adar'] = adamic_adar
        self.weights['resource_allocation'] = resource_allocation
        self.weights['distance_bonus'] = distance_bonus
        self._cache.clear()

    def set_normalization_method(self, method: str = 'zscore', zscore_threshold: float = 0.5):
        self.normalization_config['method'] = method
        self.normalization_config['zscore_threshold'] = zscore_threshold

    def _get_degree(self, node_id: str) -> int:
        return self.repository.degree(node_id, self.graph_id)

    def _get_common_neighbors(self, u: str, v: str):
        return self.repository.common_neighbors(u, v, self.graph_id)

    # Score candidates based on their normalized number of mutual friends.

    def _normalized_common(self, u: str, v: str):
        cache_key = self._cache_key("nc", u, v)
        if cache_key in self._cache:
            return self._cache[cache_key]

        common = self.repository.count_common_neighbors(u, v, self.graph_id)

        if common == 0:
            self._cache[cache_key] = 0.0
            return 0.0

        du = self.repository.degree(u, self.graph_id)
        dv = self.repository.degree(v, self.graph_id)
        denom = du + dv

        if denom == 0:
            self._cache[cache_key] = 0.0
            return 0.0

        result = common / denom
        self._cache[cache_key] = result
        return result

    # Give higher weight to uncommon shared neighbors.

    def _adamic_adar(self, u: str, v: str):
        cache_key = self._cache_key("aa", u, v)
        if cache_key in self._cache:
            return self._cache[cache_key]

        common = self.repository.common_neighbors(u, v, self.graph_id)

        if not common:
            self._cache[cache_key] = 0.0
            return 0.0

        # ⚡ Vectorized: batch-fetch all degrees, compute in numpy
        degrees = np.array(
            [self.repository.degree(w, self.graph_id) for w in common],
            dtype=np.float64,
        )

        # Only count nodes with degree > 1
        mask = degrees > 1
        if not mask.any():
            self._cache[cache_key] = 0.0
            return 0.0

        score = np.sum(1.0 / np.log(degrees[mask]))
        result = min(1.0, score / 10.0)
        self._cache[cache_key] = result
        return result

    def _resource_allocation(self, u: str, v: str):
        cache_key = self._cache_key("ra", u, v)
        if cache_key in self._cache:
            return self._cache[cache_key]

        common = self.repository.common_neighbors(u, v, self.graph_id)

        if not common:
            self._cache[cache_key] = 0.0
            return 0.0

        # ⚡ Vectorized: batch-fetch degrees, sum reciprocals
        degrees = np.array(
            [self.repository.degree(w, self.graph_id) for w in common],
            dtype=np.float64,
        )

        mask = degrees > 0
        if not mask.any():
            self._cache[cache_key] = 0.0
            return 0.0

        score = np.sum(1.0 / degrees[mask])
        result = min(1.0, score / 5.0)
        self._cache[cache_key] = result
        return result

    # Favor candidates that are already close in the graph.

    def _shortest_path_bonus(self, u: str, v: str):
        cache_key = self._cache_key("sp", u, v)
        if cache_key in self._cache:
            return self._cache[cache_key]

        path = self.repository.shortest_path(u, v, self.graph_id)

        if not path:
            self._cache[cache_key] = 0.0
            return 0.0

        dist = len(path) - 1

        if dist <= 0:
            self._cache[cache_key] = 0.0
            return 0.0

        result = 1.0 / (dist + 1)
        self._cache[cache_key] = result
        return result

    def predict_link_score(self, u: str, v: str) -> float:
        try:
            if u == v:
                return 0.0

            nc = self._normalized_common(u, v)
            aa = self._adamic_adar(u, v)
            ra = self._resource_allocation(u, v)
            dist_bonus = self._shortest_path_bonus(u, v)

            # Combine all link prediction metrics into a single score.
            final_score = (
                self.weights['normalized_common'] * nc +
                self.weights['adamic_adar'] * aa +
                self.weights['resource_allocation'] * ra +
                self.weights['distance_bonus'] * dist_bonus
            )

            return max(0.0, min(1.0, final_score))

        except Exception as e:
            logger.exception("Link prediction failed")
            raise FriendRecommendationError(
                f"Failed to predict link between {u} and {v}.",
                graph_id=self.graph_id,
                details={"source": u, "target": v, "reason": str(e)},
            ) from e

    # ========== NORMALIZATION METHODS ==========

    def _normalize_zscore(self, raw_scores: Dict[str, float]) -> Dict[str, float]:
        """⚡ Vectorized z-score normalization."""
        if not raw_scores:
            return {}

        try:
            users = list(raw_scores.keys())
            scores_array = np.array(list(raw_scores.values()), dtype=np.float64)

            mean = np.mean(scores_array)
            std = np.std(scores_array)

            if std == 0:
                logger.warning("Zero standard deviation in Z-score normalization")
                return {user: 0.0 for user in raw_scores}

            threshold = self.normalization_config['zscore_threshold']

            # ⚡ Vectorized z-score calculation
            z_scores = (scores_array - mean) / std
            max_z = np.max(z_scores) if len(z_scores) > 0 else 1.0

            # ⚡ Vectorized scoring with boolean mask
            mask = z_scores > threshold
            normalized_scores = np.zeros(len(scores_array), dtype=np.float64)
            normalized_scores[mask] = 0.5 + (np.minimum(z_scores[mask], max_z) / max_z) * 0.5

            return {
                user: round(float(score), 4)
                for user, score in zip(users, normalized_scores)
            }

        except Exception as e:
            logger.exception("Z-score normalization failed")
            raise NormalizationError(f"Z-score error: {e}")

    def _normalize_sigmoid(self, raw_scores: Dict[str, float]) -> Dict[str, float]:
        """⚡ Vectorized sigmoid normalization."""
        if not raw_scores:
            return {}

        users = list(raw_scores.keys())
        scores_array = np.array(list(raw_scores.values()), dtype=np.float64)

        median = np.median(scores_array)
        steepness = 10.0

        # ⚡ Vectorized sigmoid: 1 / (1 + exp(-k * (x - median)))
        sigmoid_scores = 1.0 / (1.0 + np.exp(-steepness * (scores_array - median)))

        return {
            user: round(float(score), 4)
            for user, score in zip(users, sigmoid_scores)
        }

    def _normalize_percentile(
            self,
            raw_scores: Dict[str, float],
            percentile: float = 80,
    ) -> Dict[str, float]:
        """⚡ Vectorized percentile-based normalization."""
        if not raw_scores:
            return {}

        users = list(raw_scores.keys())
        scores_array = np.array(list(raw_scores.values()), dtype=np.float64)

        threshold = np.percentile(scores_array, percentile)
        max_score = np.max(scores_array)
        denom = max_score - threshold

        normalized_scores = np.zeros(len(scores_array), dtype=np.float64)
        mask = scores_array >= threshold

        if denom > 0:
            normalized_scores[mask] = 0.6 + ((scores_array[mask] - threshold) / denom) * 0.4
        else:
            normalized_scores[mask] = 1.0

        return {
            user: round(float(score), 4)
            for user, score in zip(users, normalized_scores)
        }

    def _normalize_linear(self, raw_scores: Dict[str, float]) -> Dict[str, float]:
        """⚡ Vectorized min-max normalization."""
        if not raw_scores:
            return {}

        users = list(raw_scores.keys())
        scores_array = np.array(list(raw_scores.values()), dtype=np.float64)

        min_score = np.min(scores_array)
        max_score = np.max(scores_array)

        if max_score == min_score:
            return {user: 0.0 for user in raw_scores}

        # ⚡ Vectorized linear normalization
        normalized_scores = (scores_array - min_score) / (max_score - min_score)

        return {
            user: round(float(score), 4)
            for user, score in zip(users, normalized_scores)
        }

    # Apply the configured normalization strategy.

    def _normalize_scores(self, raw_scores: Dict[str, float]) -> Dict[str, float]:
        method = self.normalization_config['method']

        if method == 'zscore':
            return self._normalize_zscore(raw_scores)
        elif method == 'sigmoid':
            return self._normalize_sigmoid(raw_scores)
        elif method == 'percentile':
            return self._normalize_percentile(raw_scores)
        elif method == 'linear':
            return self._normalize_linear(raw_scores)
        else:
            return self._normalize_zscore(raw_scores)

    # ========== PUBLIC METHODS ==========

    def recommend_friends(
            self,
            user_id: str,
            top_k: int = 10,
            normalize: bool = True,
    ):
        try:
            logger.info("Generating recommendations for %s", user_id)

            if top_k <= 0:
                raise InvalidUserDataError(f"top_k must be positive, got {top_k}")

            if not self.repository.contains_node(user_id, self.graph_id):
                return []

            existing_friends = set(
                self.repository.neighbors(user_id, self.graph_id)
            )

            graph_id = self.repository._graph_id(self.graph_id)
            candidates = self.repository.registry.get_all_nodes(graph_id)

            # Evaluate every eligible candidate before ranking the results.
            raw_scores = {}

            for candidate in candidates:
                if candidate == user_id:
                    continue
                if candidate in existing_friends:
                    continue

                try:
                    score = self.predict_link_score(user_id, candidate)
                    if score > 0.01:
                        raw_scores[candidate] = score
                except Exception as e:
                    logger.warning(f"Skipping {candidate}: {e}")

            if not raw_scores:
                return []

            if normalize:
                scores = self._normalize_scores(raw_scores)
            else:
                scores = raw_scores

            # ⚡ Vectorized filtering + sorting
            scores_array = np.array(list(scores.items()), dtype=object)
            mask = np.array([s[1] for s in scores_array]) > 0.1

            if not mask.any():
                return []

            filtered = scores_array[mask]
            sorted_indices = np.argsort([s[1] for s in filtered])[::-1]
            top_results = filtered[sorted_indices][:top_k]

            return [(str(r[0]), float(r[1])) for r in top_results]

        except Exception as e:
            logger.exception("Recommendation failed")
            raise FriendRecommendationError(
                "Recommendation failed.",
                graph_id=self.graph_id,
                node_id=user_id,
                details={"reason": str(e)},
            ) from e

    def recommend_friends_with_details(
            self,
            user_id: str,
            top_k: int = 10,
    ):
        if not self.repository.contains_node(user_id, self.graph_id):
            raise UserNotFoundError(f"User '{user_id}' not found")

        existing_friends = set(
            self.repository.neighbors(user_id, self.graph_id)
        )

        graph_id = self.repository._graph_id(self.graph_id)
        candidates = self.repository.registry.get_all_nodes(graph_id)

        raw_scores = {}

        for candidate in candidates:
            if candidate == user_id:
                continue
            if candidate in existing_friends:
                continue

            try:
                score = self.predict_link_score(user_id, candidate)
                if score > 0.01:
                    raw_scores[candidate] = score
            except Exception as e:
                logger.warning(f"Skipping {candidate}: {e}")

        if not raw_scores:
            return {"user_id": user_id, "recommendations": []}

        normalized_scores = self._normalize_scores(raw_scores)

        # ⚡ Vectorized filtering
        scores_array = np.array(list(normalized_scores.items()), dtype=object)
        mask = np.array([s[1] for s in scores_array]) > 0.1

        if not mask.any():
            return {"user_id": user_id, "recommendations": []}

        filtered = scores_array[mask]
        sorted_indices = np.argsort([s[1] for s in filtered])[::-1]
        top_candidates = filtered[sorted_indices][:top_k]

        # Enrich each recommendation with additional relationship details.
        recommendations = []

        for candidate, norm_score in top_candidates:
            candidate_str = str(candidate)
            norm_score_float = float(norm_score)

            recommendations.append({
                "user_id": candidate_str,
                "raw_score": round(raw_scores[candidate_str], 4),
                "normalized_score": norm_score_float,
                "common_friends_count": self.repository.count_common_neighbors(
                    user_id, candidate_str, self.graph_id,
                ),
                "is_connected": bool(
                    self.repository.shortest_path(user_id, candidate_str, self.graph_id)
                ),
            })

        recommendations.sort(key=lambda x: x["normalized_score"], reverse=True)

        for i, rec in enumerate(recommendations):
            rec["rank"] = i + 1

        return {
            "user_id": user_id,
            "total_candidates": len(raw_scores),
            "recommendations": recommendations,
        }

    def batch_predict_all_edges(self):
        logger.info("Batch prediction started")

        graph_id = self.repository._graph_id(self.graph_id)
        users = self.repository.registry.get_all_nodes(graph_id)

        all_scores = {}
        total = len(users)

        for i, u in enumerate(users):
            existing = set(self.repository.neighbors(u, self.graph_id))

            for v in users[i + 1:]:
                if v in existing:
                    continue

                try:
                    score = self.predict_link_score(u, v)
                    if score > 0.01:
                        all_scores[(u, v)] = score
                except Exception as e:
                    logger.warning(f"Error predicting ({u},{v}): {e}")

            logger.info(f"Processed {i + 1}/{total}")

        logger.info("Batch prediction completed")
        return all_scores

    def clear_cache(self):
        self._cache.clear()

    def get_stats(self):
        return {
            "cache_size": len(self._cache),
            "weights": self.weights.copy(),
            "normalization_method": self.normalization_config["method"],
            "total_users": self.repository.node_count(self.graph_id),
            "total_edges": self.repository.edge_count(self.graph_id),
        }