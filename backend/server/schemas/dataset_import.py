from pydantic import BaseModel


class DatasetImportResponse(BaseModel):
    dataset_id: str
    graph_id: str
    mode: str
    total_nodes: int
    total_edges: int
    file_name: str
    saved: bool