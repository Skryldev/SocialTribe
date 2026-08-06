from collections import deque
import heapq


def betweenness_centrality(graph, normalized=True, weighted=False):
    """
    Betweenness Centrality using Brandes' algorithm.
    
    Computes the fraction of shortest paths between all node pairs
    that pass through each node.
    
    Time Complexity: O(V * (V + E)) for unweighted
                     O(V * (V + E) log V) for weighted
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors (unweighted)
               OR dict mapping node -> dict of {neighbor: weight} (weighted)
        normalized: If True, normalize scores to [0, 1]
        weighted: If True, use Dijkstra instead of BFS
    
    Returns:
        dict: Mapping of node -> betweenness centrality score
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B', 'D'},
        ...     'D': {'B', 'C', 'E', 'F'},
        ...     'E': {'D', 'F'},
        ...     'F': {'D', 'E'}
        ... }
        >>> bc = betweenness_centrality(graph)
        >>> bc['D']  # D is the bridge between two communities
        0.6...
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n <= 2:
        return {node: 0.0 for node in nodes}
    
    # Initialize centrality
    betweenness = {node: 0.0 for node in nodes}
    
    # Brandes' algorithm: run SSSP from each source
    for source in nodes:
        if weighted:
            _brandes_source_weighted(graph, source, betweenness)
        else:
            _brandes_source_unweighted(graph, source, betweenness)
    
    # Undirected graph: divide by 2 (each pair counted twice)
    if not _is_directed(graph):
        for node in nodes:
            betweenness[node] /= 2.0
    
    # Normalize
    if normalized:
        scale = 1.0 / ((n - 1) * (n - 2)) if n > 2 else 1.0
        for node in nodes:
            betweenness[node] *= scale
    
    return betweenness


def _brandes_source_unweighted(graph, source, betweenness):
    """
    Brandes' algorithm for one source (unweighted graph).
    
    Phase 1: BFS to compute shortest paths and counts
    Phase 2: Back-propagation to accumulate dependencies
    """
    nodes = list(graph.keys())
    
    # Distance from source (infinity for unreachable)
    dist = {node: -1 for node in nodes}
    dist[source] = 0
    
    # Number of shortest paths from source to each node
    sigma = {node: 0 for node in nodes}
    sigma[source] = 1
    
    # Predecessors on shortest paths from source
    pred = {node: [] for node in nodes}
    
    # BFS queue
    queue = deque([source])
    
    # Stack for back-propagation (nodes in order of non-decreasing distance)
    stack = []
    
    # ---- Phase 1: BFS ----
    while queue:
        v = queue.popleft()
        stack.append(v)
        
        for neighbor in graph.get(v, set()):
            # Found for the first time
            if dist[neighbor] < 0:
                dist[neighbor] = dist[v] + 1
                queue.append(neighbor)
            
            # Shortest path through v
            if dist[neighbor] == dist[v] + 1:
                sigma[neighbor] += sigma[v]
                pred[neighbor].append(v)
    
    # ---- Phase 2: Back-propagation ----
    delta = {node: 0.0 for node in nodes}
    
    # Process nodes farthest from source first
    while stack:
        w = stack.pop()
        
        for v in pred[w]:
            # Dependency of v on paths through w
            delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
        
        if w != source:
            betweenness[w] += delta[w]


def _brandes_source_weighted(graph, source, betweenness):
    """
    Brandes' algorithm for one source (weighted graph, using Dijkstra).
    """
    nodes = list(graph.keys())
    
    dist = {node: float('inf') for node in nodes}
    dist[source] = 0
    
    sigma = {node: 0 for node in nodes}
    sigma[source] = 1
    
    pred = {node: [] for node in nodes}
    
    # Priority queue for Dijkstra
    pq = [(0, source)]
    visited = set()
    
    stack = []
    
    # ---- Phase 1: Dijkstra ----
    while pq:
        d, v = heapq.heappop(pq)
        
        if v in visited:
            continue
        
        visited.add(v)
        stack.append(v)
        
        if d > dist[v]:
            continue
        
        for neighbor, weight in graph.get(v, {}).items():
            if neighbor in visited:
                continue
            
            new_dist = d + weight
            
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                sigma[neighbor] = 0
                pred[neighbor] = []
                heapq.heappush(pq, (new_dist, neighbor))
            
            if new_dist == dist[neighbor]:
                sigma[neighbor] += sigma[v]
                pred[neighbor].append(v)
    
    # ---- Phase 2: Back-propagation ----
    delta = {node: 0.0 for node in nodes}
    
    while stack:
        w = stack.pop()
        
        for v in pred[w]:
            delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
        
        if w != source:
            betweenness[w] += delta[w]


def _is_directed(graph):
    """Check if graph is directed (heuristic: check if asymmetric)."""
    for u, neighbors in graph.items():
        for v in neighbors:
            if u not in graph.get(v, set()):
                return True
    return False


def edge_betweenness_centrality(graph, normalized=True):
    """
    Compute edge betweenness centrality.
    
    Similar to node betweenness but measures the fraction
    of shortest paths that pass through each edge.
    Used in Girvan-Newman community detection.
    
    Time Complexity: O(V * (V + E))
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        normalized: If True, normalize scores
    
    Returns:
        dict: Mapping of (u, v) -> edge betweenness score
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A', 'C'}, 'C': {'A', 'B', 'D'}, 'D': {'C'}}
        >>> ebc = edge_betweenness_centrality(graph)
        >>> ebc[('C', 'D')]  # Edge bridging D to the triangle
        1.5
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    
    edge_betweenness = {}
    for u in nodes:
        for v in graph.get(u, set()):
            edge = tuple(sorted([u, v]))
            edge_betweenness[edge] = 0.0
    
    for source in nodes:
        # BFS from source
        dist = {node: -1 for node in nodes}
        dist[source] = 0
        
        sigma = {node: 0 for node in nodes}
        sigma[source] = 1
        
        pred = {node: [] for node in nodes}
        
        queue = deque([source])
        stack = []
        
        while queue:
            v = queue.popleft()
            stack.append(v)
            
            for neighbor in graph.get(v, set()):
                if dist[neighbor] < 0:
                    dist[neighbor] = dist[v] + 1
                    queue.append(neighbor)
                
                if dist[neighbor] == dist[v] + 1:
                    sigma[neighbor] += sigma[v]
                    pred[neighbor].append(v)
        
        # Back-propagation
        delta = {node: 0.0 for node in nodes}
        
        while stack:
            w = stack.pop()
            
            for v in pred[w]:
                contribution = (sigma[v] / sigma[w]) * (1.0 + delta[w])
                delta[v] += contribution
                
                edge = tuple(sorted([v, w]))
                edge_betweenness[edge] += contribution
        
        # Also count paths from source to first-level nodes
        for neighbor in graph.get(source, set()):
            if dist[neighbor] == 1:
                edge = tuple(sorted([source, neighbor]))
                edge_betweenness[edge] += 1.0
    
    # Undirected: divide by 2
    if not _is_directed(graph):
        for edge in edge_betweenness:
            edge_betweenness[edge] /= 2.0
    
    if normalized:
        n = len(nodes)
        scale = 2.0 / (n * (n - 1)) if n > 1 else 1.0
        for edge in edge_betweenness:
            edge_betweenness[edge] *= scale
    
    return edge_betweenness


