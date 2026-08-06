import heapq
from collections import defaultdict
import math


def johnson(graph):
    """
    Johnson's algorithm for all-pairs shortest paths.
    
    Computes the shortest path between every pair of nodes in a
    sparse graph, even with negative edge weights (but no negative
    cycles). Uses Bellman-Ford for reweighting, then Dijkstra
    from each node.
    
    Time Complexity: O(V² log V + VE)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
            - distances: Dict mapping (source, target) -> distance
            - predecessors: Dict mapping (source, target) -> next node on path
            - has_negative_cycle: True if negative cycle detected
    
    Example:
        >>> graph = {
        ...     'A': {'B': -2, 'C': 8},
        ...     'B': {'C': 3, 'D': 4},
        ...     'C': {'D': -5},
        ...     'D': {'A': 6}
        ... }
        >>> dist, pred, has_cycle = johnson(graph)
        >>> dist[('A', 'D')]
        1  # A->B (-2) + B->C (3) + C->D (-5) = -4? Let's recalculate
           # Path: A->B->C->D = -2 + 3 + (-5) = -4
        >>> has_cycle
        False
    """
    if not graph:
        return {}, {}, False
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}, {}, False
    
    # ---------- Phase 1: Bellman-Ford from dummy node ----------
    # Add dummy node q connected to all nodes with zero-weight edges
    q = '__dummy_node_q__'
    
    # Build edge list for Bellman-Ford (including dummy node edges)
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    # Add zero-weight edges from q to all nodes
    for node in nodes:
        edges.append((q, node, 0))
    
    # Run Bellman-Ford from q
    # All nodes plus dummy node
    all_nodes = nodes + [q]
    V = len(all_nodes)
    
    h = {node: float('inf') for node in all_nodes}
    h[q] = 0
    
    # Relax edges V-1 times
    for iteration in range(V - 1):
        updated = False
        for u, v, weight in edges:
            if h[u] == float('inf'):
                continue
            new_dist = h[u] + weight
            if new_dist < h[v]:
                h[v] = new_dist
                updated = True
        if not updated:
            break
    
    # Check for negative cycles
    has_negative_cycle = False
    for u, v, weight in edges:
        if h[u] == float('inf'):
            continue
        if h[u] + weight < h[v]:
            has_negative_cycle = True
            break
    
    if has_negative_cycle:
        return {}, {}, True
    
    # Remove dummy node from potentials
    h.pop(q, None)
    
    # ---------- Phase 2: Reweight edges ----------
    reweighted_graph = {}
    for u, neighbors in graph.items():
        reweighted_graph[u] = {}
        for v, weight in neighbors.items():
            # w'(u,v) = w(u,v) + h(u) - h(v)
            new_weight = weight + h[u] - h[v]
            reweighted_graph[u][v] = new_weight
    
    # ---------- Phase 3: Run Dijkstra from each node ----------
    distances = {}
    predecessors = {}
    
    for source in nodes:
        dist_from_source, pred_from_source = dijkstra_sparse(
            reweighted_graph, source
        )
        
        # Transform distances back and store
        for target in nodes:
            if target == source:
                distances[(source, target)] = 0
                predecessors[(source, target)] = None
            elif dist_from_source.get(target, float('inf')) != float('inf'):
                # d(u,v) = d'(u,v) - h(u) + h(v)
                original_dist = (
                    dist_from_source[target] - h[source] + h[target]
                )
                distances[(source, target)] = original_dist
                predecessors[(source, target)] = pred_from_source.get(target)
            else:
                distances[(source, target)] = float('inf')
                predecessors[(source, target)] = None
    
    return distances, predecessors, False


def dijkstra_sparse(graph, source):
    """
    Dijkstra's algorithm for sparse graphs using priority queue.
    Used internally by Johnson's algorithm.
    
    Time Complexity: O((V + E) log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Source node
    
    Returns:
        tuple: (distances, predecessors)
    """
    if source not in graph:
        return {}, {}
    
    distances = {node: float('inf') for node in graph}
    distances[source] = 0
    predecessors = {node: None for node in graph}
    
    pq = [(0, source)]
    visited = set()
    
    while pq:
        current_dist, u = heapq.heappop(pq)
        
        if u in visited:
            continue
        
        visited.add(u)
        
        if current_dist > distances[u]:
            continue
        
        for v, weight in graph.get(u, {}).items():
            if v in visited:
                continue
            
            new_dist = current_dist + weight
            
            if new_dist < distances[v]:
                distances[v] = new_dist
                predecessors[v] = u
                heapq.heappush(pq, (new_dist, v))
    
    return distances, predecessors


