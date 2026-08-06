def common_neighbors(graph, node1, node2):
    """
    Common Neighbors link prediction algorithm.
    
    Measures similarity between two nodes by counting the number
    of shared neighbors they have in common. Based on the principle
    of triadic closure in social networks.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(min(deg(u), deg(v)))
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
    
    Returns:
        int: Number of common neighbors
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C', 'E'},
        ...     'C': {'A', 'B', 'D', 'E', 'F'},
        ...     'D': {'A', 'C'},
        ...     'E': {'B', 'C'},
        ...     'F': {'C'}
        ... }
        >>> common_neighbors(graph, 'A', 'B')
        1  # Only node C is common neighbor
    """
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    # Optimize by iterating over smaller set
    if len(neighbors1) > len(neighbors2):
        neighbors1, neighbors2 = neighbors2, neighbors1
    
    # Count common neighbors
    count = 0
    for neighbor in neighbors1:
        if neighbor in neighbors2:
            count += 1
    
    return count


def common_neighbors_normalized(graph, node1, node2, method='jaccard'):
    """
    Normalized Common Neighbors score.
    
    Provides a normalized version of common neighbors score
    to account for varying node degrees.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
        method: Normalization method:
            - 'jaccard': Intersection / Union (Jaccard coefficient)
            - 'min_max': Intersection / min(deg(u), deg(v))
            - 'cosine': Intersection / sqrt(deg(u) * deg(v))
            - 'sorensen': 2 * Intersection / (deg(u) + deg(v))
    
    Returns:
        float: Normalized common neighbors score
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A', 'C', 'D'}, 'C': {'A', 'B'}, 'D': {'B'}}
        >>> common_neighbors_normalized(graph, 'A', 'B', method='jaccard')
        0.3333...  # 1 common (C) / 3 total (B, C, D) = 1/3
    """
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    # Find common neighbors
    common = neighbors1.intersection(neighbors2)
    common_count = len(common)
    
    if common_count == 0:
        return 0.0
    
    deg1 = len(neighbors1)
    deg2 = len(neighbors2)
    
    if method == 'jaccard':
        # Jaccard coefficient: |A ∩ B| / |A ∪ B|
        union = neighbors1.union(neighbors2)
        denominator = len(union)
    
    elif method == 'min_max':
        # Min-max normalization
        denominator = min(deg1, deg2)
    
    elif method == 'cosine':
        # Cosine similarity: |A ∩ B| / sqrt(|A| * |B|)
        import math
        denominator = math.sqrt(deg1 * deg2)
    
    elif method == 'sorensen':
        # Sorensen-Dice coefficient
        denominator = (deg1 + deg2) / 2
    
    else:
        raise ValueError(f"Unknown normalization method: {method}")
    
    return common_count / denominator if denominator > 0 else 0.0


def common_neighbors_top_k(graph, node, k=5, exclude_existing=True):
    """
    Find top-k most likely connections for a given node.
    
    Identifies the k nodes with the highest number of common
    neighbors, representing the most probable future links.
    
    Time Complexity: O(V * min(deg))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Source node to find potential links for
        k: Number of top predictions to return
        exclude_existing: If True, exclude already connected nodes
    
    Returns:
        list: Tuples of (target_node, common_neighbor_count) sorted by count descending
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C', 'E'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'A', 'C'},
        ...     'E': {'B'}
        ... }
        >>> common_neighbors_top_k(graph, 'A', k=2)
        [('E', 1), ...]  # A and E share B as common neighbor
    """
    neighbors = graph.get(node, set())
    candidates = set(graph.keys()) - {node}
    
    if exclude_existing:
        candidates -= neighbors
    
    # Calculate common neighbors for all candidates
    predictions = []
    for candidate in candidates:
        count = common_neighbors(graph, node, candidate)
        if count > 0:
            predictions.append((candidate, count))
    
    # Sort by count descending and return top-k
    predictions.sort(key=lambda x: x[1], reverse=True)
    return predictions[:k]


def common_neighbors_matrix(graph, nodes=None):
    """
    Compute Common Neighbors scores for all pairs of nodes.
    
    Useful for complete link prediction analysis and evaluation.
    
    Time Complexity: O(V^2 * min(deg))
    Space Complexity: O(V^2)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to consider (default: all nodes)
    
    Returns:
        dict: Mapping of (node1, node2) -> common_neighbors count
    """
    if nodes is None:
        nodes = list(graph.keys())
    
    scores = {}
    n = len(nodes)
    
    for i in range(n):
        node1 = nodes[i]
        neighbors1 = graph.get(node1, set())
        
        for j in range(i + 1, n):
            node2 = nodes[j]
            
            # Skip existing connections (optional, can be removed)
            if node2 in neighbors1:
                continue
            
            count = common_neighbors(graph, node1, node2)
            if count > 0:
                scores[(node1, node2)] = count
                scores[(node2, node1)] = count  # Symmetric
    
    return scores


def common_neighbors_weighted(graph, node1, node2, weight_attr='weight'):
    """
    Weighted Common Neighbors for graphs with edge weights.
    
    Instead of just counting common neighbors, sums the weights
    of connections to common neighbors.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        node1: First node
        node2: Second node
        weight_attr: Not used directly; graph values are weights
    
    Returns:
        float: Weighted common neighbors score
    
    Example:
        >>> graph = {
        ...     'A': {'C': 0.8, 'D': 0.3},
        ...     'B': {'C': 0.9, 'D': 0.5},
        ...     'C': {'A': 0.8, 'B': 0.9},
        ...     'D': {'A': 0.3, 'B': 0.5}
        ... }
        >>> common_neighbors_weighted(graph, 'A', 'B')
        2.5  # weight(A-C) + weight(B-C) + weight(A-D) + weight(B-D) / 2
    """
    neighbors1 = graph.get(node1, {})
    neighbors2 = graph.get(node2, {})
    
    # Find common neighbors
    common = set(neighbors1.keys()) & set(neighbors2.keys())
    
    if not common:
        return 0.0
    
    # Sum weights from both sides to common neighbors
    score = 0.0
    for neighbor in common:
        weight1 = neighbors1.get(neighbor, 0)
        weight2 = neighbors2.get(neighbor, 0)
        # Average weight to avoid double counting
        score += (weight1 + weight2) / 2
    
    return score


def common_neighbors_multigraph(graph, node1, node2):
    """
    Common Neighbors for multigraphs with multiple edges between nodes.
    
    Counts the number of parallel edges to common neighbors,
    which can indicate stronger relationships.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> list of neighbors (with duplicates for parallel edges)
    
    Returns:
        int: Total number of shared connections including parallel edges
    """
    from collections import Counter
    
    neighbors1 = Counter(graph.get(node1, []))
    neighbors2 = Counter(graph.get(node2, []))
    
    # Find common neighbors
    common = set(neighbors1.keys()) & set(neighbors2.keys())
    
    # Sum the minimum multiplicity for each common neighbor
    score = 0
    for neighbor in common:
        # Take the minimum count to represent shared connections
        score += min(neighbors1[neighbor], neighbors2[neighbor])
    
    return score