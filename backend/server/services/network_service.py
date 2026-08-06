from core.graph import (
    GraphService,
)

from utils.server_metrics import (
    refresh_graph_metrics,
    increment_graphs_loaded,
)

from schemas.graph_view import (
    Node,
    Edge,
    ViewportRequest,
)

from utils.dataset_reader import (
    DatasetReader,
)

from utils.dataset_parser import (
    DatasetParser,
)

from logger_config import (
    get_logger,
)

from core.exceptions import (
    ValidationError,
    DatasetError,
    GraphNotFoundError,
    SocialTribeException
)

from utils.server_metrics import (
    DATASET_IMPORT_DURATION_SECONDS,
    DATASET_IMPORT_SIZE_BYTES,
    DATASET_IMPORTED_EDGES,
    DATASET_IMPORTED_NODES,
    BACKUP_DOWNLOAD_SIZE_BYTES,
    BACKUPS_CREATED_TOTAL,
    BACKUPS_RESTORED_TOTAL,
    refresh_backup_metrics
)

logger = get_logger(__name__)


class NetworkService:

    def __init__(
            self,
            graph_service: GraphService,
    ):
        self.graph = graph_service

    # =====================================================
    # Viewport
    # =====================================================

    def viewport(
            self,
            req: ViewportRequest,
    ):
        logger.debug(
            "Viewport request "
            "zoom=%s",
            req.zoom,
        )
        zoom = max(
            0.1,
            min(req.zoom or 1.0, 5)
        )
        return self.graph.getViewport(
            req.x,
            req.y,
            req.width,
            req.height,
            zoom,
        )

    # =====================================================
    # Node
    # =====================================================

    def create_or_update_node(
            self,
            node: Node,
            graph_id: str | None = None,
    ):
        if not node.id:
            raise ValidationError(
                "Node ID is required."
            )
        logger.info(
            "Creating node %s",
            node.id,
        )

        result = self.graph.addNode(
            node,
            graph_id
        )

        stats = self.graph.getGraphStats()

        refresh_graph_metrics(stats)

        return result

    def delete_node(
            self,
            node_id: str,
            graph_id: str | None = None,
    ):
        logger.info(
            "Deleting node %s",
            node_id,
        )

        result = self.graph.deleteNode(
            node_id,
            graph_id
        )

        stats = self.graph.getGraphStats()

        refresh_graph_metrics(stats)

        return result

    def update_node(
            self,
            node: Node,
            graph_id: str | None = None,
    ):
        logger.info(
            "Updating node %s",
            node.id,
        )
        result = self.graph.updateNode(
            node,
            graph_id
        )

        stats = self.graph.getGraphStats()

        refresh_graph_metrics(stats)

        return result

    # =====================================================
    # Edge
    # =====================================================

    def create_or_update_edge(
            self,
            edge: Edge,
            graph_id: str | None = None,
    ):
        if not edge.id:
            raise ValidationError(
                "Edge ID is required."
            )
        if not edge.source:
            raise ValidationError(
                "Edge source is required."
            )
        if not edge.target:
            raise ValidationError(
                "Edge target is required."
            )
        if not edge.type:
            edge.type = (
                "weightedEdge"
            )

        logger.info(
            "Creating edge %s",
            edge.id,
        )

        result = self.graph.addEdge(
            edge,
            graph_id
        )

        stats = self.graph.getGraphStats()

        refresh_graph_metrics(stats)

        return result

    def delete_edge(
            self,
            edge_id: str,
            graph_id: str | None = None,
    ):

        result = self.graph.deleteEdge(
            edge_id,
            graph_id
        )

        stats = self.graph.getGraphStats()

        refresh_graph_metrics(stats)

        return result

    # =====================================================
    # Dataset Import
    # =====================================================

    def import_dataset(
            self,
            filename: str,
            file_bytes: bytes,
            mode: str = "switch",
    ):

        logger.info(
            "Import mode=%s filename=%s",
            mode,
            filename,
        )

        active_graph = (
            self.graph.registry.get_active_graph()
        )

        logger.info(
            "Current active graph: %s",
            active_graph,
        )

        self.graph._dataset_importing = True

        with DATASET_IMPORT_DURATION_SECONDS.time():
            try:
                content = DatasetReader.read(
                    filename,
                    file_bytes,
                )
                graph_data = DatasetParser.parse(
                    content
                )

                if mode == "switch":

                    graph_id = (
                        self.graph.registry
                        .create_graph(
                            filename
                        )
                    )

                    logger.info(
                        "Using graph_id=%s",
                        graph_id,
                    )

                elif mode == "merge":

                    graph_id = (
                        self.graph.registry
                        .ensure_active_graph(
                            filename
                        )
                    )

                else:
                    raise DatasetError(
                        "mode must be "
                        "'switch' or 'merge'."
                    )

                for node in graph_data.nodes:
                    self.graph.addNode(
                        node,
                        graph_id,
                    )

                for edge in graph_data.edges:
                    self.graph.addEdge(
                        edge,
                        graph_id,
                    )

                self.graph.rebuild_dataset_import(
                    graph_id
                )

                dataset_id = (
                    self.graph.registry
                    .create_dataset(
                        graph_id=graph_id,
                        filename=filename,
                        node_count=len(
                            graph_data.nodes
                        ),
                        edge_count=len(
                            graph_data.edges
                        ),
                    )
                )

                self.graph._rebuild_spatial_index(
                    graph_id
                )

                logger.info(
                    "Dataset imported "
                    "graph=%s "
                    "nodes=%d "
                    "edges=%d",
                    graph_id,
                    len(graph_data.nodes),
                    len(graph_data.edges),
                )

                increment_graphs_loaded()

                DATASET_IMPORT_SIZE_BYTES.observe(
                    len(file_bytes)
                )

                DATASET_IMPORTED_NODES.observe(
                    len(graph_data.nodes)
                )

                DATASET_IMPORTED_EDGES.observe(
                    len(graph_data.edges)
                )

                return {
                    "dataset_id": dataset_id,
                    "graph_id": graph_id,
                    "file_name": filename,
                    "mode": mode,
                    "total_nodes":
                        len(graph_data.nodes),
                    "total_edges":
                        len(graph_data.edges),
                    "saved": True,
                }

            except SocialTribeException:
                raise

            except Exception as e:
                logger.exception(
                    "Dataset import failed"
                )

                raise DatasetError(
                    "Failed to import dataset.",
                    details={
                        "filename": filename,
                        "reason": str(e),
                    },
                ) from e

            finally:
                self.graph._dataset_importing = False

    # =====================================================
    # Multi Graph
    # =====================================================

    def graphs(self):

        return (
            self.graph.registry
            .graph_list()
        )

    def datasets(self):

        return (
            self.graph.registry
            .get_datasets()
        )

    def switch_graph(
            self,
            graph_id: str,
    ):

        if not (
                self.graph
                        .registry
                        .graph_exists(
                    graph_id
                )
        ):
            raise GraphNotFoundError(
                f"Graph {graph_id} not found.",
                graph_id=graph_id,
            )

        self.graph.registry.set_active_graph(
            graph_id
        )

        logger.info(
            "Switched active graph "
            "to %s",
            graph_id,
        )

        self.graph._rebuild_spatial_index(
            graph_id
        )

        return {
            "active_graph":
                graph_id
        }

    # =====================================================
    # Backup
    # =====================================================

    def create_backup(
            self,
            name: str | None = None,
    ):
        logger.info(
            "Backup requested"
        )

        result = self.graph.createBackup(name)

        refresh_backup_metrics(
            self.graph.listBackups()
        )

        BACKUPS_CREATED_TOTAL.inc()

        return result

    def backups(self):
        logger.info(
            "Loading all backups",
        )
        backups = self.graph.listBackups()

        refresh_backup_metrics(backups)

        return backups

    def get_backup(
            self,
            backup_id: str,
    ):
        graph = self.graph.loadBackup(
            backup_id
        )

        BACKUPS_RESTORED_TOTAL.inc()

        return {
            "backup_id":
                backup_id,
            "graph":
                graph,
        }

    def delete_backup(
            self,
            backup_id: str,
    ):
        result = self.graph.deleteBackup(
            backup_id
        )

        refresh_backup_metrics(
            self.graph.listBackups()
        )

        return result

    def download_backup_file(
            self,
            backup_id: str,
    ):
        backup_file = self.graph.downloadBackupFile(
            backup_id
        )

        BACKUP_DOWNLOAD_SIZE_BYTES.observe(
            backup_file.stat().st_size
        )

        return backup_file

    # =====================================================
    # Stats
    # =====================================================

    def stats(self):
        logger.debug(
            "Graph stats requested"
        )
        return (
            self.graph
            .getGraphStats()
        )
