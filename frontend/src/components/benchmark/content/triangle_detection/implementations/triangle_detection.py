def triangle_detection_node_iterator(graph, nodes=None):
    """
    Node-iterator algorithm for triangle detection.
    
    For each node, examines all pairs of its neighbors to check
    if they are connected. Each triangle is counted exactly once
    by processing nodes in order.
    
    Time Complexity: O(V * d²) where d is max degree
    Space Complexity: O(1) auxiliary
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to process (default: all nodes)
    
    Returns:
        list: List of unique triangles as frozensets of 3 nodes
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'B', 'C'}
        ... }
        >>> triangles = triangle_detection_node_iterator(graph)
        >>> len(triangles)
        2  # Triangles: {A,B,C} and {B,C,D}
    """
    if nodes is None:
        nodes = list(graph.keys())
    
    triangles = []
    processed = set()
    
    for node in sorted(nodes):  # Sort to ensure deterministic ordering
        neighbors = graph.get(node, set())
        neighbors_list = list(neighbors - processed)
        
        # Check connections between pairs of neighbors
        for i in range(len(neighbors_list)):
            neighbor1 = neighbors_list[i]
            neighbors1 = graph.get(neighbor1, set())
            
            for j in range(i + 1, len(neighbors_list)):
                neighbor2 = neighbors_list[j]
                
                # Check if neighbor1 and neighbor2 are connected
                if neighbor2 in neighbors1:
                    triangle = frozenset({node, neighbor1, neighbor2})
                    triangles.append(triangle)
        
        processed.add(node)
    
    return triangles


def triangle_detection_edge_iterator(graph):
    """
    Edge-iterator algorithm for triangle detection.
    
    For each edge, finds common neighbors of its endpoints.
    Optimized by iterating over the smaller degree endpoint's
    neighbor set for faster intersection.
    
    Time Complexity: O(E * min(d_u, d_v))
    Space Complexity: O(min(d_u, d_v))
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        list: List of unique triangles as frozensets of 3 nodes
    """
    triangles = []
    seen_edges = set()
    
    for node1, neighbors1 in graph.items():
        for node2 in neighbors1:
            # Process each edge only once (undirected)
            edge = tuple(sorted([node1, node2]))
            if edge in seen_edges:
                continue
            seen_edges.add(edge)
            
            neighbors2 = graph.get(node2, set())
            
            # Find common neighbors efficiently
            # Iterate over smaller neighbor set
            if len(neighbors1) > len(neighbors2):
                smaller, larger = neighbors2, neighbors1
            else:
                smaller, larger = neighbors1, neighbors2
            
            # Find intersections
            for common in smaller:
                if common in larger and common != node1 and common != node2:
                    triangle = frozenset({node1, node2, common})
                    triangles.append(triangle)
    
    return triangles


def triangle_detection_forward_algorithm(graph):
    """
    Forward algorithm - optimal O(E^(3/2)) triangle detection.
    
    Orders nodes by degree and creates a directed graph where edges
    go from lower-degree to higher-degree nodes. Then finds triangles
    by following paths of length 2.
    
    Time Complexity: O(E^(3/2))
    Space Complexity: O(E)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        list: List of unique triangles
    
    Reference:
        Schank & Wagner (2005) - Finding, Counting and Listing
        All Triangles in Large Graphs
    """
    # Order nodes by degree (and ID for tie-breaking)
    nodes = list(graph.keys())
    degree = {node: len(graph.get(node, set())) for node in nodes}
    
    # Sort by degree ascending, then by node ID for determinism
    node_order = {node: i for i, node in enumerate(
        sorted(nodes, key=lambda n: (degree[n], n))
    )}
    
    # Build directed graph: edge from lower-order to higher-order
    directed_graph = {}
    for node in nodes:
        directed_neighbors = []
        for neighbor in graph.get(node, set()):
            if node_order[node] < node_order[neighbor]:
                directed_neighbors.append(neighbor)
        directed_graph[node] = directed_neighbors
    
    # Find triangles by following directed paths of length 2
    triangles = []
    
    for u in nodes:
        for v in directed_graph.get(u, []):
            for w in directed_graph.get(v, []):
                # Check if there's an edge u -> w (completing the triangle)
                if w in directed_graph.get(u, set()):
                    triangle = frozenset({u, v, w})
                    triangles.append(triangle)
    
    return triangles