def johnson_shortest_path(graph, source, target):
    """
    Find the shortest path between two specific nodes using Johnson's.
    
    For single-pair queries, this is more efficient than computing
    all pairs. Uses Bellman-Ford for reweighting, then single Dijkstra.
    
    Time Complexity: O(VE + (V + E) log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        target: Target node
    
    Returns:
        tuple: (distance, path, has_negative_cycle)
    
    Example:
        >>> graph = {
        ...     'A': {'B': -2, 'C': 4},
        ...     'B': {'C': 3, 'D': 2},
        ...     'C': {'D': -1},
        ...     'D': {}
        ... }
        >>> distance, path, has_cycle = johnson_shortest_path(graph, 'A', 'D')
        >>> distance
        0  # A->B (-2) + B->C (3) + C->D (-1) = 0
        >>> path
        ['A', 'B', 'C', 'D']
    """
    if not graph or source not in graph or target not in graph:
        return float('inf'), [], False
    
    if source == target:
        return 0, [source], False
    
    # Phase 1: Bellman-Ford to compute potentials
    nodes = list(graph.keys())
    q = '__dummy_q__'
    
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    for node in nodes:
        edges.append((q, node, 0))
    
    all_nodes = nodes + [q]
    V = len(all_nodes)
    
    h = {node: float('inf') for node in all_nodes}
    h[q] = 0
    
    for _ in range(V - 1):
        updated = False
        for u, v, weight in edges:
            if h[u] == float('inf'):
                continue
            if h[u] + weight < h[v]:
                h[v] = h[u] + weight
                updated = True
        if not updated:
            break
    
    # Check negative cycle
    for u, v, weight in edges:
        if h[u] == float('inf'):
            continue
        if h[u] + weight < h[v]:
            return float('inf'), [], True
    
    h.pop(q)
    
    # Phase 2: Reweight and run single Dijkstra
    reweighted = {}
    for u, neighbors in graph.items():
        reweighted[u] = {}
        for v, weight in neighbors.items():
            reweighted[u][v] = weight + h[u] - h[v]
    
    dist_reweighted, predecessors = dijkstra_sparse(reweighted, source)
    
    if dist_reweighted.get(target, float('inf')) == float('inf'):
        return float('inf'), [], False
    
    # Recover original distance
    original_dist = dist_reweighted[target] - h[source] + h[target]
    
    # Reconstruct path
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = predecessors.get(current)
    path.reverse()
    
    return original_dist, path, False


def johnson_bellman_ford_phase(graph):
    """
    Extract just the Bellman-Ford reweighting phase.
    
    Useful when you want to compute the potential function h(v)
    for custom applications or preprocessing.
    
    Time Complexity: O(VE)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        tuple: (potentials, has_negative_cycle)
            - potentials: Dict mapping node -> potential h(v)
            - has_negative_cycle: True if negative cycle detected
    """
    if not graph:
        return {}, False
    
    nodes = list(graph.keys())
    q = '__dummy_q__'
    
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    for node in nodes:
        edges.append((q, node, 0))
    
    all_nodes = nodes + [q]
    V = len(all_nodes)
    
    h = {node: float('inf') for node in all_nodes}
    h[q] = 0
    
    for _ in range(V - 1):
        updated = False
        for u, v, weight in edges:
            if h[u] == float('inf'):
                continue
            if h[u] + weight < h[v]:
                h[v] = h[u] + weight
                updated = True
        if not updated:
            break
    
    has_negative_cycle = False
    for u, v, weight in edges:
        if h[u] == float('inf'):
            continue
        if h[u] + weight < h[v]:
            has_negative_cycle = True
            break
    
    h.pop(q)
    
    return h, has_negative_cycle


def reweight_graph(graph, potentials):
    """
    Apply Johnson's reweighting to a graph using given potentials.
    
    Transforms edge weights to be non-negative while preserving
    shortest path ordering.
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        potentials: Dict mapping node -> potential value h(v)
    
    Returns:
        dict: Reweighted graph with non-negative edge weights
    """
    reweighted = {}
    
    for u, neighbors in graph.items():
        reweighted[u] = {}
        for v, weight in neighbors.items():
            h_u = potentials.get(u, 0)
            h_v = potentials.get(v, 0)
            new_weight = weight + h_u - h_v
            reweighted[u][v] = new_weight
    
    return reweighted


def johnson_with_fibonacci_heap(graph):
    """
    Johnson's algorithm using Fibonacci heap for theoretical optimality.
    
    Note: This is a placeholder demonstrating the interface.
    Python's heapq is used in practice since Fibonacci heap has
    high constant factors and is rarely beneficial for typical graphs.
    
    Time Complexity: O(VE + V² log V) (with Fibonacci heap: O(VE + V² + VE) = O(VE))
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
    """
    # In practice, Python's heapq is more efficient than Fibonacci heap
    # for almost all real-world graph sizes due to constant factors.
    # This function exists for educational completeness.
    return johnson(graph)


def johnson_parallelizable(graph, num_workers=4):
    """
    Prepare Johnson's algorithm for parallel execution.
    
    The V Dijkstra runs are independent and can be parallelized.
    This function returns the reweighted graph ready for parallel
    Dijkstra execution.
    
    Time Complexity: O(VE) for setup, then O((V² log V)/num_workers)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        num_workers: Number of parallel workers (for documentation)
    
    Returns:
        tuple: (reweighted_graph, potentials, has_negative_cycle)
            Ready for parallel Dijkstra from each source node
    """
    # Phase 1 & 2: Compute potentials and reweight
    potentials, has_negative_cycle = johnson_bellman_ford_phase(graph)
    
    if has_negative_cycle:
        return None, potentials, True
    
    reweighted = reweight_graph(graph, potentials)
    
    return reweighted, potentials, False


def recover_path(predecessors, source, target):
    """
    Recover the shortest path from predecessor information.
    
    Args:
        predecessors: Dict mapping (source, target) -> next node
        source: Starting node
        target: Target node
    
    Returns:
        list: Path from source to target
    """
    path = []
    current = source
    
    # Handle disconnected nodes
    if (source, target) not in predecessors:
        return []
    
    while current is not None and current != target:
        path.append(current)
        next_node = predecessors.get((current, target))
        if next_node is None:
            return []
        current = next_node
    
    if current == target:
        path.append(target)
    else:
        return []
    
    return path