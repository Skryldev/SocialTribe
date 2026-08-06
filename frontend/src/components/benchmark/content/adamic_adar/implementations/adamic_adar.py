import math


def adamic_adar(graph, node1, node2):
    """
    Adamic-Adar link prediction algorithm.
    Measures similarity between two nodes by summing 1/log(deg(neighbor))
    for common neighbors.

    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(min(deg(u), deg(v)))

    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node

    Returns:
        float: Adamic-Adar similarity score
    """
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())

    # Find common neighbors
    common_neighbors = neighbors1.intersection(neighbors2)

    # Sum 1/log(degree) for each common neighbor
    score = 0.0
    for neighbor in common_neighbors:
        degree = len(graph.get(neighbor, set()))
        if degree > 1:  # Avoid log(1) = 0
            score += 1.0 / math.log(degree)

    return score