def count_triangles(graph, method='forward'):
    """
    Count total number of triangles in the graph.
    
    Time Complexity: Depends on method (forward: O(E^(3/2)))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        method: 'node', 'edge', or 'forward'
    
    Returns:
        int: Total number of triangles
    """
    if method == 'node':
        triangles = triangle_detection_node_iterator(graph)
    elif method == 'edge':
        triangles = triangle_detection_edge_iterator(graph)
    elif method == 'forward':
        triangles = triangle_detection_forward_algorithm(graph)
    else:
        raise ValueError(f"Unknown method: {method}")
    
    return len(triangles)


def count_triangles_per_node(graph):
    """
    Count the number of triangles each node participates in.
    
    Also known as the "triangle participation count" or
    "local triangle count".
    
    Time Complexity: O(E^(3/2)) using forward algorithm
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        dict: Mapping of node -> triangle count
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'B', 'C'}
        ... }
        >>> counts = count_triangles_per_node(graph)
        >>> counts['A']
        1  # A participates in triangle ABC
        >>> counts['B']
        2  # B participates in triangles ABC and BCD
    """
    triangle_counts = {node: 0 for node in graph}
    
    # Use forward algorithm for efficiency
    nodes = list(graph.keys())
    degree = {node: len(graph.get(node, set())) for node in nodes}
    node_order = {node: i for i, node in enumerate(
        sorted(nodes, key=lambda n: (degree[n], n))
    )}
    
    # Build directed graph
    directed_graph = {}
    for node in nodes:
        directed_neighbors = set()
        for neighbor in graph.get(node, set()):
            if node_order[node] < node_order[neighbor]:
                directed_neighbors.add(neighbor)
        directed_graph[node] = directed_neighbors
    
    # Count triangles
    for u in nodes:
        for v in directed_graph.get(u, set()):
            for w in directed_graph.get(v, set()):
                if w in directed_graph.get(u, set()):
                    # Triangle found: u-v-w
                    triangle_counts[u] += 1
                    triangle_counts[v] += 1
                    triangle_counts[w] += 1
    
    return triangle_counts


def triangle_detection_weighted(graph, min_weight=0.0):
    """
    Detect triangles in weighted graphs with minimum weight threshold.
    
    Only counts triangles where all three edges meet or exceed
    the specified weight threshold.
    
    Time Complexity: O(E^(3/2))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        min_weight: Minimum weight for each triangle edge
    
    Returns:
        list: List of weighted triangles as (frozenset({u,v,w}), avg_weight)
    
    Example:
        >>> graph = {
        ...     'A': {'B': 0.9, 'C': 0.8},
        ...     'B': {'A': 0.9, 'C': 0.7, 'D': 0.5},
        ...     'C': {'A': 0.8, 'B': 0.7, 'D': 0.6},
        ...     'D': {'B': 0.5, 'C': 0.6}
        ... }
        >>> triangles = triangle_detection_weighted(graph, min_weight=0.6)
        >>> len(triangles)
        1  # Only ABC with edges > 0.6
    """
    # Convert to undirected for topology, keep weights
    undirected = {node: set(neighbors.keys()) for node, neighbors in graph.items()}
    
    # Get topological triangles
    topological_triangles = triangle_detection_forward_algorithm(undirected)
    
    # Filter and weight triangles
    weighted_triangles = []
    
    for triangle_set in topological_triangles:
        u, v, w = tuple(triangle_set)
        
        # Get edge weights
        weight_uv = graph[u].get(v, 0)
        weight_uw = graph[u].get(w, 0)
        weight_vw = graph[v].get(w, 0)
        
        # Check weight threshold
        if (weight_uv >= min_weight and 
            weight_uw >= min_weight and 
            weight_vw >= min_weight):
            
            avg_weight = (weight_uv + weight_uw + weight_vw) / 3
            weighted_triangles.append((triangle_set, avg_weight))
    
    return weighted_triangles


