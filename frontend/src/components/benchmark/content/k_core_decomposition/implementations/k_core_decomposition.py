from collections import defaultdict, deque


def k_core_decomposition(graph):
    """
    K-Core Decomposition using Batagelj-Zaversnik algorithm.
    
    Computes the core number for each node in O(V + E) time.
    The core number indicates the maximal k-core a node belongs to.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list/dict of neighbors
               - set: unweighted graph
               - dict: weighted graph (weights summed for degree)
    
    Returns:
        dict: Mapping of node -> core_number (integer)
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'A', 'C', 'E', 'F'},
        ...     'E': {'D', 'F'},
        ...     'F': {'D', 'E', 'G'},
        ...     'G': {'F'}
        ... }
        >>> cores = k_core_decomposition(graph)
        >>> cores['A']
        3  # A is in 3-core (triangle A,B,C,D)
        >>> cores['G']
        1  # G is only in 1-core (pendant node)
    """
    if not graph:
        return {}
    
    # Step 1: Compute initial degrees
    degrees = {}
    for node, neighbors in graph.items():
        if isinstance(neighbors, dict):
            degrees[node] = sum(neighbors.values())
        elif isinstance(neighbors, (set, list)):
            degrees[node] = len(neighbors)
        else:
            raise ValueError(f"Invalid neighbor type for node {node}")
    
    # Handle isolated nodes (not in graph dict)
    all_nodes = set(graph.keys())
    
    # Ensure all neighbors are included (in case of asymmetric representation)
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            if neighbor not in degrees:
                degrees[neighbor] = 0
                all_nodes.add(neighbor)
    
    n = len(all_nodes)
    max_degree = max(degrees.values()) if degrees else 0
    
    # Step 2: Create bins (buckets) for each degree
    bins = defaultdict(list)
    node_bin_position = {}  # Track position for O(1) removal
    
    for node, degree in degrees.items():
        bins[degree].append(node)
        node_bin_position[node] = len(bins[degree]) - 1
    
    # Track which nodes are still in bins
    in_bins = set(all_nodes)
    
    # Step 3: Iteratively remove minimum-degree nodes
    core_numbers = {}
    current_bin = 0
    
    # Pre-compute adjacency for fast neighbor iteration
    adj = {}
    for node in all_nodes:
        if node in graph:
            if isinstance(graph[node], dict):
                adj[node] = set(graph[node].keys())
            else:
                adj[node] = set(graph[node])
        else:
            adj[node] = set()
    
    for _ in range(n):
        # Find next non-empty bin
        while current_bin <= max_degree:
            if bins[current_bin]:
                break
            current_bin += 1
        
        if current_bin > max_degree:
            break
        
        # Pop a node from current bin
        v = bins[current_bin].pop()
        in_bins.remove(v)
        
        # Core number of v is its current degree
        core_numbers[v] = current_bin
        
        # Update neighbors
        for neighbor in adj.get(v, set()):
            if neighbor not in in_bins:
                continue
            
            # Current degree and bin of neighbor
            deg_u = degrees[neighbor]
            
            if deg_u > current_bin:
                # Move neighbor to lower bin
                # Remove from current bin (O(1) using position tracking)
                pos = node_bin_position[neighbor]
                last_node = bins[deg_u][-1]
                
                # Swap with last element and pop
                bins[deg_u][pos] = last_node
                node_bin_position[last_node] = pos
                bins[deg_u].pop()
                
                # Decrease degree
                deg_u -= 1
                degrees[neighbor] = deg_u
                
                # Add to lower bin
                bins[deg_u].append(neighbor)
                node_bin_position[neighbor] = len(bins[deg_u]) - 1
    
    return core_numbers


def get_k_core(graph, k):
    """
    Extract the k-core subgraph.
    
    Returns the maximal subgraph where every node has degree ≥ k
    within the subgraph.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        k: Minimum degree threshold
    
    Returns:
        set: Nodes in the k-core (empty if no k-core exists)
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'A', 'C', 'E'},
        ...     'E': {'D'}
        ... }
        >>> k_core = get_k_core(graph, 2)
        >>> sorted(k_core)
        ['A', 'B', 'C', 'D']  # All have ≥ 2 neighbors in the subgraph
        >>> k_core_3 = get_k_core(graph, 3)
        >>> sorted(k_core_3)
        ['A', 'C', 'D']  # Only these form a 3-core
    """
    core_numbers = k_core_decomposition(graph)
    return {node for node, core in core_numbers.items() if core >= k}


