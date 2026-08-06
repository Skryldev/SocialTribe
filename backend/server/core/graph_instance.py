from core.graph import (
    GraphService,
    SpatialIndex,
)

from storage_engine.client import (
    StorageClient,
)

from storage_engine.repository import (
    GraphRepository,
)

from storage_engine.registry import (
    GraphRegistry,
)

# Initialize shared infrastructure components.

registry = GraphRegistry()

storage = StorageClient()

repository = GraphRepository(
    storage=storage,
    registry=registry,
)

spatial_index = SpatialIndex()

# Create the application's singleton graph service.

graph_service = GraphService(
    repository=repository,
    registry=registry,
    spatial_index=spatial_index,
)