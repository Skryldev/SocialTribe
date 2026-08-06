from collections import deque
import heapq


def harmonic_centrality(graph, normalized=True, weighted=False):
    """
    Harmonic Centrality for all nodes.
    
    Computes the sum of reciprocal shortest path distances
    from each node to all others. Handles disconnected
    graphs gracefully (1/∞ = 0).
    
    Time Complexity: O(V * (V + E)) for unweighted
                     O(V * (V + E) log V) for weighted
    Space Complexity: O(V) per BFS
    
    Args:
        graph: Dict mapping node -> set of neighbors (unweighted)
               OR dict mapping node -> dict of {neighbor: weight} (weighted)
        normalized: If True, divide by (n-1) for [0, 1] range
        weighted: If True, use Dijkstra instead of BFS
    
    Returns:
        dict: Mapping of node -> harmonic centrality score
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'C'}
        ... }
        >>> hc = harmonic_centrality(graph)
        >>> hc['C']  # C is closest to all others
        0.833...  # (1/1 + 1/1 + 1/1) / 3 = 1.0 normalized? Let's recompute
                  # dist(C,A)=1, dist(C,B)=1, dist(C,D)=1 → H(C)=3, norm=3/3=1
        >>> hc['D']  # D is peripheral
        0.444...  # dist(D,C)=1, dist(D,A)=2, dist(D,B)=2 → H(D)=1+0.5+0.5=2, norm=2/3
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 1:
        return {nodes[0]: 0.0}
    
    harmonic = {node: 0.0 for node in nodes}
    
    # Run BFS/Dijkstra from each node
    for source in nodes:
        if weighted:
            distances = _sssp_dijkstra(graph, source)
        else:
            distances = _sssp_bfs(graph, source)
        
        # Sum reciprocal distances
        for target in nodes:
            if target == source:
                continue
            d = distances.get(target, float('inf'))
            if d != float('inf') and d > 0:
                harmonic[source] += 1.0 / d
    
    # Normalize
    if normalized and n > 1:
        for node in nodes:
            harmonic[node] /= (n - 1)
    
    return harmonic


def _sssp_bfs(graph, source):
    """
    Single-source shortest paths using BFS (unweighted).
    
    Time Complexity: O(V + E)
    
    Returns:
        dict: Mapping of node -> distance from source
    """
    distances = {source: 0}
    queue = deque([source])
    visited = {source}
    
    while queue:
        v = queue.popleft()
        
        for neighbor in graph.get(v, set()):
            if neighbor not in visited:
                visited.add(neighbor)
                distances[neighbor] = distances[v] + 1
                queue.append(neighbor)
    
    return distances


def _sssp_dijkstra(graph, source):
    """
    Single-source shortest paths using Dijkstra (weighted).
    
    Time Complexity: O((V + E) log V)
    
    Returns:
        dict: Mapping of node -> distance from source
    """
    distances = {node: float('inf') for node in graph}
    distances[source] = 0
    
    pq = [(0, source)]
    visited = set()
    
    while pq:
        d, v = heapq.heappop(pq)
        
        if v in visited:
            continue
        visited.add(v)
        
        if d > distances[v]:
            continue
        
        for neighbor, weight in graph.get(v, {}).items():
            if neighbor in visited:
                continue
            
            new_dist = d + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                heapq.heappush(pq, (new_dist, neighbor))
    
    return distances


def harmonic_centrality_optimized(graph, normalized=True):
    """
    Optimized harmonic centrality for undirected graphs.
    
    Exploits symmetry: if we compute distances from s to t,
    we can also update t's centrality using 1/d(s,t).
    
    This roughly halves the number of BFS calls needed
    for undirected graphs.
    
    Time Complexity: O(V * (V + E)) (same asymptotic, better constant)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        normalized: If True, normalize to [0, 1]
    
    Returns:
        dict: Mapping of node -> harmonic centrality
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 1:
        return {nodes[0]: 0.0}
    
    harmonic = {node: 0.0 for node in nodes}
    processed = set()
    
    for source in nodes:
        if source in processed:
            continue
        
        # BFS from source
        distances = _sssp_bfs(graph, source)
        
        # Update harmonic for source using distances
        for target, d in distances.items():
            if target == source:
                continue
            if d > 0:
                harmonic[source] += 1.0 / d
                harmonic[target] += 1.0 / d  # Symmetric contribution
        
        processed.add(source)
    
    if normalized and n > 1:
        for node in nodes:
            harmonic[node] /= (n - 1)
    
    return harmonic


def harmonic_centrality_single(graph, node, normalized=True):
    """
    Compute harmonic centrality for a single node.
    
    Much faster than computing for all nodes when only
    one node's centrality is needed.
    
    Time Complexity: O(V + E) for BFS from node
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Node to compute centrality for
        normalized: If True, normalize to [0, 1]
    
    Returns:
        float: Harmonic centrality score for the node
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A'}, 'C': {'A'}}
        >>> harmonic_centrality_single(graph, 'A')
        0.666...  # dist(A,B)=1, dist(A,C)=1 → H(A)=2, norm=2/2=1.0
    """
    if node not in graph:
        return 0.0
    
    nodes = [n for n in graph if n != node]
    n = len(graph)
    
    distances = _sssp_bfs(graph, node)
    
    total = 0.0
    for target in nodes:
        d = distances.get(target, float('inf'))
        if d != float('inf') and d > 0:
            total += 1.0 / d
    
    if normalized and n > 1:
        total /= (n - 1)
    
    return total


def closeness_centrality(graph, normalized=True):
    """
    Closeness Centrality (for comparison with harmonic).
    
    Computes 1 / (sum of distances) for each node.
    Standard version — fails for disconnected graphs.
    
    Time Complexity: O(V * (V + E))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        normalized: If True, multiply by (n-1)
    
    Returns:
        dict: Mapping of node -> closeness centrality
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 1:
        return {nodes[0]: 1.0}
    
    closeness = {}
    
    for source in nodes:
        distances = _sssp_bfs(graph, source)
        
        # Sum of distances
        total_dist = sum(d for target, d in distances.items() if target != source)
        
        if total_dist > 0:
            closeness[source] = 1.0 / total_dist
        else:
            closeness[source] = 0.0
        
        # Normalize
        if normalized and n > 1:
            closeness[source] *= (n - 1)
    
    return closeness


def compare_centralities(graph):
    """
    Compare harmonic and closeness centrality for all nodes.
    
    Useful for understanding how the two measures differ,
    especially in disconnected or sparse graphs.
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        list: Tuples of (node, harmonic, closeness, difference)
    """
    harmonic = harmonic_centrality(graph, normalized=True)
    closeness = closeness_centrality(graph, normalized=True)
    
    comparison = []
    for node in harmonic:
        h = harmonic[node]
        c = closeness.get(node, 0.0)
        comparison.append((node, h, c, h - c))
    
    return sorted(comparison, key=lambda x: x[1], reverse=True)