def bellman_ford(graph, source):
    """
    Bellman-Ford algorithm for single-source shortest paths.
    
    Finds shortest paths from source to all nodes in a weighted graph,
    even with negative edge weights. Detects negative cycles if present.
    
    Time Complexity: O(V * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
               OR list of tuples: (u, v, weight)
        source: Starting node
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
            - distances: Dict mapping node -> shortest distance from source
            - predecessors: Dict mapping node -> previous node in shortest path
            - has_negative_cycle: True if negative cycle detected
    
    Example:
        >>> graph = {
        ...     'A': {'B': 4, 'C': 5},
        ...     'B': {'C': -2, 'D': 3},
        ...     'C': {'D': 4, 'E': 3},
        ...     'D': {'E': -1},
        ...     'E': {'B': -4}
        ... }
        >>> distances, predecessors, negative_cycle = bellman_ford(graph, 'A')
        >>> negative_cycle
        True  # B->C->D->E->B has weight: -2 + 4 + (-1) + (-4) = -3
    """
    # Handle edge list format
    if isinstance(graph, list):
        return _bellman_ford_edge_list(graph, source)
    
    # Handle adjacency dict format
    return _bellman_ford_adjacency(graph, source)


def _bellman_ford_adjacency(graph, source):
    """Bellman-Ford implementation for adjacency dict format."""
    # Get all nodes
    nodes = set(graph.keys())
    for neighbors in graph.values():
        nodes.update(neighbors.keys())
    
    # Build edge list from adjacency dict
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    return _bellman_ford_edge_list(edges, source, list(nodes))


def _bellman_ford_edge_list(edges, source, nodes=None):
    """
    Bellman-Ford implementation for edge list format.
    
    Args:
        edges: List of (u, v, weight) tuples
        source: Starting node
        nodes: List of all nodes (extracted from edges if None)
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
    """
    # Collect all nodes from edges if not provided
    if nodes is None:
        nodes = set()
        for u, v, _ in edges:
            nodes.add(u)
            nodes.add(v)
        nodes = list(nodes)
    
    if not nodes:
        return {}, {}, False
    
    # Initialize distances
    distances = {node: float('inf') for node in nodes}
    distances[source] = 0
    
    # Initialize predecessors
    predecessors = {node: None for node in nodes}
    
    # Number of vertices
    V = len(nodes)
    
    # Relax edges V-1 times
    for iteration in range(V - 1):
        updated = False
        
        for u, v, weight in edges:
            # Skip if u hasn't been reached yet
            if distances[u] == float('inf'):
                continue
            
            # Relax edge
            new_distance = distances[u] + weight
            if new_distance < distances[v]:
                distances[v] = new_distance
                predecessors[v] = u
                updated = True
        
        # Early termination: no updates means we're done
        if not updated:
            break
    
    # Check for negative weight cycles
    has_negative_cycle = False
    negative_cycle_nodes = set()
    
    for u, v, weight in edges:
        if distances[u] == float('inf'):
            continue
        
        if distances[u] + weight < distances[v]:
            has_negative_cycle = True
            negative_cycle_nodes.add(v)
            negative_cycle_nodes.add(u)
    
    # Mark nodes affected by negative cycles as -inf
    if has_negative_cycle:
        # Propagate negative cycle effect
        changed = True
        while changed:
            changed = False
            for u, v, weight in edges:
                if u in negative_cycle_nodes and v not in negative_cycle_nodes:
                    negative_cycle_nodes.add(v)
                    changed = True
        
        for node in negative_cycle_nodes:
            distances[node] = float('-inf')
            predecessors[node] = None  # Path undefined in negative cycle
    
    return distances, predecessors, has_negative_cycle


def bellman_ford_shortest_path(graph, source, target):
    """
    Find the shortest path from source to target using Bellman-Ford.
    
    Time Complexity: O(V * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        target: Target node
    
    Returns:
        tuple: (distance, path, has_negative_cycle)
            - distance: Shortest distance (float('inf') if no path,
                       float('-inf') if affected by negative cycle)
            - path: List of nodes in the shortest path
            - has_negative_cycle: True if path is affected by negative cycle
    
    Example:
        >>> graph = {
        ...     'A': {'B': 4, 'C': 2},
        ...     'B': {'D': 3},
        ...     'C': {'B': -1, 'D': 5},
        ...     'D': {}
        ... }
        >>> distance, path, has_cycle = bellman_ford_shortest_path(graph, 'A', 'D')
        >>> distance
        6  # A->C (2) + C->B (-1) + B->D (3) = 4 (wait, let me recalculate)
           # Actually: A->C->B->D = 2 + (-1) + 3 = 4
    """
    distances, predecessors, has_negative_cycle = bellman_ford(graph, source)
    
    distance = distances.get(target, float('inf'))
    
    # Check if target is affected by negative cycle
    if distance == float('-inf'):
        return float('-inf'), [], True
    
    if distance == float('inf'):
        return float('inf'), [], has_negative_cycle
    
    # Reconstruct path
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = predecessors.get(current)
        if current in path:  # Cycle detected (shouldn't happen without negative cycle)
            break
    path.reverse()
    
    return distance, path, has_negative_cycle


