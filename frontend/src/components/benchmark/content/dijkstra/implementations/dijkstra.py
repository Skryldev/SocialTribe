import heapq
from collections import defaultdict


def dijkstra(graph, source):
    """
    Dijkstra's algorithm for single-source shortest paths.
    
    Finds the shortest path from a source node to all other nodes
    in a weighted graph with non-negative edge weights.
    
    Time Complexity: O((V + E) log V) with binary heap
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node for shortest path computation
    
    Returns:
        tuple: (distances, predecessors)
            - distances: Dict mapping node -> shortest distance from source
            - predecessors: Dict mapping node -> previous node in shortest path
    
    Example:
        >>> graph = {
        ...     'A': {'B': 4, 'C': 2},
        ...     'B': {'C': 1, 'D': 5},
        ...     'C': {'D': 8, 'E': 10},
        ...     'D': {'E': 2, 'F': 6},
        ...     'E': {'F': 2},
        ...     'F': {}
        ... }
        >>> distances, predecessors = dijkstra(graph, 'A')
        >>> distances['F']
        14  # A -> C -> B -> D -> F = 2 + 1 + 5 + 6 = 14
    """
    # Handle empty graph
    if not graph or source not in graph:
        return {}, {}
    
    # Initialize distances with infinity
    distances = {node: float('inf') for node in graph}
    distances[source] = 0
    
    # Predecessors for path reconstruction
    predecessors = {node: None for node in graph}
    
    # Priority queue: (distance, node)
    # Using node ID as tiebreaker for when distances are equal
    pq = [(0, source)]
    
    # Track visited nodes
    visited = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        # Skip if we've already processed this node
        if current_node in visited:
            continue
        
        # Mark as visited
        visited.add(current_node)
        
        # Skip if we've found a shorter path already
        if current_distance > distances[current_node]:
            continue
        
        # Relax all outgoing edges
        for neighbor, weight in graph.get(current_node, {}).items():
            if neighbor in visited:
                continue
            
            # Calculate new distance through current node
            distance = current_distance + weight
            
            # Update if we found a shorter path
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                predecessors[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
    
    return distances, predecessors


def dijkstra_shortest_path(graph, source, target):
    """
    Find the shortest path from source to target using Dijkstra.
    
    Returns both the distance and the actual path.
    
    Time Complexity: O((V + E) log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        target: Target node
    
    Returns:
        tuple: (distance, path)
            - distance: Shortest distance (float('inf') if no path)
            - path: List of nodes in the shortest path
    
    Example:
        >>> graph = {
        ...     'A': {'B': 4, 'C': 2},
        ...     'B': {'D': 5},
        ...     'C': {'B': 1, 'D': 8},
        ...     'D': {}
        ... }
        >>> distance, path = dijkstra_shortest_path(graph, 'A', 'D')
        >>> distance
        8
        >>> path
        ['A', 'C', 'B', 'D']  # A->C (2) + C->B (1) + B->D (5) = 8
    """
    distances, predecessors = dijkstra(graph, source)
    
    distance = distances.get(target, float('inf'))
    
    # Reconstruct path
    path = []
    if distance < float('inf'):
        current = target
        while current is not None:
            path.append(current)
            current = predecessors.get(current)
        path.reverse()
    
    return distance, path


def dijkstra_targeted(graph, source, target):
    """
    Optimized Dijkstra that stops when target is reached.
    
    More efficient than computing all shortest paths when only
    a single target is needed.
    
    Time Complexity: O((V + E) log V) but terminates early
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        target: Target node
    
    Returns:
        tuple: (distance, path) as in dijkstra_shortest_path
    """
    if not graph or source not in graph:
        return float('inf'), []
    
    if source == target:
        return 0, [source]
    
    distances = {node: float('inf') for node in graph}
    distances[source] = 0
    predecessors = {node: None for node in graph}
    
    pq = [(0, source)]
    visited = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        # Early termination: stop when we reach the target
        if current_node == target:
            break
        
        if current_node in visited:
            continue
        
        visited.add(current_node)
        
        if current_distance > distances[current_node]:
            continue
        
        for neighbor, weight in graph.get(current_node, {}).items():
            if neighbor in visited:
                continue
            
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                predecessors[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
    
    # Reconstruct path
    distance = distances.get(target, float('inf'))
    path = []
    
    if distance < float('inf'):
        current = target
        while current is not None:
            path.append(current)
            current = predecessors.get(current)
        path.reverse()
    
    return distance, path


def dijkstra_bidirectional(graph, source, target):
    """
    Bidirectional Dijkstra for faster shortest path search.
    
    Runs two simultaneous searches: forward from source and
    backward from target, meeting in the middle.
    
    Time Complexity: O((V + E) log V) with better practical performance
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        target: Target node
    
    Returns:
        tuple: (distance, path)
    """
    if not graph or source not in graph or target not in graph:
        return float('inf'), []
    
    if source == target:
        return 0, [source]
    
    # Build reverse graph for backward search
    reverse_graph = defaultdict(dict)
    for node, neighbors in graph.items():
        for neighbor, weight in neighbors.items():
            reverse_graph[neighbor][node] = weight
    
    # Forward search data structures
    forward_dist = {source: 0}
    forward_pred = {source: None}
    forward_pq = [(0, source)]
    forward_visited = set()
    
    # Backward search data structures
    backward_dist = {target: 0}
    backward_pred = {target: None}
    backward_pq = [(0, target)]
    backward_visited = set()
    
    # Best path found so far
    best_distance = float('inf')
    meeting_node = None
    
    while forward_pq and backward_pq:
        # Expand forward search
        if forward_pq:
            f_dist, f_node = heapq.heappop(forward_pq)
            
            if f_node in forward_visited:
                continue
            
            forward_visited.add(f_node)
            
            if f_dist > best_distance:
                break
            
            # Check if this node has been visited by backward search
            if f_node in backward_dist:
                total_dist = f_dist + backward_dist[f_node]
                if total_dist < best_distance:
                    best_distance = total_dist
                    meeting_node = f_node
            
            for neighbor, weight in graph.get(f_node, {}).items():
                if neighbor not in forward_visited:
                    new_dist = f_dist + weight
                    if new_dist < forward_dist.get(neighbor, float('inf')):
                        forward_dist[neighbor] = new_dist
                        forward_pred[neighbor] = f_node
                        heapq.heappush(forward_pq, (new_dist, neighbor))
        
        # Expand backward search
        if backward_pq:
            b_dist, b_node = heapq.heappop(backward_pq)
            
            if b_node in backward_visited:
                continue
            
            backward_visited.add(b_node)
            
            if b_dist > best_distance:
                break
            
            # Check if this node has been visited by forward search
            if b_node in forward_dist:
                total_dist = b_dist + forward_dist[b_node]
                if total_dist < best_distance:
                    best_distance = total_dist
                    meeting_node = b_node
            
            for neighbor, weight in reverse_graph.get(b_node, {}).items():
                if neighbor not in backward_visited:
                    new_dist = b_dist + weight
                    if new_dist < backward_dist.get(neighbor, float('inf')):
                        backward_dist[neighbor] = new_dist
                        backward_pred[neighbor] = b_node
                        heapq.heappush(backward_pq, (new_dist, neighbor))
    
    # Reconstruct path
    if best_distance == float('inf'):
        return float('inf'), []
    
    # Forward path from source to meeting node
    forward_path = []
    current = meeting_node
    while current is not None:
        forward_path.append(current)
        current = forward_pred.get(current)
    forward_path.reverse()
    
    # Backward path from meeting node to target
    backward_path = []
    current = backward_pred.get(meeting_node)
    while current is not None:
        backward_path.append(current)
        current = backward_pred.get(current)
    
    path = forward_path + backward_path
    
    return best_distance, path


def dijkstra_multi_source(graph, sources):
    """
    Multi-source Dijkstra: find shortest paths from any of multiple sources.
    
    Useful for finding the nearest facility among multiple options,
    like nearest hospital or service center.
    
    Time Complexity: O((V + E) log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        sources: List of source nodes
    
    Returns:
        tuple: (distances, predecessors, nearest_source)
            - distances: Dict mapping node -> shortest distance to any source
            - predecessors: Dict mapping node -> previous node in shortest path
            - nearest_source: Dict mapping node -> which source is nearest
    """
    if not graph:
        return {}, {}, {}
    
    # Initialize with all sources
    distances = {node: float('inf') for node in graph}
    predecessors = {node: None for node in graph}
    nearest_source = {node: None for node in graph}
    
    pq = []
    
    # Add all sources to priority queue with distance 0
    for source in sources:
        if source in graph:
            distances[source] = 0
            nearest_source[source] = source
            heapq.heappush(pq, (0, source))
    
    visited = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
        
        visited.add(current_node)
        
        if current_distance > distances[current_node]:
            continue
        
        for neighbor, weight in graph.get(current_node, {}).items():
            if neighbor in visited:
                continue
            
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                predecessors[neighbor] = current_node
                nearest_source[neighbor] = nearest_source[current_node]
                heapq.heappush(pq, (distance, neighbor))
    
    return distances, predecessors, nearest_source


def dijkstra_with_constraints(graph, source, max_distance=None, 
                              max_nodes=None, forbidden_nodes=None):
    """
    Constrained Dijkstra with path restrictions.
    
    Finds shortest paths while respecting constraints like maximum
    distance, maximum path length, or forbidden nodes.
    
    Time Complexity: O((V + E) log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        source: Starting node
        max_distance: Maximum allowed path distance
        max_nodes: Maximum number of nodes in path
        forbidden_nodes: Set of nodes that cannot be visited
    
    Returns:
        tuple: (distances, predecessors)
    """
    if not graph or source not in graph:
        return {}, {}
    
    if forbidden_nodes is None:
        forbidden_nodes = set()
    
    distances = {node: float('inf') for node in graph}
    distances[source] = 0
    
    predecessors = {node: None for node in graph}
    path_lengths = {source: 1}  # Number of nodes in path
    
    pq = [(0, source)]
    visited = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        if current_node in visited or current_node in forbidden_nodes:
            continue
        
        visited.add(current_node)
        
        if current_distance > distances[current_node]:
            continue
        
        current_path_length = path_lengths.get(current_node, 1)
        
        for neighbor, weight in graph.get(current_node, {}).items():
            if neighbor in visited or neighbor in forbidden_nodes:
                continue
            
            new_distance = current_distance + weight
            new_path_length = current_path_length + 1
            
            # Check constraints
            if max_distance is not None and new_distance > max_distance:
                continue
            
            if max_nodes is not None and new_path_length > max_nodes:
                continue
            
            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                predecessors[neighbor] = current_node
                path_lengths[neighbor] = new_path_length
                heapq.heappush(pq, (new_distance, neighbor))
    
    return distances, predecessors


def reconstruct_all_paths(predecessors, source):
    """
    Reconstruct all shortest paths from source to all reachable nodes.
    
    Args:
        predecessors: Dict mapping node -> previous node in shortest path
        source: Source node
    
    Returns:
        dict: Mapping of node -> list representing shortest path from source
    """
    paths = {}
    
    def get_path(node):
        if node == source:
            return [source]
        if node not in predecessors or predecessors[node] is None:
            return []
        
        path = get_path(predecessors[node])
        if path:
            path.append(node)
        return path
    
    for node in predecessors:
        path = get_path(node)
        if path:
            paths[node] = path
    
    return paths