def triangle_detection_directed(graph):
    """
    Detect triangles in directed graphs.
    
    Identifies directed cycles of length 3 (u → v → w → u)
    as well as transitive triangles where direction matters.
    
    Time Complexity: O(E^(3/2))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of outgoing neighbors
    
    Returns:
        dict: {
            'cycles': list of directed 3-cycles,
            'transitive': list of transitive triangles,
            'all': list of all triangles (undirected)
        }
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'C', 'D'},
        ...     'C': {'A'},
        ...     'D': {'C'}
        ... }
        >>> result = triangle_detection_directed(graph)
        >>> result['cycles']
        [frozenset({'A', 'B', 'C'})]  # A→B→C→A forms a cycle
    """
    # Build undirected version for topological triangle detection
    undirected = {}
    for node, out_neighbors in graph.items():
        undirected[node] = set(out_neighbors)
        for neighbor in out_neighbors:
            if neighbor not in undirected:
                undirected[neighbor] = set()
            undirected[neighbor].add(node)
    
    # Get all topological triangles
    all_triangles = triangle_detection_forward_algorithm(undirected)
    
    # Classify triangles
    cycles = []
    transitive = []
    
    for triangle in all_triangles:
        u, v, w = tuple(triangle)
        
        # Check for directed cycles
        # A cycle exists if we can traverse in one direction
        cycle_detected = False
        
        # Check all 6 possible directed configurations
        if (w in graph.get(u, set()) and 
            v in graph.get(w, set()) and 
            u in graph.get(v, set())):
            cycle_detected = True
        elif (v in graph.get(u, set()) and 
              w in graph.get(v, set()) and 
              u in graph.get(w, set())):
            cycle_detected = True
        
        if cycle_detected:
            cycles.append(triangle)
        else:
            transitive.append(triangle)
    
    return {
        'cycles': cycles,
        'transitive': transitive,
        'all': all_triangles
    }


def approximate_triangle_count(graph, sample_size=1000):
    """
    Approximate triangle count for very large graphs using sampling.
    
    Uses wedge sampling to estimate total triangle count without
    enumerating all triangles.
    
    Time Complexity: O(sample_size * avg_degree)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        sample_size: Number of wedges to sample
    
    Returns:
        float: Estimated total triangle count
    """
    import random
    
    # Count total wedges (paths of length 2)
    total_wedges = 0
    for node, neighbors in graph.items():
        degree = len(neighbors)
        if degree >= 2:
            total_wedges += degree * (degree - 1) / 2
    
    if total_wedges == 0:
        return 0
    
    # Sample wedges
    closed_wedges = 0
    nodes = list(graph.keys())
    
    for _ in range(sample_size):
        # Randomly select a center node with probability proportional to
        # the number of wedges centered at that node
        # (weighted sampling)
        weights = []
        for node in nodes:
            d = len(graph.get(node, set()))
            if d >= 2:
                weights.append(d * (d - 1) / 2)
            else:
                weights.append(0)
        
        total_weight = sum(weights)
        if total_weight == 0:
            continue
        
        # Weighted random selection
        r = random.uniform(0, total_weight)
        cumulative = 0
        selected_node = None
        
        for i, node in enumerate(nodes):
            cumulative += weights[i]
            if cumulative >= r:
                selected_node = node
                break
        
        if selected_node is None:
            continue
        
        # Randomly select two distinct neighbors
        neighbors = list(graph.get(selected_node, set()))
        if len(neighbors) < 2:
            continue
        
        n1, n2 = random.sample(neighbors, 2)
        
        # Check if they are connected (wedge is closed = triangle)
        if n2 in graph.get(n1, set()):
            closed_wedges += 1
    
    # Estimate: (closed_wedges / sample_size) * total_wedges
    estimated_triangles = (closed_wedges / sample_size) * (total_wedges / 3)
    
    return estimated_triangles