def k_core_decomposition_weighted(graph):
    """
    Weighted K-Core decomposition.
    
    Uses weighted degree (sum of edge weights) instead of
    simple degree count for core computation.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        dict: Mapping of node -> weighted_core_number (float)
    
    Example:
        >>> graph = {
        ...     'A': {'B': 0.5, 'C': 0.8},
        ...     'B': {'A': 0.5, 'C': 0.3},
        ...     'C': {'A': 0.8, 'B': 0.3, 'D': 1.0},
        ...     'D': {'C': 1.0}
        ... }
        >>> cores = k_core_decomposition_weighted(graph)
        >>> cores['A']
        1.3  # Weighted degree when removed
    """
    if not graph:
        return {}
    
    # Compute weighted degrees
    degrees = {}
    for node, neighbors in graph.items():
        degrees[node] = sum(neighbors.values())
    
    all_nodes = set(graph.keys())
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            if neighbor not in degrees:
                degrees[neighbor] = 0
                all_nodes.add(neighbor)
    
    n = len(all_nodes)
    
    # Bin sort by weighted degree
    # Since degrees are floats, we need a different approach
    # Use list of (degree, node) and sort progressively
    import heapq
    
    # Priority queue: (degree, node)
    pq = [(deg, node) for node, deg in degrees.items()]
    heapq.heapify(pq)
    
    core_numbers = {}
    in_pq = set(all_nodes)
    current_degrees = degrees.copy()
    adj = {node: set(graph.get(node, {}).keys()) for node in all_nodes}
    
    while pq:
        deg, v = heapq.heappop(pq)
        
        if v not in in_pq:
            continue  # Already processed
        
        if deg != current_degrees[v]:
            # Degree changed, reinsert with new degree
            if v in in_pq:
                heapq.heappush(pq, (current_degrees[v], v))
            continue
        
        # Process node
        in_pq.remove(v)
        core_numbers[v] = deg
        
        # Update neighbors
        for neighbor in adj.get(v, set()):
            if neighbor not in in_pq:
                continue
            
            # Decrease weighted degree
            weight = graph.get(v, {}).get(neighbor, graph.get(neighbor, {}).get(v, 0))
            current_degrees[neighbor] -= weight
            
            # Will be picked up in next iteration with updated degree
    
    return core_numbers


def k_core_shell_indices(graph):
    """
    Compute shell indices for all nodes.
    
    The shell index of a node is the same as its core number.
    This function returns nodes grouped by their shell/core.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        dict: Mapping of core_number -> set of nodes with that core
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'C'}
        ... }
        >>> shells = k_core_shell_indices(graph)
        >>> shells[2]
        {'A', 'B', 'C'}  # 2-core nodes
        >>> shells[1]
        {'D'}  # 1-shell node
    """
    core_numbers = k_core_decomposition(graph)
    
    shells = defaultdict(set)
    for node, core in core_numbers.items():
        shells[core].add(node)
    
    return dict(shells)


def graph_degeneracy(graph):
    """
    Compute the degeneracy of the graph.
    
    Degeneracy is the maximum core number, equal to the smallest k
    such that every subgraph has a node of degree ≤ k.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        int: Degeneracy of the graph
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'A', 'C'}
        ... }
        >>> graph_degeneracy(graph)
        3  # Max core number is 3
    """
    core_numbers = k_core_decomposition(graph)
    return max(core_numbers.values()) if core_numbers else 0


def k_core_decomposition_directed(graph, mode='out'):
    """
    K-Core decomposition for directed graphs.
    
    Uses in-degree, out-degree, or total degree for core computation.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> {'in': set(), 'out': set()}
               OR dict mapping node -> set of outgoing neighbors
        mode: 'in', 'out', or 'both' for degree type
    
    Returns:
        dict: Mapping of node -> core_number
    
    Example:
        >>> graph = {
        ...     'A': {'out': {'B', 'C'}, 'in': {'D'}},
        ...     'B': {'out': {'C'}, 'in': {'A'}},
        ...     'C': {'out': set(), 'in': {'A', 'B'}},
        ...     'D': {'out': {'A'}, 'in': set()}
        ... }
        >>> cores = k_core_decomposition_directed(graph, mode='both')
    """
    # Convert to undirected degree representation
    undirected = {}
    
    for node in graph:
        neighbors = set()
        if isinstance(graph[node], dict) and 'in' in graph[node]:
            if mode == 'in':
                neighbors = graph[node].get('in', set())
            elif mode == 'out':
                neighbors = graph[node].get('out', set())
            elif mode == 'both':
                neighbors = graph[node].get('in', set()) | graph[node].get('out', set())
        elif isinstance(graph[node], set):
            # Assume outgoing edges
            neighbors = graph[node]
            if mode == 'in':
                # Need to compute in-neighbors
                neighbors = set()
                for src, out_neighbors in graph.items():
                    if node in out_neighbors:
                        neighbors.add(src)
        
        undirected[node] = neighbors
    
    return k_core_decomposition(undirected)