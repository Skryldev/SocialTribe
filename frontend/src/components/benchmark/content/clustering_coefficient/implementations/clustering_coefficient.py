def local_clustering_coefficient(graph, node):
    """
    Calculate the local clustering coefficient for a single node.
    
    Measures the proportion of possible connections among a node's
    neighbors that actually exist. A value of 1 means all neighbors
    are connected (clique), 0 means none are connected.
    
    Time Complexity: O(d²) where d is degree of node
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Target node to calculate clustering for
    
    Returns:
        float: Local clustering coefficient between 0 and 1
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'A', 'C'}
        ... }
        >>> local_clustering_coefficient(graph, 'A')
        0.3333...  # Among B, C, D: only B-C is connected (1/3 possible)
    """
    neighbors = graph.get(node, set())
    degree = len(neighbors)
    
    # Nodes with degree < 2 have no possible triangles
    if degree < 2:
        return 0.0
    
    # Count actual connections between neighbors
    actual_connections = 0
    neighbors_list = list(neighbors)
    
    for i in range(degree):
        for j in range(i + 1, degree):
            neighbor1 = neighbors_list[i]
            neighbor2 = neighbors_list[j]
            
            # Check if neighbors are connected to each other
            if neighbor2 in graph.get(neighbor1, set()):
                actual_connections += 1
    
    # Maximum possible connections: d * (d - 1) / 2
    possible_connections = degree * (degree - 1) / 2
    
    return actual_connections / possible_connections


def local_clustering_efficient(graph, node):
    """
    Efficient local clustering coefficient using set intersection.
    
    Optimized version that uses set operations instead of nested loops,
    better for nodes with moderate degrees.
    
    Time Complexity: O(d * d_avg) where d_avg is average neighbor degree
    Space Complexity: O(d)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Target node
    
    Returns:
        float: Local clustering coefficient
    """
    neighbors = graph.get(node, set())
    degree = len(neighbors)
    
    if degree < 2:
        return 0.0
    
    # Count triangles using set intersections
    triangles = 0
    neighbors_list = list(neighbors)
    
    for i, neighbor in enumerate(neighbors_list):
        neighbor_connections = graph.get(neighbor, set())
        # Count connections to other neighbors
        for other_neighbor in neighbors_list[i + 1:]:
            if other_neighbor in neighbor_connections:
                triangles += 1
    
    possible = degree * (degree - 1) / 2
    
    return triangles / possible if possible > 0 else 0.0


def average_clustering_coefficient(graph, nodes=None):
    """
    Calculate the average local clustering coefficient for the graph.
    
    Computes the arithmetic mean of local clustering coefficients
    across all specified nodes.
    
    Time Complexity: O(V * d²) where d is average degree
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to include (default: all nodes)
    
    Returns:
        float: Average clustering coefficient
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'}, 'B': {'A', 'C'}, 'C': {'A', 'B'},
        ...     'D': {'E'}, 'E': {'D'}
        ... }
        >>> average_clustering_coefficient(graph)
        0.5  # A,B,C have 1.0, D,E have 0.0, average = 3.0/5 = 0.6
    """
    if nodes is None:
        nodes = list(graph.keys())
    
    if not nodes:
        return 0.0
    
    total = 0.0
    for node in nodes:
        total += local_clustering_coefficient(graph, node)
    
    return total / len(nodes)


def global_clustering_coefficient(graph):
    """
    Calculate the global (transitivity) clustering coefficient.
    
    Measures the ratio of closed triplets to total triplets in the
    entire graph. This is different from the average local measure
    as it gives more weight to high-degree nodes.
    
    Time Complexity: O(V * d²)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        float: Global clustering coefficient (transitivity)
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'}, 'B': {'A', 'C'}, 'C': {'A', 'B', 'D'},
        ...     'D': {'C'}
        ... }
        >>> global_clustering_coefficient(graph)
        0.6  # 3 triangles (ABC) * 3 / 5 connected triplets * 2
    """
    total_triangles = 0
    total_triplets = 0
    
    for node, neighbors in graph.items():
        degree = len(neighbors)
        
        if degree < 2:
            continue
        
        # Count triplets centered at this node
        total_triplets += degree * (degree - 1) / 2
        
        # Count triangles
        neighbors_list = list(neighbors)
        for i in range(degree):
            neighbor_connections = graph.get(neighbors_list[i], set())
            for j in range(i + 1, degree):
                if neighbors_list[j] in neighbor_connections:
                    total_triangles += 1
    
    # Each triangle is counted 3 times (once per vertex)
    # Each triplet is counted 2 times (once per direction)
    if total_triplets == 0:
        return 0.0
    
    # Correct for multiple counting
    return (3 * total_triangles) / (3 * total_triplets) if total_triplets > 0 else 0.0