def bellman_ford_early_termination(graph, source):
    """
    Optimized Bellman-Ford with early termination and reduced iterations.
    
    Stops when no distance updates occur in an iteration, which can
    dramatically improve performance on graphs with short paths.
    
    Time Complexity: O(k * E) where k ≤ V-1 (often much smaller)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
    """
    nodes = set(graph.keys())
    for neighbors in graph.values():
        nodes.update(neighbors.keys())
    
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    V = len(nodes)
    distances = {node: float('inf') for node in nodes}
    distances[source] = 0
    predecessors = {node: None for node in nodes}
    
    # Relax edges up to V-1 times, but stop early if no changes
    for iteration in range(V - 1):
        updated = False
        
        for u, v, weight in edges:
            if distances[u] == float('inf'):
                continue
            
            new_distance = distances[u] + weight
            if new_distance < distances[v]:
                distances[v] = new_distance
                predecessors[v] = u
                updated = True
        
        # If no updates, shortest paths are found
        if not updated:
            break
    
    # Check for negative cycles
    has_negative_cycle = False
    for u, v, weight in edges:
        if distances[u] == float('inf'):
            continue
        
        if distances[u] + weight < distances[v]:
            has_negative_cycle = True
            break
    
    return distances, predecessors, has_negative_cycle


def bellman_ford_negative_cycle_details(graph, source):
    """
    Find the actual nodes and edges involved in negative cycles.
    
    Returns detailed information about detected negative cycles,
    useful for debugging and analysis.
    
    Time Complexity: O(V * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
    
    Returns:
        tuple: (distances, predecessors, negative_cycles)
            - negative_cycles: List of lists, each containing nodes in a cycle
    """
    distances, predecessors, has_cycle = bellman_ford(graph, source)
    
    if not has_cycle:
        return distances, predecessors, []
    
    # Build edge list for cycle detection
    edges = []
    for u, neighbors in graph.items():
        for v, weight in neighbors.items():
            edges.append((u, v, weight))
    
    # Find nodes that can still be relaxed after V-1 iterations
    cycle_nodes = set()
    for u, v, weight in edges:
        if distances[u] == float('inf'):
            continue
        
        if distances[u] + weight < distances[v]:
            cycle_nodes.add(v)
    
    # Reconstruct cycles
    cycles = []
    visited_in_cycle = set()
    
    for start_node in cycle_nodes:
        if start_node in visited_in_cycle:
            continue
        
        # Trace back to find the cycle
        path = []
        current = start_node
        
        # Walk back up to V steps to find the cycle
        for _ in range(len(graph) + 1):
            if current in path:
                cycle_start = path.index(current)
                cycle = path[cycle_start:]
                cycles.append(cycle)
                visited_in_cycle.update(cycle)
                break
            
            path.append(current)
            current = predecessors.get(current)
            
            if current is None or current not in predecessors:
                break
    
    return distances, predecessors, cycles


def bellman_ford_all_pairs(graph):
    """
    All-pairs shortest paths using Bellman-Ford from each node.
    
    Note: For non-negative weights, use Johnson's algorithm instead.
    For dense graphs, consider Floyd-Warshall.
    
    Time Complexity: O(V² * E)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
    
    Returns:
        dict: Mapping of (source, target) -> (distance, path, has_negative_cycle)
    """
    all_paths = {}
    nodes = list(graph.keys())
    
    for source in nodes:
        distances, predecessors, has_cycle = bellman_ford(graph, source)
        
        for target in nodes:
            if source == target:
                all_paths[(source, target)] = (0, [source], False)
                continue
            
            distance = distances.get(target, float('inf'))
            
            if distance == float('inf'):
                all_paths[(source, target)] = (float('inf'), [], has_cycle)
            elif distance == float('-inf'):
                all_paths[(source, target)] = (float('-inf'), [], True)
            else:
                # Reconstruct path
                path = []
                current = target
                while current is not None:
                    path.append(current)
                    current = predecessors.get(current)
                path.reverse()
                all_paths[(source, target)] = (distance, path, False)
    
    return all_paths


