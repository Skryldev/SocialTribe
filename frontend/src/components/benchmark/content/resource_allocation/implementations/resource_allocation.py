def resource_allocation(graph, node1, node2):
    """
    Resource Allocation link prediction algorithm.
    
    Measures similarity between two nodes by summing 1/degree(neighbor)
    for each common neighbor. Models resource flow where nodes with
    higher degree distribute their resources more thinly.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(min(deg(u), deg(v)))
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node (source)
        node2: Second node (target)
    
    Returns:
        float: Resource Allocation similarity score
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C', 'E'},
        ...     'C': {'A', 'B', 'D', 'E', 'F'},
        ...     'D': {'A', 'C'},
        ...     'E': {'B', 'C'},
        ...     'F': {'C'}
        ... }
        >>> resource_allocation(graph, 'A', 'B')
        0.5833...  # 1/degree(C) = 1/5 = 0.2
    """
    # Get neighbor sets for both nodes
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    # Optimization: iterate over the smaller neighbor set
    if len(neighbors1) > len(neighbors2):
        neighbors1, neighbors2 = neighbors2, neighbors1
    
    # Calculate resource allocation score
    score = 0.0
    
    for neighbor in neighbors1:
        if neighbor in neighbors2:
            # Get degree of common neighbor
            degree = len(graph.get(neighbor, set()))
            if degree > 0:
                # Add resource contribution: 1/degree
                score += 1.0 / degree
    
    return score


def resource_allocation_matrix(graph, nodes=None):
    """
    Compute Resource Allocation scores for all pairs of specified nodes.
    Useful for batch link prediction tasks.
    
    Time Complexity: O(|nodes|^2 * min(deg))
    Space Complexity: O(|nodes|^2)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to consider (default: all nodes)
    
    Returns:
        dict: Mapping of (node1, node2) -> score for all node pairs
    """
    if nodes is None:
        nodes = list(graph.keys())
    
    # Pre-compute degrees for efficiency
    degrees = {node: len(graph.get(node, set())) for node in graph}
    
    scores = {}
    n = len(nodes)
    
    for i in range(n):
        node1 = nodes[i]
        neighbors1 = graph.get(node1, set())
        
        for j in range(i + 1, n):
            node2 = nodes[j]
            
            # Skip if nodes are already connected
            if node2 in neighbors1:
                continue
            
            neighbors2 = graph.get(node2, set())
            
            # Find common neighbors efficiently
            if len(neighbors1) > len(neighbors2):
                smaller, larger = neighbors2, neighbors1
            else:
                smaller, larger = neighbors1, neighbors2
            
            score = sum(1.0 / degrees[neighbor] 
                       for neighbor in smaller 
                       if neighbor in larger and degrees[neighbor] > 0)
            
            scores[(node1, node2)] = score
            scores[(node2, node1)] = score  # Symmetric
    
    return scores


def top_k_links(graph, node, k=5, exclude_existing=True):
    """
    Find top-k most likely links for a given node using Resource Allocation.
    
    Time Complexity: O(V * min(deg))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Source node to find potential links for
        k: Number of top predictions to return
        exclude_existing: If True, exclude already existing links
    
    Returns:
        list: Tuples of (target_node, score) sorted by score descending
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A', 'D'}, 'C': {'A'}, 'D': {'B'}}
        >>> top_k_links(graph, 'A', k=2)
        [('D', 1.0), ...]
    """
    neighbors = graph.get(node, set())
    candidates = set(graph.keys()) - {node}
    
    if exclude_existing:
        candidates -= neighbors
    
    # Calculate scores for all candidates
    predictions = []
    for candidate in candidates:
        score = resource_allocation(graph, node, candidate)
        if score > 0:
            predictions.append((candidate, score))
    
    # Sort by score descending and return top-k
    predictions.sort(key=lambda x: x[1], reverse=True)
    return predictions[:k]


def resource_allocation_weighted(graph, node1, node2, 
                                 weight_attr='weight', 
                                 resource_func=None):
    """
    Weighted version of Resource Allocation for graphs with edge weights.
    
    Time Complexity: O(min(deg(u), deg(v)))
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        node1: First node
        node2: Second node
        weight_attr: Not used directly; graph structure determines weights
        resource_func: Optional function(degree, weight) to customize resource calculation.
                      Default: sum of weights / degree
    
    Returns:
        float: Weighted Resource Allocation score
    """
    neighbors1 = graph.get(node1, {})
    neighbors2 = graph.get(node2, {})
    
    # Default resource function: total weight / degree
    if resource_func is None:
        def resource_func(degree, total_weight):
            return total_weight / degree if degree > 0 else 0
    
    # Find common neighbors
    common = set(neighbors1.keys()) & set(neighbors2.keys())
    
    score = 0.0
    for neighbor in common:
        neighbor_edges = graph.get(neighbor, {})
        degree = len(neighbor_edges)
        total_weight = sum(neighbor_edges.values())
        
        if degree > 0:
            # Add weighted resource contribution
            w1 = neighbors1.get(neighbor, 0)
            w2 = neighbors2.get(neighbor, 0)
            edge_contribution = (w1 + w2) / 2
            score += edge_contribution * resource_func(degree, total_weight)
    
    return score


def resource_allocation_normalized(graph, node1, node2):
    """
    Normalized Resource Allocation score between 0 and 1.
    Normalizes by the sum of inverse degrees of all neighbors
    of both nodes.
    
    Time Complexity: O(deg(u) + deg(v))
    Space Complexity: O(deg(u) + deg(v))
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
    
    Returns:
        float: Normalized Resource Allocation score [0, 1]
    """
    neighbors1 = graph.get(node1, set())
    neighbors2 = graph.get(node2, set())
    
    # Calculate raw score
    common = neighbors1 & neighbors2
    raw_score = sum(1.0 / len(graph.get(n, set())) 
                   for n in common 
                   if len(graph.get(n, set())) > 0)
    
    # Calculate maximum possible score
    all_neighbors = neighbors1 | neighbors2
    max_score = sum(1.0 / len(graph.get(n, set())) 
                   for n in all_neighbors 
                   if len(graph.get(n, set())) > 0)
    
    if max_score == 0:
        return 0.0
    
    return raw_score / max_score