def approximate_betweenness_centrality(graph, k=None, normalized=True):
    """
    Approximate betweenness centrality using source sampling.
    
    Randomly samples k source nodes instead of computing
    from all V sources. Provides good approximation for
    large graphs.
    
    Time Complexity: O(k * (V + E))
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        k: Number of source samples (default: log₂ V)
        normalized: If True, normalize scores
    
    Returns:
        dict: Mapping of node -> approximate betweenness centrality
    
    Reference:
        Brandes & Pich (2007) - Centrality Estimation in Large Networks
    """
    import random
    import math
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n <= 2:
        return {node: 0.0 for node in nodes}
    
    # Default k: log₂ n
    if k is None:
        k = max(1, int(math.log2(n)))
    
    k = min(k, n)
    
    # Sample k sources
    sources = random.sample(nodes, k)
    
    betweenness = {node: 0.0 for node in nodes}
    
    for source in sources:
        _brandes_source_unweighted(graph, source, betweenness)
    
    # Scale to estimate full betweenness
    scale = n / k
    
    # Undirected: divide by 2
    if not _is_directed(graph):
        for node in nodes:
            betweenness[node] *= scale / 2.0
    else:
        for node in nodes:
            betweenness[node] *= scale
    
    if normalized:
        norm_scale = 1.0 / ((n - 1) * (n - 2)) if n > 2 else 1.0
        for node in nodes:
            betweenness[node] *= norm_scale
    
    return betweenness