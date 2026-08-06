def dfs(graph, source):
    """
    Depth-First Search from a single source.
    
    Traverses graph depth-first, recording discovery order
    and parent pointers for path reconstruction.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V) for recursion stack + visited
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
        source: Starting node
    
    Returns:
        tuple: (visited_order, parents, discovery, finishing)
            - visited_order: List of nodes in order of discovery
            - parents: Dict mapping node -> parent in DFS tree
            - discovery: Dict mapping node -> discovery time
            - finishing: Dict mapping node -> finishing time
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'D', 'E'},
        ...     'C': {'A', 'F'},
        ...     'D': {'B'},
        ...     'E': {'B', 'F'},
        ...     'F': {'C', 'E'}
        ... }
        >>> order, parents, disc, fin = dfs(graph, 'A')
        >>> order
        ['A', 'B', 'D', 'E', 'F', 'C']  # One possible DFS order
    """
    if source not in graph:
        raise ValueError(f"Source node {source} not in graph")
    
    visited = set()
    visited_order = []
    parents = {source: None}
    discovery = {}
    finishing = {}
    time = [0]  # Mutable counter for time
    
    def dfs_visit(node):
        visited.add(node)
        visited_order.append(node)
        time[0] += 1
        discovery[node] = time[0]
        
        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                parents[neighbor] = node
                dfs_visit(neighbor)
        
        time[0] += 1
        finishing[node] = time[0]
    
    dfs_visit(source)
    
    return visited_order, parents, discovery, finishing


def dfs_iterative(graph, source):
    """
    Iterative DFS using explicit stack.
    
    Avoids recursion limit issues on deep graphs.
    Uses a stack of (node, iterator_state) for correct
    post-order processing.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        source: Starting node
    
    Returns:
        tuple: (visited_order, parents)
    """
    if source not in graph:
        raise ValueError(f"Source node {source} not in graph")
    
    visited = set()
    visited_order = []
    parents = {source: None}
    
    # Stack: (node, neighbor_iterator)
    stack = [(source, iter(graph.get(source, set())))]
    visited.add(source)
    visited_order.append(source)
    
    while stack:
        node, neighbors_iter = stack[-1]
        
        try:
            neighbor = next(neighbors_iter)
            if neighbor not in visited:
                visited.add(neighbor)
                visited_order.append(neighbor)
                parents[neighbor] = node
                stack.append((neighbor, iter(graph.get(neighbor, set()))))
        except StopIteration:
            stack.pop()  # Backtrack
    
    return visited_order, parents


def dfs_full(graph):
    """
    Full DFS that explores ALL components.
    
    Iterates over all nodes and runs DFS from each
    unvisited node. Returns complete traversal data.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        tuple: (components, visited_order)
            - components: List of lists, each a connected component
            - visited_order: Global discovery order
    """
    all_nodes = set(graph.keys())
    visited = set()
    components = []
    global_order = []
    
    for start_node in all_nodes:
        if start_node not in visited:
            component = []
            stack = [start_node]
            visited.add(start_node)
            
            while stack:
                node = stack.pop()
                component.append(node)
                global_order.append(node)
                
                for neighbor in graph.get(node, set()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)
            
            components.append(component)
    
    return components, global_order