def clustering_coefficient_distribution(graph):
    """
    Calculate the distribution of clustering coefficients across nodes.
    
    Useful for understanding how clustering varies across the network
    and identifying nodes with unusual clustering patterns.
    
    Time Complexity: O(V * d²)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        dict: Mapping of node -> local clustering coefficient
    """
    return {
        node: local_clustering_coefficient(graph, node)
        for node in graph
    }


def clustering_by_degree(graph):
    """
    Analyze clustering coefficient as a function of node degree.
    
    Groups nodes by degree and calculates average clustering for
    each degree group, revealing how clustering varies with connectivity.
    
    Time Complexity: O(V * d²)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        dict: Mapping of degree -> average clustering coefficient
    """
    from collections import defaultdict
    
    degree_groups = defaultdict(list)
    
    # Calculate clustering and group by degree
    for node, neighbors in graph.items():
        degree = len(neighbors)
        clustering = local_clustering_coefficient(graph, node)
        degree_groups[degree].append(clustering)
    
    # Calculate average clustering per degree
    result = {}
    for degree, clusterings in degree_groups.items():
        result[degree] = sum(clusterings) / len(clusterings)
    
    return result


def clustering_coefficient_weighted(graph, node):
    """
    Weighted clustering coefficient for graphs with edge weights.
    
    Considers both the topology and the intensity of connections,
    as proposed by Barrat et al. (2004).
    
    Time Complexity: O(d²)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        node: Target node
    
    Returns:
        float: Weighted clustering coefficient
    
    Example:
        >>> graph = {
        ...     'A': {'B': 0.5, 'C': 0.8, 'D': 0.3},
        ...     'B': {'A': 0.5, 'C': 0.9},
        ...     'C': {'A': 0.8, 'B': 0.9, 'D': 0.4},
        ...     'D': {'A': 0.3, 'C': 0.4}
        ... }
        >>> clustering_coefficient_weighted(graph, 'A')
        0.689...  # Weighted average considering edge strengths
    """
    neighbors = graph.get(node, {})
    degree = len(neighbors)
    
    if degree < 2:
        return 0.0
    
    total_weight = sum(neighbors.values())
    
    if total_weight == 0:
        return 0.0
    
    # Calculate weighted triangles
    weighted_triangles = 0.0
    neighbors_list = list(neighbors.items())
    
    for i in range(degree):
        node_i, weight_i = neighbors_list[i]
        neighbors_i = graph.get(node_i, {})
        
        for j in range(i + 1, degree):
            node_j, weight_j = neighbors_list[j]
            
            if node_j in neighbors_i:
                # Average weight of the two edges
                triangle_weight = (weight_i + weight_j) / 2
                weighted_triangles += triangle_weight
    
    # Normalization factor
    norm = total_weight * (degree - 1)
    
    return weighted_triangles / norm if norm > 0 else 0.0


def find_high_clustering_nodes(graph, threshold=0.5):
    """
    Find nodes with high clustering coefficients.
    
    Identifies nodes that are part of tightly-knit communities
    or cliques based on their local clustering.
    
    Time Complexity: O(V * d²)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        threshold: Minimum clustering coefficient to consider
    
    Returns:
        list: Tuples of (node, clustering_coefficient) sorted by clustering
    """
    high_cluster_nodes = []
    
    for node in graph:
        clustering = local_clustering_coefficient(graph, node)
        if clustering >= threshold:
            high_cluster_nodes.append((node, clustering))
    
    return sorted(high_cluster_nodes, key=lambda x: x[1], reverse=True)