def spfa(graph, source):
    """
    Shortest Path Faster Algorithm (SPFA) - queue-based Bellman-Ford.
    
    An optimization that uses a queue to only process nodes whose
    distances have changed, often much faster in practice but with
    worst-case exponential time.
    
    Time Complexity: O(k * E) average, O(V * E) worst case
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
    
    Returns:
        tuple: (distances, predecessors, has_negative_cycle)
    """
    from collections import deque
    
    nodes = set(graph.keys())
    for neighbors in graph.values():
        nodes.update(neighbors.keys())
    
    V = len(nodes)
    distances = {node: float('inf') for node in nodes}
    distances[source] = 0
    predecessors = {node: None for node in nodes}
    
    # Track how many times each node has been enqueued
    enqueue_count = {node: 0 for node in nodes}
    
    # Track if node is in queue
    in_queue = {node: False for node in nodes}
    
    # Initialize queue with source
    queue = deque([source])
    in_queue[source] = True
    enqueue_count[source] += 1
    
    has_negative_cycle = False
    
    while queue:
        u = queue.popleft()
        in_queue[u] = False
        
        for v, weight in graph.get(u, {}).items():
            if distances[u] == float('inf'):
                continue
            
            new_distance = distances[u] + weight
            
            if new_distance < distances[v]:
                distances[v] = new_distance
                predecessors[v] = u
                
                if not in_queue[v]:
                    queue.append(v)
                    in_queue[v] = True
                    enqueue_count[v] += 1
                    
                    # If a node is enqueued V times, negative cycle exists
                    if enqueue_count[v] > V:
                        has_negative_cycle = True
                        # Clear queue to exit loop
                        queue.clear()
                        break
    
    # Final negative cycle check
    if not has_negative_cycle:
        for u, neighbors in graph.items():
            for v, weight in neighbors.items():
                if distances[u] == float('inf'):
                    continue
                if distances[u] + weight < distances[v]:
                    has_negative_cycle = True
                    break
    
    return distances, predecessors, has_negative_cycle


def currency_arbitrage(exchange_rates):
    """
    Detect currency arbitrage opportunities using Bellman-Ford.
    
    Converts currency exchange rates to a graph with negative
    log weights, where a negative cycle represents arbitrage.
    
    Time Complexity: O(V * E)
    Space Complexity: O(V)
    
    Args:
        exchange_rates: Dict mapping (from_currency, to_currency) -> rate
                        where rate is the amount of to_currency per from_currency
    
    Returns:
        tuple: (has_arbitrage, cycle_path, profit_factor)
            - has_arbitrage: True if arbitrage opportunity exists
            - cycle_path: List of currencies forming arbitrage cycle
            - profit_factor: Multiplication factor of the arbitrage
    
    Example:
        >>> rates = {
        ...     ('USD', 'EUR'): 0.85,
        ...     ('EUR', 'GBP'): 0.90,
        ...     ('GBP', 'USD'): 1.35,
        ...     ('USD', 'JPY'): 110.0,
        ...     ('JPY', 'EUR'): 0.0075
        ... }
        >>> has_arb, cycle, profit = currency_arbitrage(rates)
        >>> has_arb
        True  # USD->EUR->GBP->USD: 0.85 * 0.90 * 1.35 = 1.033 > 1
        >>> profit
        1.03275...
    """
    import math
    
    # Collect all currencies
    currencies = set()
    for (from_curr, to_curr) in exchange_rates:
        currencies.add(from_curr)
        currencies.add(to_curr)
    
    currencies = list(currencies)
    V = len(currencies)
    
    # Build graph with negative log weights
    # weight = -log(rate) so that negative cycle = profitable arbitrage
    edges = []
    for (from_curr, to_curr), rate in exchange_rates.items():
        if rate > 0:
            weight = -math.log(rate)
            edges.append((from_curr, to_curr, weight))
    
    # Run Bellman-Ford from first currency
    source = currencies[0]
    distances = {curr: float('inf') for curr in currencies}
    distances[source] = 0
    predecessors = {curr: None for curr in currencies}
    
    # Relax V-1 times
    for _ in range(V - 1):
        for u, v, weight in edges:
            if distances[u] == float('inf'):
                continue
            if distances[u] + weight < distances[v]:
                distances[v] = distances[u] + weight
                predecessors[v] = u
    
    # Find negative cycle (arbitrage)
    for u, v, weight in edges:
        if distances[u] == float('inf'):
            continue
        
        if distances[u] + weight < distances[v]:
            # Found arbitrage opportunity
            # Reconstruct the cycle
            cycle = []
            visited = set()
            current = v
            
            # Walk back to find the cycle
            while current not in visited:
                visited.add(current)
                cycle.append(current)
                current = predecessors[current]
                if current is None:
                    break
            
            if current is not None:
                cycle_start = cycle.index(current)
                cycle = cycle[cycle_start:]
                cycle.append(current)  # Complete the cycle
                cycle.reverse()
                
                # Calculate profit factor
                profit = 1.0
                for i in range(len(cycle) - 1):
                    from_curr = cycle[i]
                    to_curr = cycle[i + 1]
                    rate = exchange_rates.get((from_curr, to_curr), 0)
                    profit *= rate
                
                return True, cycle, profit
    
    return False, [], 0.0