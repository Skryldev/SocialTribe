from storage_engine.repository import GraphRepository
from logger_config import (
    get_logger,
)
from collections import deque
from algorithms.centrality import (
    CentralityAnalyzer
)
from core.exceptions import (
    MetricsError,
)

logger = get_logger(__name__)


def calculate_friend_count(
        repository: GraphRepository,
        graph_id=None,
):
    logger.debug(
        "Calculating friend count"
    )
    result = {}

    # Compute the degree of every node in the graph.

    for node_id in (
            repository
                    .registry
                    .get_all_nodes(graph_id)
    ):
        result[node_id] = (
            repository.degree(
                node_id,
                graph_id,
            )
        )

    return result


def bfs_distances(
        repository: GraphRepository,
        start,
        graph_id=None,
):
    try:
        logger.debug(
            "BFS from node %s",
            start,
        )
        visited = {start}
        distances = {start: 0}

        queue = deque([start])

        # Traverse the graph breadth-first to compute shortest distances.

        while queue:

            current = queue.popleft()

            neighbors = (
                repository
                .neighbors(
                    current,
                    graph_id,
                )
            )

            for neighbor in neighbors:

                if neighbor in visited:
                    continue

                visited.add(neighbor)

                distances[neighbor] = (
                        distances[current] + 1
                )

                queue.append(neighbor)

        return distances

    except Exception as e:
        raise MetricsError(
            "BFS failed.",
            node_id=start,
            details={
                "reason": str(e),
            },
        ) from e


def calculate_average_distance(
        repository: GraphRepository,
        graph_id=None,
):
    try:
        logger.info(
            "Calculating average distances"
        )
        averages = {}

        nodes = (
            repository
            .registry
            .get_all_nodes(
                graph_id
            )
        )

        # Measure the average shortest-path distance from every node.

        for node_id in nodes:

            distances = bfs_distances(
                repository,
                node_id,
                graph_id,
            )

            reachable = [
                d
                for nid, d
                in distances.items()
                if nid != node_id
            ]

            if not reachable:
                averages[node_id] = 0.0
                continue

            averages[node_id] = (
                    sum(reachable)
                    / len(reachable)
            )

        if not averages:
            return {}

        values = list(
            averages.values()
        )

        min_avg = min(values)
        max_avg = max(values)

        if max_avg == min_avg:
            return {
                nid: 1.0
                for nid in averages
            }

        normalized = {}

        for nid, avg in averages.items():
            score = (
                            max_avg - avg
                    ) / (
                            max_avg - min_avg
                    )

            normalized[nid] = round(
                score,
                4,
            )
        logger.info(
            "Average distances calculated "
            "for %d nodes",
            len(normalized),
        )
        return normalized

    except Exception as e:
        logger.exception(
            "Average distance calculation failed"
        )

        raise MetricsError(
            "Failed to calculate average distance.",
            graph_id=graph_id,
            details={
                "reason": str(e),
            },
        ) from e


def refresh_node_metrics(
        repository,
        graph_id=None,
):
    logger.info(
        "Refreshing node metrics"
    )
    analyzer = (
        CentralityAnalyzer(
            repository,
            graph_id,
        )
    )

    centralities = (
        analyzer
        .compute_all_centralities()
    )

    avg_distances = (
        calculate_average_distance(
            repository,
            graph_id,
        )
    )

    nodes = (
        repository
        .get_nodes(
            graph_id
        )
    )

    # Synchronize computed metrics back into the stored node metadata.

    for node in nodes:

        node.data.friendCount = (
            repository.degree(
                node.id,
                graph_id,
            )
        )

        node.data.avgDistance = (
            avg_distances.get(
                node.id,
                0,
            )
        )

        if node.id in centralities:
            node.data.centrality = (
                centralities[
                    node.id
                ].overall
            )

            node.data.role = (
                centralities[
                    node.id
                ].role
            )

        repository.update_node(
            node,
            graph_id,
        )

    logger.info(
        "Node metrics refreshed"
    )
