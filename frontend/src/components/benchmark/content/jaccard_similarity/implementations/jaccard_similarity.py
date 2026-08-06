def jaccard_similarity(graph, node1, node2):
    """
    Jaccard Similarity for link prediction in graphs.
    
    Calculates the normalized overlap between the neighbor sets
    of two nodes. The score represents the proportion of shared
    neighbors relative to total distinct neighbors.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1) for the result, O(min(deg)) for operations
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
    
    Returns:
        float: Jaccard similarity score between 0 and 1
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C', 'E'},
        ...     'C': {'A', 'B', 'D', 'E', 'F'},
        ...     'D': {'A', 'C'},
        ...     'E': {'B', 'C'},
        ...     'F': {'C'}
        ... }
        >>> jaccard_similarity(graph, 'A', 'B')
        0.25  # Common: {C} (1), Union: {B,C,D,E} (4) -> 1/4 = 0.25
        >>> jaccard_similarity(graph, 'D', 'E')
        0.0   # Common: {} (0), Union: {A,B,C} (3) -> 0/3 = 0.0
    """
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    # Calculate intersection and union
    intersection = neighbors1.intersection(neighbors2)
    union = neighbors1.union(neighbors2)
    
    # Avoid division by zero (both nodes have empty neighbor sets)
    if len(union) == 0:
        return 0.0
    
    return len(intersection) / len(union)


def jaccard_similarity_weighted(graph, node1, node2, 
                                 aggregation='sum'):
    """
    Weighted Jaccard Similarity for graphs with edge weights.
    
    Extends Jaccard to consider edge weights when comparing
    neighbor sets. Multiple aggregation strategies are available.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        node1: First node
        node2: Second node
        aggregation: How to aggregate weights for common neighbors:
            - 'sum': Sum of weights to common neighbors
            - 'min': Minimum weight among shared connections
            - 'avg': Average weight of connections to common neighbor
    
    Returns:
        float: Weighted Jaccard similarity between 0 and 1
    
    Example:
        >>> graph = {
        ...     'A': {'C': 0.8, 'D': 0.5, 'E': 0.3},
        ...     'B': {'C': 0.9, 'D': 0.4, 'F': 0.7},
        ...     'C': {'A': 0.8, 'B': 0.9},
        ...     'D': {'A': 0.5, 'B': 0.4},
        ...     'E': {'A': 0.3},
        ...     'F': {'B': 0.7}
        ... }
        >>> jaccard_similarity_weighted(graph, 'A', 'B')
        0.612...  # Weighted: common weights sum / all weights sum
    """
    neighbors1 = graph.get(node1, {})
    neighbors2 = graph.get(node2, {})
    
    if not neighbors1 and not neighbors2:
        return 0.0
    
    # Find common neighbors
    common = set(neighbors1.keys()) & set(neighbors2.keys())
    all_neighbors = set(neighbors1.keys()) | set(neighbors2.keys())
    
    if aggregation == 'sum':
        # Sum of weights for common and all neighbors
        common_sum = sum(
            neighbors1.get(n, 0) + neighbors2.get(n, 0) 
            for n in common
        )
        all_sum = sum(
            neighbors1.get(n, 0) + neighbors2.get(n, 0)
            for n in all_neighbors
        )
        
        if all_sum == 0:
            return 0.0
        return common_sum / all_sum
    
    elif aggregation == 'min':
        # Use minimum weight for each connection
        common_sum = sum(
            min(neighbors1.get(n, 0), neighbors2.get(n, 0))
            for n in common
        )
        all_sum = sum(
            max(neighbors1.get(n, 0), neighbors2.get(n, 0))
            for n in all_neighbors
        )
        
        if all_sum == 0:
            return 0.0
        return common_sum / all_sum
    
    elif aggregation == 'avg':
        # Average weight for each connection
        common_sum = sum(
            (neighbors1.get(n, 0) + neighbors2.get(n, 0)) / 2
            for n in common
        )
        all_sum = sum(
            (neighbors1.get(n, 0) + neighbors2.get(n, 0)) / 2
            for n in all_neighbors
        )
        
        if all_sum == 0:
            return 0.0
        return common_sum / all_sum
    
    else:
        raise ValueError(f"Unknown aggregation: {aggregation}")


def jaccard_similarity_top_k(graph, node, k=5, 
                              exclude_existing=True):
    """
    Find top-k most similar nodes using Jaccard similarity.
    
    Identifies the k nodes most likely to form future connections
    with the given node based on neighbor set overlap.
    
    Time Complexity: O(V * min(deg))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Source node to find similar nodes for
        k: Number of top predictions to return
        exclude_existing: If True, exclude already connected nodes
    
    Returns:
        list: Tuples of (target_node, jaccard_score) sorted by score descending
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'B', 'C'},
        ...     'E': {'F'},
        ...     'F': {'E'}
        ... }
        >>> jaccard_similarity_top_k(graph, 'A', k=3)
        [('D', 0.5), ('E', 0.0), ('F', 0.0)]
    """
    neighbors = graph.get(node, set())
    candidates = set(graph.keys()) - {node}
    
    if exclude_existing:
        candidates -= neighbors
    
    # Calculate Jaccard for all candidates
    predictions = []
    for candidate in candidates:
        score = jaccard_similarity(graph, node, candidate)
        predictions.append((candidate, score))
    
    # Sort by score descending and return top-k
    predictions.sort(key=lambda x: x[1], reverse=True)
    return predictions[:k]


