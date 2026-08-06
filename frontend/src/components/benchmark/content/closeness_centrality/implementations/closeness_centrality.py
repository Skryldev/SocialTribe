from collections import deque


def closeness_centrality(graph, node):
    """
    Computes the closeness centrality of a node.
    Measures how close a node is to all other nodes in the graph.

    Time Complexity: O(V + E)
    Space Complexity: O(V)

    Args:
        graph: Dict mapping node -> set of neighbors
        node: The node to compute centrality for

    Returns:
        float: Closeness centrality value (between 0 and 1)
    """
    # BFS to find shortest paths to all nodes
    distances = {}
    queue = deque([node])
    distances[node] = 0

    while queue:
        current = queue.popleft()
        for neighbor in graph.get(current, set()):
            if neighbor not in distances:
                distances[neighbor] = distances[current] + 1
                queue.append(neighbor)

    # If no other nodes reachable
    if len(distances) <= 1:
        return 0.0

    # Sum of distances to all reachable nodes
    total_distance = sum(distances.values())

    # Closeness centrality formula
    # normalized by number of reachable nodes
    n = len(distances) - 1  # exclude self
    return n / total_distance

# Example usage:
# graph = {
#     'A': {'B', 'C'},
#     'B': {'A', 'C', 'D'},
#     'C': {'A', 'B', 'E'},
#     'D': {'B'},
#     'E': {'C'}
# }
# cc = closeness_centrality(graph, 'B')
# print(cc)  # B can reach all nodes with total distance 1+1+2+2=6, n=4, cc=4/6=0.667