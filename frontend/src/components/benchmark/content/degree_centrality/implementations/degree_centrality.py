def degree_centrality(graph, normalize=True):
    """
    Degree Centrality algorithm.
    Calculates the centrality of each node based on its degree
    (number of direct connections).

    Time Complexity: O(V)
    Space Complexity: O(V)

    Args:
        graph: Dict mapping node -> set of neighbors
        normalize: If True, divides by (n-1) for 0-1 range

    Returns:
        dict: Mapping of node -> degree centrality score
    """
    n = len(graph)
    
    if n == 0:
        return {}
    
    centrality_scores = {}
    
    # Calculate degree for each node
    for node, neighbors in graph.items():
        degree = len(neighbors)
        
        if normalize and n > 1:
            centrality_scores[node] = degree / (n - 1)
        else:
            centrality_scores[node] = float(degree)
    
    return centrality_scores


def degree_centrality_single(graph, node, normalize=True):
    """
    Calculate degree centrality for a single node.

    Time Complexity: O(1)
    Space Complexity: O(1)

    Args:
        graph: Dict mapping node -> set of neighbors
        node: Target node to calculate centrality for
        normalize: If True, divides by (n-1) for 0-1 range

    Returns:
        float: Degree centrality score for the specified node
    """
    n = len(graph)
    
    if n == 0 or node not in graph:
        return 0.0
    
    degree = len(graph[node])
    
    if normalize and n > 1:
        return degree / (n - 1)
    
    return float(degree)


def in_out_degree_centrality(graph, normalize=True):
    """
    Calculate in-degree and out-degree centrality for directed graphs.
    Graph format: dict mapping node -> {'in': set(), 'out': set()}

    Time Complexity: O(V)
    Space Complexity: O(V)

    Args:
        graph: Dict mapping node -> {'in': set(incoming), 'out': set(outgoing)}
        normalize: If True, divides by (n-1) for 0-1 range

    Returns:
        dict: Mapping of node -> {'in_degree': float, 'out_degree': float}
    """
    n = len(graph)
    
    if n == 0:
        return {}
    
    centrality_scores = {}
    
    for node, connections in graph.items():
        in_deg = len(connections.get('in', set()))
        out_deg = len(connections.get('out', set()))
        
        if normalize and n > 1:
            centrality_scores[node] = {
                'in_degree': in_deg / (n - 1),
                'out_degree': out_deg / (n - 1)
            }
        else:
            centrality_scores[node] = {
                'in_degree': float(in_deg),
                'out_degree': float(out_deg)
            }
    
    return centrality_scores


def get_top_nodes(graph, k=10, normalize=True):
    """
    Get the k nodes with highest degree centrality.

    Time Complexity: O(V log V)
    Space Complexity: O(V)

    Args:
        graph: Dict mapping node -> set of neighbors
        k: Number of top nodes to return
        normalize: If True, uses normalized scores

    Returns:
        list: Tuples of (node, score) sorted by score descending
    """
    centrality_scores = degree_centrality(graph, normalize)
    
    # Sort by score in descending order
    sorted_nodes = sorted(
        centrality_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return sorted_nodes[:k]