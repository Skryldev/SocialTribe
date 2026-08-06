from algorithms.rumor_simulation import RumorSimulationEngine
from algorithms.influence_maximization import (
    InfluenceMaximizer,
)
from algorithms.ensemble_community_detector import (
    EnsembleCommunityDetector,
)
from algorithms.friend_recommendation import (
    LinkPredictor,
)
from logger_config import get_logger

logger = get_logger(__name__)


class GraphAlgorithmManager:

    def __init__(
            self,
            graph_service,
    ):
        self.graph = graph_service

    def recommendFriends(
            self,
            node_id: str,
            top_k: int = 10,
            graph_id: str | None = None,
    ):
        logger.debug(
            "Generating friend recommendations "
            "for node %s",
            node_id,
        )

        predictor = LinkPredictor(
            repository=self.graph.repository,
            graph_id=graph_id,
        )

        result = predictor.recommend_friends(
            node_id,
            top_k,
        )

        logger.info(
            "Friend recommendation completed.",
            extra={
                "extra_data": {
                    "node_id": node_id,
                    "recommended_count": len(result),
                }
            },
        )

        return result

    def recommendFriendsWithDetails(
            self,
            node_id,
            top_k=10,
            graph_id=None,
    ):
        logger.info(
            "Running detailed friend recommendation.",
            extra={
                "extra_data": {
                    "node_id": node_id,
                    "graph_id": graph_id,
                    "top_k": top_k,
                }
            },
        )

        predictor = LinkPredictor(
            self.graph.repository,
            graph_id,
        )

        result = predictor.recommend_friends_with_details(
            node_id,
            top_k,
        )

        logger.info(
            "Detailed friend recommendation completed.",
            extra={
                "extra_data": {
                    "node_id": node_id,
                    "recommended_count": len(result),
                }
            },
        )

        return result

    def create_simulation_engine(
            self,
            graph_id: str | None = None,
    ):
        return RumorSimulationEngine(
            repository=self.graph.repository,
            graph_id=graph_id,
        )

    def createInfluenceMaximizer(
            self,
            graph_id=None,
    ):
        return InfluenceMaximizer(
            repository=self.graph.repository,
            graph_id=graph_id,
        )

    def detectCommunities(
            self,
            config,
            graph_id=None,
    ):
        # Create a fresh detector instance for the requested graph.

        logger.info(
            "Starting community detection.",
            extra={
                "extra_data": {
                    "graph_id": graph_id,
                    "resolution": config.resolution,
                    "ensemble_runs": config.ensembleRuns,
                }
            },
        )

        detector = (
            EnsembleCommunityDetector(
                repository=self.graph.repository,
                graph_id=graph_id
            )
        )

        result = detector.detect(
            resolution=config.resolution,
            ensemble_runs=config.ensembleRuns,
            consensus_threshold=config.consensusThreshold,
        )

        logger.info(
            "Community detection completed."
        )

        return result

    def shortestPath(
            self,
            source_id: str,
            target_id: str,
            graph_id: str | None = None,
    ):
        logger.info(
            "Finding shortest path.",
            extra={
                "extra_data": {
                    "source_id": source_id,
                    "target_id": target_id,
                    "graph_id": graph_id,
                }
            },
        )

        result = self.graph.repository.shortest_path(
            source_id,
            target_id,
            graph_id,
        )

        logger.info("Shortest path calculation completed.")

        return result

    def commonNeighbors(
            self,
            source_id: str,
            target_id: str,
            graph_id: str | None = None,
    ):
        logger.info(
            "Finding common neighbors.",
            extra={
                "extra_data": {
                    "source_id": source_id,
                    "target_id": target_id,
                    "graph_id": graph_id,
                }
            },
        )

        result = self.graph.repository.common_neighbors(
            source_id,
            target_id,
            graph_id,
        )

        logger.info(
            "Common neighbors calculation completed.",
            extra={
                "extra_data": {
                    "count": len(result),
                }
            },
        )

        return result
