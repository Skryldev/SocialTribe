def floyd_warshall(graph):
    """
    Floyd-Warshall algorithm for all-pairs shortest paths.
    
    Computes the shortest path between every pair of nodes in
    a weighted graph. Handles negative edge weights and detects
    negative cycles.
    
    Time Complexity: O(V³)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
               OR 2D list (adjacency matrix) where graph[i][j] = weight
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
            - distances: Dict mapping (i,j) -> shortest distance
            - predecessors: Dict mapping (i,j) -> next node on path
            - has_negative_cycle: True if negative cycle detected
    
    Example:
        >>> graph = {
        ...     'A': {'B': 3, 'C': 8},
        ...     'B': {'C': 2, 'D': 5},
        ...     'C': {'D': 1},
        ...     'D': {'A': 2}
        ... }
        >>> dist, pred, has_cycle = floyd_warshall(graph)
        >>> dist[('A', 'D')]
        6  # A->B (3) + B->C (2) + C->D (1) = 6
    """
    # Handle matrix input
    if isinstance(graph, list):
        return _floyd_warshall_matrix(graph)
    
    # Handle adjacency dict input
    return _floyd_warshall_dict(graph)


def _floyd_warshall_dict(graph):
    """Floyd-Warshall for adjacency dict format."""
    # Collect all nodes
    nodes = set(graph.keys())
    for neighbors in graph.values():
        nodes.update(neighbors.keys())
    
    nodes = sorted(list(nodes))  # Sort for deterministic ordering
    n = len(nodes)
    
    # Map nodes to indices
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    idx_to_node = {i: node for i, node in enumerate(nodes)}
    
    # Initialize distance and predecessor matrices
    INF = float('inf')
    dist = [[INF] * n for _ in range(n)]
    pred = [[None] * n for _ in range(n)]
    
    # Set diagonal and direct edges
    for i in range(n):
        dist[i][i] = 0
        pred[i][i] = None
    
    for u, neighbors in graph.items():
        i = node_to_idx[u]
        for v, weight in neighbors.items():
            j = node_to_idx[v]
            dist[i][j] = weight
            pred[i][j] = j  # Next node on path from i to j is j itself
    
    # Floyd-Warshall core
    for k in range(n):
        for i in range(n):
            if dist[i][k] == INF:
                continue
            for j in range(n):
                if dist[k][j] == INF:
                    continue
                
                new_dist = dist[i][k] + dist[k][j]
                if new_dist < dist[i][j]:
                    dist[i][j] = new_dist
                    pred[i][j] = pred[i][k]  # Path goes through k
    
    # Check for negative cycles
    has_negative_cycle = any(dist[i][i] < 0 for i in range(n))
    
    # Convert to dict format with original node labels
    dist_dict = {}
    pred_dict = {}
    
    for i in range(n):
        for j in range(n):
            node_i = idx_to_node[i]
            node_j = idx_to_node[j]
            
            dist_dict[(node_i, node_j)] = dist[i][j]
            
            if pred[i][j] is not None:
                pred_dict[(node_i, node_j)] = idx_to_node[pred[i][j]]
            else:
                pred_dict[(node_i, node_j)] = None
    
    return dist_dict, pred_dict, has_negative_cycle