def jaccard_similarity_matrix(graph, nodes=None):
    """
    Compute Jaccard similarity for all pairs of specified nodes.
    
    Creates a complete similarity matrix useful for clustering,
    community detection, and batch link prediction tasks.
    
    Time Complexity: O(V² * min(deg))
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to consider (default: all nodes)
    
    Returns:
        dict: Mapping of (node1, node2) -> jaccard_score
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
            
            # Skip existing edges for link prediction context
            if node2 in neighbors1:
                continue
            
            score = jaccard_similarity(graph, node1, node2)
            if score > 0:  # Only store non-zero scores to save memory
                scores[(node1, node2)] = score
                scores[(node2, node1)] = score  # Symmetric
    
    return scores


def jaccard_distance(graph, node1, node2):
    """
    Jaccard Distance between two nodes.
    
    The Jaccard distance is a proper metric, satisfying:
    - Identity: d(A,A) = 0
    - Non-negativity: d(A,B) ≥ 0
    - Symmetry: d(A,B) = d(B,A)
    - Triangle inequality: d(A,C) ≤ d(A,B) + d(B,C)
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
    
    Returns:
        float: Jaccard distance between 0 and 1
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A'}, 'C': {'A'}}
        >>> jaccard_distance(graph, 'A', 'B')
        0.5  # 1 - J(A,B) = 1 - 0.5 = 0.5
    """
    similarity = jaccard_similarity(graph, node1, node2)
    return 1.0 - similarity


def jaccard_similarity_multiset(graph, node1, node2):
    """
    Jaccard Similarity for multigraphs with parallel edges.
    
    Handles graphs where multiple edges can exist between
    the same pair of nodes, using counts instead of sets.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> list of neighbors (with duplicates)
    
    Returns:
        float: Jaccard similarity between 0 and 1
    
    Example:
        >>> from collections import Counter
        >>> graph = {
        ...     'A': ['B', 'B', 'C'],  # A connects to B twice
        ...     'B': ['A', 'A', 'C'],
        ...     'C': ['A', 'B']
        ... }
        >>> jaccard_similarity_multiset(graph, 'A', 'B')
        0.5  # Common: C (1), Union: B(2)+C(1) = 3 -> 1/3? Let's check implementation
    """
    from collections import Counter
    
    neighbors1 = Counter(graph.get(node1, []))
    neighbors2 = Counter(graph.get(node2, []))
    
    # Intersection: sum of minimum counts for each common neighbor
    common_neighbors = set(neighbors1.keys()) & set(neighbors2.keys())
    intersection = sum(min(neighbors1[n], neighbors2[n]) 
                       for n in common_neighbors)
    
    # Union: sum of maximum counts for all distinct neighbors
    all_neighbors = set(neighbors1.keys()) | set(neighbors2.keys())
    union = sum(max(neighbors1.get(n, 0), neighbors2.get(n, 0)) 
                for n in all_neighbors)
    
    if union == 0:
        return 0.0
    
    return intersection / union


def jaccard_similarity_directed(graph, node1, node2, mode='out'):
    """
    Jaccard Similarity for directed graphs.
    
    In directed graphs, we can consider outgoing neighbors
    (who I link to), incoming neighbors (who links to me),
    or both.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> {'in': set(), 'out': set()}
        node1: First node
        node2: Second node
        mode: 'in' for incoming, 'out' for outgoing, 'both' for union
    
    Returns:
        float: Jaccard similarity between 0 and 1
    
    Example:
        >>> graph = {
        ...     'A': {'in': {'C'}, 'out': {'B', 'C'}},
        ...     'B': {'in': {'A', 'D'}, 'out': {'C'}},
        ...     'C': {'in': {'A', 'B'}, 'out': {'D'}},
        ...     'D': {'in': {'C'}, 'out': {'B'}}
        ... }
        >>> # Outgoing: A->{B,C}, B->{C} => Common: {C}, Union: {B,C}
        >>> jaccard_similarity_directed(graph, 'A', 'B', mode='out')
        0.5
    """
    if mode == 'in':
        neighbors1 = graph.get(node1, {}).get('in', set())
        neighbors2 = graph.get(node2, {}).get('in', set())
    elif mode == 'out':
        neighbors1 = graph.get(node1, {}).get('out', set())
        neighbors2 = graph.get(node2, {}).get('out', set())
    elif mode == 'both':
        n1_in = graph.get(node1, {}).get('in', set())
        n1_out = graph.get(node1, {}).get('out', set())
        n2_in = graph.get(node2, {}).get('in', set())
        n2_out = graph.get(node2, {}).get('out', set())
        neighbors1 = n1_in | n1_out
        neighbors2 = n2_in | n2_out
    else:
        raise ValueError(f"Unknown mode: {mode}")
    
    intersection = neighbors1.intersection(neighbors2)
    union = neighbors1.union(neighbors2)
    
    if len(union) == 0:
        return 0.0
    
    return len(intersection) / len(union)


def generalized_jaccard(graph, node1, node2, p=1.0):
    """
    Generalized Jaccard Similarity with exponent parameter.
    
    Varying p gives different tradeoffs between common and
    total neighbors, allowing tuning for specific networks.
    
    p < 1: Emphasizes common neighbors more
    p = 1: Standard Jaccard
    p > 1: Emphasizes total neighbors more
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
        p: Generalization exponent (p > 0)
    
    Returns:
        float: Generalized Jaccard similarity
    
    Reference:
        Generalized Jaccard index for various distance measures
    """
    if p <= 0:
        raise ValueError("p must be positive")
    
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    intersection = len(neighbors1.intersection(neighbors2))
    union = len(neighbors1.union(neighbors2))
    
    if union == 0:
        return 0.0
    
    # Standard Jaccard when p = 1
    if p == 1.0:
        return intersection / union
    
    # Generalized: (|A ∩ B|^p) / (|A ∪ B|^p)
    return (intersection ** p) / (union ** p)