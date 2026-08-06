def natural_layout(
        repo,
        **kwargs,
):
    node_ids = repo.node_ids()

    if not node_ids:
        return []

    # Reuse the positions currently stored for the graph.

    positions = repo.positions(
        node_ids
    )

    return [
        {
            "id": node_id,
            "position": positions[node_id],
        }
        for node_id in node_ids
    ]