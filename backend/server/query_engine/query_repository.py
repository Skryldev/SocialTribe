from storage_engine.repository import GraphRepository


class QueryRepository:

    def __init__(
            self,
            repository: GraphRepository,
    ):
        self.repository = repository

    # =====================================================
    # Scan
    # =====================================================

    def scan_nodes(
            self,
            graph_id: str | None = None,
    ):

        # Load every node that belongs to the requested graph.

        ids = self.repository.get_node_ids(graph_id)

        if not ids:
            return []

        nodes = self.repository.get_nodes_bulk(ids, graph_id)

        return list(
            nodes.values()
        )

    # =====================================================
    # Expand
    # =====================================================

    def expand(
            self,
            source_rows: list[dict],
            graph_id: str | None = None,
    ) -> list[dict]:

        if not source_rows:
            return []

        #
        # source ids
        #

        source_ids = [
            row["id"]
            for row in source_rows
        ]

        #
        # source -> neighbors
        #

        # Load neighbor relationships for all source rows in a single call.

        adjacency = self.repository.neighbors_batch(source_ids, graph_id)

        #
        # collect target ids
        #

        target_ids = set()

        edge_pairs = []

        for source, neighbors in adjacency.items():

            for target in neighbors:
                target_ids.add(target)

                edge_pairs.append(
                    (source, target)
                )

        #
        # load target nodes
        #

        # Load all destination nodes required for expansion.

        target_nodes = (
            self.repository.get_nodes_bulk(
                list(target_ids),
                graph_id,
            )
        )

        #
        # load edges
        #

        # Retrieve edge metadata for every discovered connection.

        edges = (
            self.repository.get_edges_between(
                edge_pairs,
                graph_id,
            )
        )

        #
        # source lookup
        #

        source_lookup = {
            row["id"]: row
            for row in source_rows
        }

        #
        # build query rows
        #

        # Assemble the expanded query rows from the loaded graph data.

        rows = []

        for source, neighbors in adjacency.items():

            source_row = source_lookup[source]

            for target in neighbors:

                node = target_nodes.get(target)

                if node is None:
                    continue

                edge = (
                        edges.get(
                            (source, target)
                        )
                        or
                        edges.get(
                            (target, source)
                        )
                )

                rows.append({
                    **source_row,
                    "v": node.model_dump(),
                    "e": edge.model_dump() if edge else None,
                })

        return rows
