from core.graph_instance import graph_service
from logger_config import get_logger
from core.graph import GraphService

from utils.server_metrics import (
    RECOMMENDATION_REQUESTS_TOTAL,
    RECOMMENDATION_DURATION_SECONDS,
    SHORTEST_PATH_REQUESTS_TOTAL,
    SHORTEST_PATH_DURATION_SECONDS,
    COMMON_NEIGHBORS_REQUESTS_TOTAL,
    COMMON_NEIGHBORS_DURATION_SECONDS,
    COMMUNITY_DETECTION_DURATION_SECONDS,
    COMMUNITY_DETECTION_REQUESTS_TOTAL,
)

from schemas.community import (
    EnsembleCommunityRequest,
)

logger = get_logger(__name__)


class AnalyticsService:

    def __init__(
            self,
            graph_service: GraphService,
    ):
        self.graph = graph_service

    # ---------------- Friend Recommendation ----------------

    @staticmethod
    def record_graph_access(user_id: str, node_id: str):
        logger.info(f"graph access user={user_id} node={node_id}")
        return {"success": True}

    def get_friend_recommendation(
            self,
            user_id: str,
            top_k: int = 10,
    ):
        RECOMMENDATION_REQUESTS_TOTAL.inc()

        logger.info(
            "Friend recommendation "
            "user=%s top_k=%d",
            user_id,
            top_k,
        )
        graph_id = graph_service.repository._graph_id()

        with RECOMMENDATION_DURATION_SECONDS.time():
            return self.graph.recommendFriends(
                user_id,
                top_k,
                graph_id,
            )

    def get_friend_recommendation_details(
            self,
            user_id: str,
            top_k: int = 10,
    ):

        RECOMMENDATION_REQUESTS_TOTAL.inc()

        graph_id = graph_service.repository._graph_id()

        with RECOMMENDATION_DURATION_SECONDS.time():
            return (
                self.graph.recommendFriendsWithDetails(
                    user_id,
                    top_k,
                    graph_id
                )
            )

    def export_reactflow(
            self,
    ):
        logger.info(
            "Graph export requested"
        )

        graph_id = graph_service.repository._graph_id()

        return self.graph.exportGraph(
            graph_id
        )

    def get_metadata(
            self,
    ):
        logger.debug(
            "Graph metadata requested"
        )
        graph_id = graph_service.repository._graph_id()

        return self.graph.getGraphStats(
            graph_id
        )

    def detect_communities(
            self,
            req:
            EnsembleCommunityRequest,
    ):
        COMMUNITY_DETECTION_REQUESTS_TOTAL.inc()

        with COMMUNITY_DETECTION_DURATION_SECONDS.time():
            return (
                self.graph
                .detectCommunities(
                    req.config
                )
            )

    def shortest_path(
            self,
            source_id: str,
            target_id: str,
    ):
        SHORTEST_PATH_REQUESTS_TOTAL.inc()

        graph_id = graph_service.repository._graph_id()

        with SHORTEST_PATH_DURATION_SECONDS.time():
            path = self.graph.shortestPath(
                source_id,
                target_id,
                graph_id,
            )

            if not path:
                return {
                    "is_directed": False,
                    "path": [],
                    "message": "No path exists between the selected user."
                }

            return {
                "is_directed": True,
                "path": path,
                "message": "Shortest path found."
            }

    def common_neighbors(
            self,
            source_id: str,
            target_id: str,
    ):
        COMMON_NEIGHBORS_REQUESTS_TOTAL.inc()

        graph_id = graph_service.repository._graph_id()

        with COMMON_NEIGHBORS_DURATION_SECONDS.time():
            neighbors = self.graph.commonNeighbors(
                source_id,
                target_id,
                graph_id,
            )

            count = len(neighbors)

            return {
                "has_common_friend": count > 0,
                "count": count,
                "common_neighbors": neighbors,
                "message": (
                    "Common neighbors found."
                    if count > 0
                    else "No common neighbors found."
                )
            }
