"""
Prometheus metric definitions.

This module contains only metric declarations.

Do not place business logic or recording logic here.
"""

from prometheus_client import Counter, Gauge, Histogram

# =============================================================================
# HTTP Metrics
# =============================================================================

HTTP_REQUESTS_TOTAL = Counter(
    name="http_requests_total",
    documentation="Total number of HTTP requests.",
    labelnames=("method", "route", "status"),
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    name="http_request_duration_seconds",
    documentation="HTTP request latency in seconds.",
    labelnames=("method", "route", "status"),
)

HTTP_REQUESTS_IN_PROGRESS = Gauge(
    name="http_requests_in_progress",
    documentation="Current number of HTTP requests being processed.",
)

# =============================================================================
# Graph Metrics
# =============================================================================

GRAPHS_LOADED_TOTAL = Counter(
    name="graphs_loaded_total",
    documentation="Total number of successfully imported graphs.",
)

GRAPH_NODES_TOTAL = Gauge(
    name="graph_nodes_total",
    documentation="Current number of nodes in the active graph.",
)

GRAPH_EDGES_TOTAL = Gauge(
    name="graph_edges_total",
    documentation="Current number of edges in the active graph.",
)

# =============================================================================
# Analytics Metrics
# =============================================================================

SHORTEST_PATH_REQUESTS_TOTAL = Counter(
    name="shortest_path_requests_total",
    documentation="Total number of shortest path requests.",
)

SHORTEST_PATH_DURATION_SECONDS = Histogram(
    name="shortest_path_duration_seconds",
    documentation="Time spent computing shortest paths.",
)

COMMON_NEIGHBORS_REQUESTS_TOTAL = Counter(
    name="common_neighbors_requests_total",
    documentation="Total number of common neighbors requests.",
)

COMMON_NEIGHBORS_DURATION_SECONDS = Histogram(
    name="common_neighbors_duration_seconds",
    documentation="Time spent computing common neighbors.",
)

COMMUNITY_DETECTION_REQUESTS_TOTAL = Counter(
    name="community_detection_requests_total",
    documentation="Total number of community detection requests.",
)

COMMUNITY_DETECTION_DURATION_SECONDS = Histogram(
    name="community_detection_duration_seconds",
    documentation="Time spent computing community detection.",
)

RECOMMENDATION_REQUESTS_TOTAL = Counter(
    name="recommendation_requests_total",
    documentation="Total number of friend recommendation requests.",
)

RECOMMENDATION_DURATION_SECONDS = Histogram(
    name="recommendation_duration_seconds",
    documentation="Time spent generating friend recommendations.",
)

# =============================================================================
# Layout Metrics
# =============================================================================

LAYOUT_REQUESTS_TOTAL = Counter(
    name="layout_requests_total",
    documentation="Total number of layout requests.",
)

LAYOUT_DURATION_SECONDS = Histogram(
    name="layout_duration_seconds",
    documentation="Time spent computing graph layouts.",
)

# =============================================================================
# Dataset Metrics
# =============================================================================

DATASET_IMPORT_DURATION_SECONDS = Histogram(
    name="dataset_import_duration_seconds",
    documentation="Time spent importing graph datasets.",
)

DATASET_IMPORT_SIZE_BYTES = Histogram(
    name="dataset_import_size_bytes",
    documentation="Size of imported graph datasets in bytes.",
    buckets=(
        1_024,  # 1 KB
        5_120,  # 5 KB
        10_240,  # 10 KB
        51_200,  # 50 KB
        102_400,  # 100 KB
        512_000,  # 500 KB
        1_048_576,  # 1 MB
        5_242_880,  # 5 MB
        10_485_760,  # 10 MB
        52_428_800,  # 50 MB
        104_857_600,  # 100 MB
        float("inf"),
    )
)

DATASET_IMPORTED_NODES = Histogram(
    name="dataset_imported_nodes",
    documentation="Number of nodes imported per dataset.",
    buckets=(
        10,
        25,
        50,
        100,
        250,
        500,
        1_000,
        2_500,
        5_000,
        10_000,
        25_000,
        50_000,
        float("inf"),
    )
)

DATASET_IMPORTED_EDGES = Histogram(
    name="dataset_imported_edges",
    documentation="Number of edges imported per dataset.",
    buckets=(
        10,
        25,
        50,
        100,
        250,
        500,
        1_000,
        2_500,
        5_000,
        10_000,
        25_000,
        50_000,
        float("inf"),
    )
)

# =============================================================================
# Query Metrics
# =============================================================================

QUERY_REQUESTS_TOTAL = Counter(
    name="query_requests_total",
    documentation="Total number of graph query requests.",
)

QUERY_DURATION_SECONDS = Histogram(
    name="query_duration_seconds",
    documentation="Time spent executing graph queries.",
)

# =============================================================================
# Simulation Metrics
# =============================================================================

SIMULATION_RUNS_TOTAL = Counter(
    name="simulation_runs_total",
    documentation="Total number of simulation runs.",
)

SIMULATION_DURATION_SECONDS = Histogram(
    name="simulation_duration_seconds",
    documentation="Time spent running simulations.",
)

INFLUENCE_MAXIMIZATION_REQUESTS_TOTAL = Counter(
    name="influence_maximization_requests_total",
    documentation="Total number of influence maximization requests.",
)

INFLUENCE_MAXIMIZATION_DURATION_SECONDS = Histogram(
    name="influence_maximization_duration_seconds",
    documentation="Time spent computing influence maximization.",
)

# =============================================================================
# Backup Metrics
# =============================================================================

BACKUPS_CREATED_TOTAL = Counter(
    name="backups_created_total",
    documentation="Total number of created backups.",
)

BACKUPS_RESTORED_TOTAL = Counter(
    name="backups_restored_total",
    documentation="Total number of restored backups.",
)

BACKUP_DOWNLOAD_SIZE_BYTES = Histogram(
    name="backup_download_size_bytes",
    documentation="Size of downloaded backup files in bytes.",
    buckets=(
        1_024,
        5_120,
        10_240,
        51_200,
        102_400,
        512_000,
        1_048_576,
        5_242_880,
        10_485_760,
        float("inf"),
    ),
)

BACKUPS_TOTAL = Gauge(
    name="backups_total",
    documentation="Total number of backups.",
)

# =============================================================================
# Helper Functions
# =============================================================================

def refresh_graph_metrics(stats: dict) -> None:
    GRAPH_NODES_TOTAL.set(stats["nodes"])
    GRAPH_EDGES_TOTAL.set(stats["edges"])


def increment_graphs_loaded() -> None:
    GRAPHS_LOADED_TOTAL.inc()

def refresh_backup_metrics(backups: list) -> None:
    BACKUPS_TOTAL.set(len(backups))