def dfs_cycle_detection(graph):
    """
    Detect cycles in a directed graph using DFS.
    
    Uses three-coloring: WHITE (unvisited), GRAY (in stack),
    BLACK (finished). A cycle exists if we encounter a GRAY node.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        tuple: (has_cycle, cycle_path)
            - has_cycle: True if cycle exists
            - cycle_path: List of nodes forming a cycle (if found)
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'C'}, 'C': {'A'}}  # Triangle
        >>> dfs_cycle_detection(graph)
        (True, ['A', 'B', 'C'])
        >>> dag = {'A': {'B', 'C'}, 'B': {'D'}, 'C': {'D'}, 'D': set()}
        >>> dfs_cycle_detection(dag)
        (False, [])
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}
    parent = {}
    cycle_path = []
    
    def dfs_visit(node):
        nonlocal cycle_path
        color[node] = GRAY
        
        for neighbor in graph.get(node, set()):
            if cycle_path:  # Cycle already found
                return
            
            if color[neighbor] == GRAY:
                # Back edge: cycle found
                cycle_path.append(neighbor)
                current = node
                while current != neighbor:
                    cycle_path.append(current)
                    current = parent[current]
                cycle_path.append(neighbor)
                cycle_path.reverse()
                return
            
            if color[neighbor] == WHITE:
                parent[neighbor] = node
                dfs_visit(neighbor)
        
        color[node] = BLACK
    
    for node in graph:
        if color[node] == WHITE and not cycle_path:
            dfs_visit(node)
    
    return len(cycle_path) > 0, cycle_path


def dfs_topological_sort(graph):
    """
    Topological sort of a Directed Acyclic Graph (DAG) using DFS.
    
    Returns nodes in an order where for every edge u→v,
    u comes before v. Uses finishing times (reverse post-order).
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors (DAG)
    
    Returns:
        list: Nodes in topological order
    
    Raises:
        ValueError: If graph contains a cycle
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'D'}, 'C': {'D'}, 'D': set()}
        >>> dfs_topological_sort(graph)
        ['A', 'C', 'B', 'D']  # One valid topological order
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}
    order = []
    
    def dfs_visit(node):
        color[node] = GRAY
        
        for neighbor in graph.get(node, set()):
            if color[neighbor] == GRAY:
                raise ValueError("Graph contains a cycle — not a DAG")
            if color[neighbor] == WHITE:
                dfs_visit(neighbor)
        
        color[node] = BLACK
        order.append(node)  # Post-order: add after processing children
    
    for node in graph:
        if color[node] == WHITE:
            dfs_visit(node)
    
    order.reverse()  # Reverse post-order = topological order
    return order


def dfs_articulation_points(graph):
    """
    Find articulation points (cut vertices) using DFS.
    
    An articulation point is a node whose removal increases
    the number of connected components.
    
    Uses Tarjan's algorithm with discovery time and low-link values.
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors (undirected)
    
    Returns:
        set: Articulation points
    
    Example:
        >>> graph = {'A': {'B', 'C'}, 'B': {'A', 'C'}, 'C': {'A', 'B', 'D'}, 'D': {'C'}}
        >>> dfs_articulation_points(graph)
        {'C'}  # C connects D to the triangle
    """
    visited = set()
    discovery = {}
    low = {}
    parent = {}
    articulation = set()
    time = [0]
    
    def dfs_visit(node):
        visited.add(node)
        time[0] += 1
        discovery[node] = low[node] = time[0]
        children = 0
        
        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                parent[neighbor] = node
                children += 1
                dfs_visit(neighbor)
                
                low[node] = min(low[node], low[neighbor])
                
                # Root articulation point
                if parent.get(node) is None and children > 1:
                    articulation.add(node)
                
                # Non-root articulation point
                if parent.get(node) is not None and low[neighbor] >= discovery[node]:
                    articulation.add(node)
            
            elif neighbor != parent.get(node):
                low[node] = min(low[node], discovery[neighbor])
    
    for node in graph:
        if node not in visited:
            dfs_visit(node)
    
    return articulation


def dfs_strongly_connected_components(graph):
    """
    Kosaraju's algorithm for Strongly Connected Components (SCC).
    
    Uses two DFS passes:
    1. DFS on original graph to get finishing order
    2. DFS on reversed graph in decreasing finish time
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of outgoing neighbors
    
    Returns:
        list: List of SCCs, each SCC is a set of nodes
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'C'}, 'C': {'A', 'D'}, 'D': {'E'}, 'E': {'F'}, 'F': {'D'}}
        >>> sccs = dfs_strongly_connected_components(graph)
        >>> len(sccs)
        2  # {A,B,C} and {D,E,F}
    """
    # First pass: compute finishing order
    visited = set()
    finish_order = []
    
    def dfs_first(node):
        visited.add(node)
        for neighbor in graph.get(node, set()):
            if neighbor not in visited:
                dfs_first(neighbor)
        finish_order.append(node)
    
    for node in graph:
        if node not in visited:
            dfs_first(node)
    
    # Build reversed graph
    reversed_graph = {node: set() for node in graph}
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            reversed_graph[neighbor].add(node)
    
    # Second pass: find SCCs in reversed graph
    visited.clear()
    sccs = []
    
    def dfs_second(node, component):
        visited.add(node)
        component.add(node)
        for neighbor in reversed_graph.get(node, set()):
            if neighbor not in visited:
                dfs_second(neighbor, component)
    
    for node in reversed(finish_order):
        if node not in visited:
            component = set()
            dfs_second(node, component)
            sccs.append(component)
    
    return sccs