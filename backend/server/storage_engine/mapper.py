from schemas.graph_view import (
    Node,
    Edge,
    Position,
    NodeData,
    EdgeData
)
from datetime import datetime

from storage_engine import storage_pb2 as pb


class ProtoMapper:

    # Convert the internal node model into its protobuf representation.

    @staticmethod
    def node_to_proto(node: Node) -> pb.Node:

        return pb.Node(
            id=node.id,
            type=node.type,
            position=pb.Position(
                x=node.position.x,
                y=node.position.y
            ),
            data=pb.NodeData(
                id=node.data.id,
                name=node.data.name,
                node_type=node.data.nodeType,
                role=node.data.role,
                friend_count=node.data.friendCount,
                avg_distance=node.data.avgDistance,
                centrality=node.data.centrality
            )
        )

    # Reconstruct the application node model from a protobuf message.

    @staticmethod
    def proto_to_node(node: pb.Node) -> Node:

        return Node(
            id=node.id,
            type=node.type,
            position=Position(
                x=node.position.x,
                y=node.position.y
            ),
            data=NodeData(
                id=node.data.id,
                name=node.data.name,
                nodeType=node.data.node_type,
                role=node.data.role,
                friendCount=node.data.friend_count,
                avgDistance=node.data.avg_distance,
                centrality=node.data.centrality
            )
        )

    # Reconstruct the application edge model from a protobuf message.

    @staticmethod
    def proto_to_edge(edge: pb.Edge) -> Edge:

        return Edge(
            id=edge.id,
            source=edge.source,
            target=edge.target,
            type=edge.type,
            data=EdgeData(
                Weight=edge.data.weight,
                createdAt=edge.data.created_at,
                id=edge.data.id,
                targetId=edge.data.target_id,
            )
        )

    # Convert the internal edge model into its protobuf representation.

    @staticmethod
    def edge_to_proto(edge: Edge) -> pb.Edge:

        created_at = edge.data.createdAt

        # Normalize timestamps before serializing them into protobuf.

        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        elif created_at is None:
            created_at = ""

        return pb.Edge(
            id=edge.id,
            source=edge.source,
            target=edge.target,
            type=edge.type,
            data=pb.EdgeData(
                weight=int(edge.data.Weight),
                created_at=created_at,
                id=edge.data.id,
                target_id=edge.data.targetId,
            )
        )