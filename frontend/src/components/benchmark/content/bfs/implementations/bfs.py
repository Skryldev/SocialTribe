from collections import deque


def bfs(graph, source):
    """
    Breadth-First Search from a single source.
    
    Computes shortest path distances from source to all
    reachable nodes in an unweighted graph.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
        source: Starting node for BFS
    
    Returns:
        tuple: (distances, predecessors)
            - distances: Dict mapping node -> distance from source
            - predecessors: Dict mapping node -> previous node on shortest path
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'D', 'E'},
        ...     'C': {'A', 'F'},
        ...     'D': {'B'},
        ...     'E': {'B', 'F'},
        ...     'F': {'C', 'E'}
        ... }
        >>> dist, pred = bfs(graph, 'A')
        >>> dist['F']
        2  # A → C → F or A → B → E → F? No, A→C→F is 2
        >>> dist['D']
        2  # A → B → D
    """
    if source not in graph:
        raise ValueError(f"Source node {source} not in graph")
    
    distances = {source: 0}
    predecessors = {source: None}
    visited = {source}
    queue = deque([source])
    
    while queue:
        current = queue.popleft()
        
        for neighbor in graph.get(current, set()):
            if neighbor not in visited:
                visited.add(neighbor)
                distances[neighbor] = distances[current] + 1
                predecessors[neighbor] = current
                queue.append(neighbor)
    
    return distances, predecessors


def bfs_shortest_path(graph, source, target):
    """
    Find shortest path from source to target using BFS.
    
    Returns the path as a list of nodes, or empty list
    if no path exists.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        source: Starting node
        target: Target node
    
    Returns:
        list: Path from source to target (inclusive)
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'D'}, 'C': {'D'}, 'D': {}}
        >>> bfs_shortest_path(graph, 'A', 'D')
        ['A', 'B', 'D']  # Both paths length 2; BFS finds one
    """
    if source not in graph:
        return []
    
    if source == target:
        return [source]
    
    predecessors = {source: None}
    visited = {source}
    queue = deque([source])
    
    while queue:
        current = queue.popleft()
        
        for neighbor in graph.get(current, set()):
            if neighbor not in visited:
                visited.add(neighbor)
                predecessors[neighbor] = current
                queue.append(neighbor)
                
                if neighbor == target:
                    # Reconstruct path
                    path = []
                    node = target
                    while node is not None:
                        path.append(node)
                        node = predecessors[node]
                    path.reverse()
                    return path
    
    return []  # No path found


def bfs_levels(graph, source):
    """
    BFS that groups nodes by their level (distance from source).
    
    Useful for level-order processing and layered graph analysis.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        source: Starting node
    
    Returns:
        list: List of lists, where levels[i] contains nodes at distance i
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'D'}, 'C': {'E'}, 'D': {}, 'E': {}}
        >>> bfs_levels(graph, 'A')
        [['A'], ['B', 'C'], ['D', 'E']]
    """
    if source not in graph:
        return []
    
    levels = []
    visited = {source}
    current_level = [source]
    
    while current_level:
        levels.append(current_level)
        next_level = []
        
        for node in current_level:
            for neighbor in graph.get(node, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.append(neighbor)
        
        current_level = next_level
    
    return levels


def bfs_connected_components(graph):
    """
    Find all connected components in an undirected graph using BFS.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        list: List of components, each component is a set of nodes
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'A'}, 'C': {'D'}, 'D': {'C'}, 'E': set()}
        >>> bfs_connected_components(graph)
        [{'A', 'B'}, {'C', 'D'}, {'E'}]
    """
    all_nodes = set(graph.keys())
    visited = set()
    components = []
    
    for node in all_nodes:
        if node not in visited:
            component = set()
            queue = deque([node])
            visited.add(node)
            
            while queue:
                current = queue.popleft()
                component.add(current)
                
                for neighbor in graph.get(current, set()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            
            components.append(component)
    
    return components


def bfs_bipartite(graph):
    """
    Check if graph is bipartite using BFS 2-coloring.
    
    A graph is bipartite if nodes can be colored with 2 colors
    such that no two adjacent nodes share the same color.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        tuple: (is_bipartite, coloring)
            - is_bipartite: True if graph is 2-colorable
            - coloring: Dict mapping node -> 0 or 1 (color)
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A'}, 'C': {'A'}}
        >>> is_bip, coloring = bfs_bipartite(graph)
        >>> is_bip
        True  # A is color 0, B and C are color 1
        >>> triangle = {'A': {'B', 'C'}, 'B': {'A', 'C'}, 'C': {'A', 'B'}}
        >>> bfs_bipartite(triangle)[0]
        False  # Triangle needs 3 colors
    """
    all_nodes = set(graph.keys())
    color = {}
    
    for start in all_nodes:
        if start not in color:
            color[start] = 0
            queue = deque([start])
            
            while queue:
                current = queue.popleft()
                
                for neighbor in graph.get(current, set()):
                    if neighbor not in color:
                        color[neighbor] = 1 - color[current]  # Opposite color
                        queue.append(neighbor)
                    elif color[neighbor] == color[current]:
                        return False, {}  # Same color adjacent → not bipartite
    
    return True, color


def bfs_multi_source(graph, sources):
    """
    Multi-source BFS.
    
    Finds shortest distance from ANY source node.
    Useful for finding nearest facility, exit, etc.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        sources: List of source nodes
    
    Returns:
        tuple: (distances, nearest_source)
            - distances: Dict mapping node -> distance to nearest source
            - nearest_source: Dict mapping node -> which source is nearest
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'A', 'C'}, 'C': {'B', 'D'}, 'D': {'C'}}
        >>> dist, nearest = bfs_multi_source(graph, ['A', 'D'])
        >>> dist['C']
        1  # C is 1 step from D
        >>> nearest['B']
        'A'  # B's nearest source is A (distance 1)
    """
    distances = {}
    nearest_source = {}
    queue = deque()
    
    # Initialize with all sources
    for source in sources:
        if source in graph:
            distances[source] = 0
            nearest_source[source] = source
            queue.append(source)
    
    while queue:
        current = queue.popleft()
        
        for neighbor in graph.get(current, set()):
            if neighbor not in distances:
                distances[neighbor] = distances[current] + 1
                nearest_source[neighbor] = nearest_source[current]
                queue.append(neighbor)
    
    return distances, nearest_source


def bfs_with_path_tracking(graph, source):
    """
    BFS that records ALL shortest paths (not just one).
    
    For each node, stores ALL predecessors that lead to
    shortest paths from the source.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V + E) for storing multiple predecessors
    
    Args:
        graph: Dict mapping node -> set of neighbors
        source: Starting node
    
    Returns:
        tuple: (distances, all_predecessors)
            - distances: Dict mapping node -> distance
            - all_predecessors: Dict mapping node -> list of predecessors
    """
    if source not in graph:
        return {}, {}
    
    distances = {source: 0}
    all_predecessors = {source: []}
    queue = deque([source])
    
    while queue:
        current = queue.popleft()
        
        for neighbor in graph.get(current, set()):
            if neighbor not in distances:
                # First time discovering neighbor
                distances[neighbor] = distances[current] + 1
                all_predecessors[neighbor] = [current]
                queue.append(neighbor)
            elif distances[neighbor] == distances[current] + 1:
                # Found another shortest path to neighbor
                all_predecessors[neighbor].append(current)
    
    return distances, all_predecessors