def _floyd_warshall_matrix(matrix):
    """
    Floyd-Warshall for adjacency matrix input.
    
    Args:
        matrix: 2D list where matrix[i][j] = weight of edge (i,j),
                float('inf') for no edge, 0 for diagonal
    
    Returns:
        tuple: (dist_matrix, pred_matrix, has_negative_cycle)
    """
    n = len(matrix)
    INF = float('inf')
    
    # Make a deep copy to avoid modifying input
    dist = [row[:] for row in matrix]
    
    # Initialize predecessor matrix
    pred = [[None] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j and matrix[i][j] < INF:
                pred[i][j] = j
    
    # Floyd-Warshall core
    for k in range(n):
        for i in range(n):
            if dist[i][k] == INF:
                continue
            for j in range(n):
                if dist[k][j] == INF:
                    continue
                
                new_dist = dist[i][k] + dist[k][j]
                if new_dist < dist[i][j]:
                    dist[i][j] = new_dist
                    pred[i][j] = pred[i][k]
    
    # Check for negative cycles
    has_negative_cycle = any(dist[i][i] < 0 for i in range(n))
    
    return dist, pred, has_negative_cycle


def floyd_warshall_path(predecessors, start, end):
    """
    Reconstruct the shortest path from start to end.
    
    Uses the predecessor matrix from Floyd-Warshall to trace
    the actual path between two nodes.
    
    Time Complexity: O(V) for path of length V
    Space Complexity: O(V)
    
    Args:
        predecessors: Dict mapping (i,j) -> next node on path
        start: Starting node
        end: Ending node
    
    Returns:
        list: Path from start to end (empty if no path exists)
    
    Example:
        >>> graph = {'A': {'B': 3, 'C': 8}, 'B': {'C': 2, 'D': 5},
        ...          'C': {'D': 1}, 'D': {'A': 2}}
        >>> dist, pred, _ = floyd_warshall(graph)
        >>> floyd_warshall_path(pred, 'A', 'D')
        ['A', 'B', 'C', 'D']
    """
    if (start, end) not in predecessors:
        return []
    
    if predecessors[(start, end)] is None and start != end:
        return []  # No path exists
    
    path = [start]
    current = start
    
    while current != end:
        next_node = predecessors.get((current, end))
        if next_node is None:
            return []  # Path broken
        path.append(next_node)
        current = next_node
        
        # Safety: avoid infinite loop in case of cycle
        if len(path) > len(predecessors) + 1:
            break
    
    return path


def floyd_warshall_transitive_closure(graph):
    """
    Compute transitive closure using Floyd-Warshall.
    
    Determines reachability between all pairs of nodes,
    regardless of path cost. This is the boolean version
    of the algorithm.
    
    Time Complexity: O(V³)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
    
    Returns:
        dict: Mapping (i,j) -> True if j is reachable from i
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'C'}, 'C': {'D'}, 'D': set()}
        >>> closure = floyd_warshall_transitive_closure(graph)
        >>> closure[('A', 'D')]
        True  # A can reach D through B and C
        >>> closure[('D', 'A')]
        False  # D cannot reach A
    """
    nodes = sorted(list(graph.keys()))
    n = len(nodes)
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    idx_to_node = {i: node for i, node in enumerate(nodes)}
    
    # Initialize reachability matrix
    reachable = [[False] * n for _ in range(n)]
    
    # Each node can reach itself
    for i in range(n):
        reachable[i][i] = True
    
    # Direct edges
    for u, neighbors in graph.items():
        i = node_to_idx[u]
        for v in neighbors:
            j = node_to_idx[v]
            reachable[i][j] = True
    
    # Floyd-Warshall for transitive closure
    for k in range(n):
        for i in range(n):
            if not reachable[i][k]:
                continue
            for j in range(n):
                if reachable[k][j]:
                    reachable[i][j] = True
    
    # Convert to dict
    result = {}
    for i in range(n):
        for j in range(n):
            node_i = idx_to_node[i]
            node_j = idx_to_node[j]
            result[(node_i, node_j)] = reachable[i][j]
    
    return result


def floyd_warshall_minimax(graph):
    """
    Minimax path: find path minimizing the maximum edge weight.
    
    Also known as the bottleneck path or widest path problem variant.
    Uses max instead of + and min instead of min in the DP recurrence.
    
    Time Complexity: O(V³)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        dict: Mapping (i,j) -> minimax distance
    
    Example:
        >>> graph = {
        ...     'A': {'B': 5, 'C': 3},
        ...     'B': {'D': 2},
        ...     'C': {'B': 1, 'D': 6},
        ...     'D': {}
        ... }
        >>> mm = floyd_warshall_minimax(graph)
        >>> mm[('A', 'D')]
        5  # Path A->B->D: max(5,2) = 5 vs A->C->B->D: max(3,1,2) = 3
           # Minimax = min(5, 3) = 3
    """
    nodes = sorted(list(graph.keys()))
    n = len(nodes)
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    idx_to_node = {i: node for i, node in enumerate(nodes)}
    
    INF = float('inf')
    
    # Initialize: bottleneck[i][j] = min over paths of max edge on path
    bottleneck = [[INF] * n for _ in range(n)]
    
    for i in range(n):
        bottleneck[i][i] = 0
    
    for u, neighbors in graph.items():
        i = node_to_idx[u]
        for v, weight in neighbors.items():
            j = node_to_idx[v]
            bottleneck[i][j] = weight
    
    # Floyd-Warshall adapted for minimax
    for k in range(n):
        for i in range(n):
            if bottleneck[i][k] == INF:
                continue
            for j in range(n):
                if bottleneck[k][j] == INF:
                    continue
                
                # The bottleneck of path i->k->j is max(bottleneck[i][k], bottleneck[k][j])
                path_bottleneck = max(bottleneck[i][k], bottleneck[k][j])
                
                # Minimax: we want the minimum bottleneck among all paths
                if path_bottleneck < bottleneck[i][j]:
                    bottleneck[i][j] = path_bottleneck
    
    # Convert to dict
    result = {}
    for i in range(n):
        for j in range(n):
            node_i = idx_to_node[i]
            node_j = idx_to_node[j]
            result[(node_i, node_j)] = bottleneck[i][j]
    
    return result


def floyd_warshall_maximin(graph):
    """
    Maximin path: find path maximizing the minimum edge weight.
    
    Useful for finding the path with highest capacity in
    network flow problems (widest path problem).
    
    Time Complexity: O(V³)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        dict: Mapping (i,j) -> maximin distance
    
    Example:
        >>> graph = {
        ...     'A': {'B': 5, 'C': 3},
        ...     'B': {'D': 2},
        ...     'C': {'B': 6, 'D': 1},
        ...     'D': {}
        ... }
        >>> mm = floyd_warshall_maximin(graph)
        >>> mm[('A', 'D')]
        2  # Path A->C->B->D: min(3,6,2) = 2
           # Path A->B->D: min(5,2) = 2
    """
    nodes = sorted(list(graph.keys()))
    n = len(nodes)
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    idx_to_node = {i: node for i, node in enumerate(nodes)}
    
    # Initialize with 0 (minimum capacity)
    capacity = [[0] * n for _ in range(n)]
    
    for i in range(n):
        capacity[i][i] = float('inf')  # Infinite capacity to self
    
    for u, neighbors in graph.items():
        i = node_to_idx[u]
        for v, weight in neighbors.items():
            j = node_to_idx[v]
            capacity[i][j] = weight
    
    # Floyd-Warshall adapted for maximin
    for k in range(n):
        for i in range(n):
            if capacity[i][k] == 0:
                continue
            for j in range(n):
                if capacity[k][j] == 0:
                    continue
                
                # The capacity of path i->k->j is min(capacity[i][k], capacity[k][j])
                path_capacity = min(capacity[i][k], capacity[k][j])
                
                # Maximin: we want the maximum minimum capacity among all paths
                if path_capacity > capacity[i][j]:
                    capacity[i][j] = path_capacity
    
    # Convert to dict
    result = {}
    for i in range(n):
        for j in range(n):
            node_i = idx_to_node[i]
            node_j = idx_to_node[j]
            result[(node_i, node_j)] = capacity[i][j]
    
    return result


def floyd_warshall_optimized(graph):
    """
    Optimized Floyd-Warshall with cache-friendly memory access.
    
    Reorders loops for better cache utilization and includes
    practical optimizations for large matrices.
    
    Time Complexity: O(V³) with better constant factor
    Space Complexity: O(V²)
    
    Args:
        graph: 2D list adjacency matrix
    
    Returns:
        tuple: (dist_matrix, pred_matrix, has_negative_cycle)
    """
    n = len(graph)
    INF = float('inf')
    
    dist = [row[:] for row in graph]
    pred = [[None] * n for _ in range(n)]
    
    for i in range(n):
        for j in range(n):
            if i != j and graph[i][j] < INF:
                pred[i][j] = j
    
    # Optimized loop order for cache locality
    # k-outermost, i-middle, j-innermost
    for k in range(n):
        # Cache the k-th row for better performance
        dist_k = dist[k]
        
        for i in range(n):
            # Skip if i cannot reach k
            dist_i_k = dist[i][k]
            if dist_i_k == INF:
                continue
            
            # Cache the i-th row for this iteration
            dist_i = dist[i]
            pred_i = pred[i]
            pred_k = pred[k]
            
            for j in range(n):
                # Skip if k cannot reach j
                dist_k_j = dist_k[j]
                if dist_k_j == INF:
                    continue
                
                new_dist = dist_i_k + dist_k_j
                if new_dist < dist_i[j]:
                    dist_i[j] = new_dist
                    pred_i[j] = pred_i[k]  # pred[i][j] = pred[i][k]
    
    # Check for negative cycles
    has_negative_cycle = any(dist[i][i] < 0 for i in range(n))
    
    return dist, pred, has_negative_cycle


def graph_diameter(distances):
    """
    Calculate graph diameter from all-pairs shortest paths.
    
    The diameter is the maximum shortest path distance
    between any pair of reachable nodes.
    
    Args:
        distances: Dict mapping (i,j) -> distance from Floyd-Warshall
    
    Returns:
        float: Graph diameter (float('inf') if disconnected)
    """
    diameter = 0
    
    for (i, j), d in distances.items():
        if i != j and d != float('inf'):
            diameter = max(diameter, d)
    
    return diameter if diameter > 0 else float('inf')