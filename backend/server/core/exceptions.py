class SocialTribeException(Exception):
    def __init__(
            self,
            message: str,
            *,
            graph_id: str | None = None,
            node_id: str | None = None,
            edge_id: str | None = None,
            details: dict | None = None,
    ):
        super().__init__(message)

        self.message = message
        self.graph_id = graph_id
        self.node_id = node_id
        self.edge_id = edge_id
        self.details = details or {}

    def to_dict(self):
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "graph_id": self.graph_id,
            "node_id": self.node_id,
            "edge_id": self.edge_id,
            "details": self.details,
        }


# -----------------Multi-Graph--------------

class GraphNotFoundError(SocialTribeException):
    pass


class UserNotFoundError(SocialTribeException):
    pass


class InvalidUserDataError(SocialTribeException):
    pass


# ---------------- Registry ----------------

class RegistryError(
    SocialTribeException,
):
    pass


class RegistryPersistenceError(
    RegistryError,
):
    pass


# -----------------Repository--------------


class RepositoryError(
    SocialTribeException,
):
    pass


class RepositoryValidationError(
    RepositoryError,
):
    pass


class NodeNotFoundError(RepositoryError):
    pass


class EdgeNotFoundError(RepositoryError):
    pass


# -----------------Storage gRPC--------------

class StorageError(
    SocialTribeException
):
    pass


class StorageConnectionError(
    StorageError
):
    pass


class StorageOperationError(
    StorageError
):
    pass


# ----------------Analytics and Algorithms-------------------

class AnalyticsError(
    SocialTribeException
):
    pass


class MetricCalculationError(
    AnalyticsError
):
    pass


class FriendRecommendationError(
    AnalyticsError,
):
    pass


class NormalizationError(
    AnalyticsError
):
    pass


class CentralityError(
    AnalyticsError
):
    pass


class SimulationNotInitializedError(
    AnalyticsError
):
    pass


class InvalidSeedNodeError(
    AnalyticsError
):
    pass


class InvalidProbabilityError(
    AnalyticsError
):
    pass


class InvalidThresholdError(
    AnalyticsError
):
    pass


class EdgeWeightCalculationError(
    AnalyticsError,
):
    pass

class InvalidKValueError(
    AnalyticsError
):
    pass


# ---------------- Backup ----------------

class BackupError(
    SocialTribeException
):
    pass


class BackupSaveError(
    BackupError
):
    pass


class BackupLoadError(
    BackupError
):
    pass


# ---------------- Spatial ----------------

class SpatialIndexError(
    SocialTribeException
):
    pass


class SpatialQueryError(
    SpatialIndexError
):
    pass


class SpatialUpdateError(
    SpatialIndexError
):
    pass


# ---------------- Analysis ----------------

class AnalysisError(
    SocialTribeException
):
    pass


class AnalysisStateError(
    AnalysisError
):
    pass

# ---------------- Graph Service ----------------

class GraphServiceError(
    SocialTribeException,
):
    pass


class GraphBuildError(
    GraphServiceError,
):
    pass


class GraphExportError(
    GraphServiceError,
):
    pass


class ViewportError(
    GraphServiceError,
):
    pass


# ---------------- Services ----------------

class ServiceError(
    SocialTribeException,
):
    pass


class ValidationError(
    ServiceError,
):
    pass


class DatasetError(
    ServiceError,
):
    pass

class LogQueryError(
    ServiceError,
):
    pass


# ---------------- Dataset ----------------

class DatasetReaderError(
    SocialTribeException,
):
    pass


class UnsupportedDatasetFormatError(
    DatasetReaderError,
):
    pass


class DatasetParseError(
    SocialTribeException,
):
    pass


# ---------------- Layout ----------------

class LayoutError(
    SocialTribeException,
):
    pass


# ---------------- Metrics ----------------

class MetricsError(
    SocialTribeException,
):
    pass
