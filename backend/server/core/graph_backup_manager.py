from logger_config import (
    get_logger,
)

from core.backup_manager import (
    create_backup,
    load_backup,
    list_backups,
    delete_backup,
    download_backup_file
)

from core.exceptions import (
    GraphExportError,
)

logger = get_logger(__name__)


class GraphBackupManager:

    def __init__(
            self,
            graph_service,
    ):
        self.graph = graph_service

    def exportGraph(
            self,
            graph_id=None,
    ):
        try:
            logger.info(
                "Exporting graph.",
                extra={
                    "extra_data": {
                        "graph_id": graph_id,
                    }
                },
            )

            return self.graph._build_graph_data(graph_id)

        except Exception as e:
            logger.exception(
                "Graph export failed.",
                extra={
                    "extra_data": {
                        "graph_id": graph_id,
                    }
                },
            )

            raise GraphExportError(
                "Failed to export graph.",
                graph_id=graph_id,
                details={
                    "reason": str(e),
                },
            ) from e

    def createBackup(
            self,
            name: str | None = None,
    ):
        logger.info(
            "Creating graph backup"
        )

        graph = (
            self.graph
            ._build_graph_data()
        )

        return create_backup(
            graph,
            name,
        )

    def loadBackup(
            self,
            backup_id: str,
    ):
        logger.info(
            "Loading backup %s",
            backup_id,
        )

        return load_backup(
            backup_id
        )

    def deleteBackup(
            self,
            backup_id: str,
    ):
        logger.info(
            "Deleting backup %s",
            backup_id,
        )
        return delete_backup(
            backup_id
        )

    def downloadBackupFile(
            self,
            backup_id: str,
    ):
        logger.info(
            "Downloading backup file %s",
            backup_id,
        )

        return download_backup_file(
            backup_id
        )

    def listBackups(
            self,
    ):
        logger.info(
            "Get all backups",
        )
        return list_backups()
