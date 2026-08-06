import heapq
from collections import defaultdict
import math


def a_star(graph, start, goal, heuristic_func, positions=None):
    """
    A* search algorithm for finding the shortest path between two nodes.
    
    Uses a heuristic function to guide the search toward the goal,
    achieving better performance than Dijkstra's algorithm when
    the heuristic is well-chosen.
    
    Time Complexity: O((V + E) log V) with admissible heuristic
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        start: Starting node
        goal: Target node
        heuristic_func: Function(node, goal) -> float estimating distance to goal
        positions: Optional dict mapping node -> (x, y) for geometric heuristics
    
    Returns:
        tuple: (path, cost)
            - path: List of nodes from start to goal (empty if no path)
            - cost: Total cost of the path (float('inf') if no path)
    
    Example:
        >>> graph = {
        ...     'A': {'B': 1, 'C': 4},
        ...     'B': {'A': 1, 'D': 3, 'E': 7},
        ...     'C': {'A': 4, 'F': 2},
        ...     'D': {'B': 3, 'G': 5},
        ...     'E': {'B': 7, 'G': 2},
        ...     'F': {'C': 2, 'G': 6},
        ...     'G': {'D': 5, 'E': 2, 'F': 6}
        ... }
        >>> positions = {
        ...     'A': (0, 0), 'B': (1, 0), 'C': (0, 1),
        ...     'D': (2, 0), 'E': (1, 2), 'F': (0, 2),
        ...     'G': (2, 2)
        ... }
        >>> def euclidean(node, goal):
        ...     x1, y1 = positions[node]
        ...     x2, y2 = positions[goal]
        ...     return math.sqrt((x1-x2)**2 + (y1-y2)**2)
        >>> path, cost = a_star(graph, 'A', 'G', euclidean)
        >>> path
        ['A', 'B', 'D', 'G']
        >>> cost
        9  # A->B (1) + B->D (3) + D->G (5) = 9
    """
    # Handle edge cases
    if not graph or start not in graph or goal not in graph:
        return [], float('inf')
    
    if start == goal:
        return [start], 0
    
    # G-score: actual cost from start to node
    g_score = {start: 0}
    
    # F-score: estimated total cost from start to goal through node
    f_score = {start: heuristic_func(start, goal)}
    
    # Parent pointers for path reconstruction
    came_from = {start: None}
    
    # Open set: priority queue of (f_score, node)
    open_set = [(f_score[start], start)]
    
    # Closed set: nodes already processed
    closed_set = set()
    
    while open_set:
        # Get node with lowest f_score
        current_f, current = heapq.heappop(open_set)
        
        # Skip if this entry is outdated (we found a better path)
        if current_f > f_score.get(current, float('inf')):
            continue
        
        # Goal found
        if current == goal:
            path = reconstruct_path(came_from, current)
            return path, g_score[current]
        
        # Mark as processed
        if current in closed_set:
            continue
        closed_set.add(current)
        
        # Expand neighbors
        for neighbor, weight in graph.get(current, {}).items():
            if neighbor in closed_set:
                continue
            
            # Tentative g_score
            tentative_g = g_score[current] + weight
            
            # If we found a better path to neighbor
            if tentative_g < g_score.get(neighbor, float('inf')):
                # Update path
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                
                # f = g + h
                h = heuristic_func(neighbor, goal)
                new_f = tentative_g + h
                f_score[neighbor] = new_f
                
                # Add to open set
                heapq.heappush(open_set, (new_f, neighbor))
    
    # No path found
    return [], float('inf')


def reconstruct_path(came_from, current):
    """
    Reconstruct the path from start to current using parent pointers.
    
    Args:
        came_from: Dict mapping node -> predecessor
        current: Goal node
    
    Returns:
        list: Path from start to current
    """
    path = []
    while current is not None:
        path.append(current)
        current = came_from.get(current)
    path.reverse()
    return path


def manhattan_distance(node, goal, positions):
    """
    Manhattan distance heuristic for grid-based pathfinding.
    Suitable for 4-directional movement on grids.
    
    Args:
        node: Current node
        goal: Target node
        positions: Dict mapping node -> (x, y)
    
    Returns:
        float: Manhattan distance
    """
    x1, y1 = positions[node]
    x2, y2 = positions[goal]
    return abs(x1 - x2) + abs(y1 - y2)


def euclidean_distance(node, goal, positions):
    """
    Euclidean distance heuristic for any-angle movement.
    
    Args:
        node: Current node
        goal: Target node
        positions: Dict mapping node -> (x, y)
    
    Returns:
        float: Euclidean distance
    """
    x1, y1 = positions[node]
    x2, y2 = positions[goal]
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)


def diagonal_distance(node, goal, positions):
    """
    Diagonal/Chebyshev distance for 8-directional grid movement.
    
    Args:
        node: Current node
        goal: Target node
        positions: Dict mapping node -> (x, y)
    
    Returns:
        float: Diagonal distance
    """
    x1, y1 = positions[node]
    x2, y2 = positions[goal]
    dx = abs(x1 - x2)
    dy = abs(y1 - y2)
    return max(dx, dy)


def a_star_bidirectional(graph, start, goal, heuristic_func):
    """
    Bidirectional A* for faster pathfinding.
    
    Simultaneously searches from start toward goal and from goal
    toward start, meeting in the middle for better performance.
    
    Time Complexity: O((V + E) log V) with better practical performance
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        start: Starting node
        goal: Target node
        heuristic_func: Function(node, goal) -> float
    
    Returns:
        tuple: (path, cost)
    """
    if not graph or start not in graph or goal not in graph:
        return [], float('inf')
    
    if start == goal:
        return [start], 0
    
    # Build reverse graph
    reverse_graph = defaultdict(dict)
    for node, neighbors in graph.items():
        for neighbor, weight in neighbors.items():
            reverse_graph[neighbor][node] = weight
    
    # Forward search (from start)
    forward_g = {start: 0}
    forward_f = {start: heuristic_func(start, goal)}
    forward_parents = {start: None}
    forward_open = [(forward_f[start], start)]
    forward_closed = set()
    
    # Backward search (from goal)
    backward_g = {goal: 0}
    backward_f = {goal: heuristic_func(goal, start)}
    backward_parents = {goal: None}
    backward_open = [(backward_f[goal], goal)]
    backward_closed = set()
    
    best_cost = float('inf')
    meeting_node = None
    
    while forward_open and backward_open:
        # Expand forward search
        if forward_open:
            f_f, f_node = heapq.heappop(forward_open)
            
            if f_node in forward_closed:
                continue
            
            forward_closed.add(f_node)
            
            # Check if this node has been reached by backward search
            if f_node in backward_g:
                total_cost = forward_g[f_node] + backward_g[f_node]
                if total_cost < best_cost:
                    best_cost = total_cost
                    meeting_node = f_node
            
            if forward_g[f_node] > best_cost:
                continue
            
            for neighbor, weight in graph.get(f_node, {}).items():
                if neighbor in forward_closed:
                    continue
                
                tentative_g = forward_g[f_node] + weight
                
                if tentative_g < forward_g.get(neighbor, float('inf')):
                    forward_g[neighbor] = tentative_g
                    forward_parents[neighbor] = f_node
                    h = heuristic_func(neighbor, goal)
                    forward_f[neighbor] = tentative_g + h
                    heapq.heappush(forward_open, (forward_f[neighbor], neighbor))
        
        # Expand backward search
        if backward_open:
            f_b, b_node = heapq.heappop(backward_open)
            
            if b_node in backward_closed:
                continue
            
            backward_closed.add(b_node)
            
            # Check if this node has been reached by forward search
            if b_node in forward_g:
                total_cost = forward_g[b_node] + backward_g[b_node]
                if total_cost < best_cost:
                    best_cost = total_cost
                    meeting_node = b_node
            
            if backward_g[b_node] > best_cost:
                continue
            
            for neighbor, weight in reverse_graph.get(b_node, {}).items():
                if neighbor in backward_closed:
                    continue
                
                tentative_g = backward_g[b_node] + weight
                
                if tentative_g < backward_g.get(neighbor, float('inf')):
                    backward_g[neighbor] = tentative_g
                    backward_parents[neighbor] = b_node
                    h = heuristic_func(neighbor, start)
                    backward_f[neighbor] = tentative_g + h
                    heapq.heappush(backward_open, (backward_f[neighbor], neighbor))
    
    if best_cost == float('inf'):
        return [], float('inf')
    
    # Reconstruct path from both directions
    forward_path = []
    current = meeting_node
    while current is not None:
        forward_path.append(current)
        current = forward_parents.get(current)
    forward_path.reverse()
    
    backward_path = []
    current = backward_parents.get(meeting_node)
    while current is not None:
        backward_path.append(current)
        current = backward_parents.get(current)
    
    path = forward_path + backward_path
    
    return path, best_cost


def weighted_a_star(graph, start, goal, heuristic_func, weight=1.5):
    """
    Weighted A*: trades optimality for speed.
    
    Uses f(n) = g(n) + weight * h(n) to inflate the heuristic.
    Finds paths faster but may be suboptimal by factor ≤ weight.
    
    Time Complexity: O((V + E) log V) — faster in practice
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        start: Starting node
        goal: Target node
        heuristic_func: Function(node, goal) -> float
        weight: Heuristic weight (> 1 for faster, suboptimal search)
    
    Returns:
        tuple: (path, cost)
    """
    if not graph or start not in graph or goal not in graph:
        return [], float('inf')
    
    if start == goal:
        return [start], 0
    
    g_score = {start: 0}
    f_score = {start: weight * heuristic_func(start, goal)}
    came_from = {start: None}
    
    open_set = [(f_score[start], start)]
    closed_set = set()
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current_f > f_score.get(current, float('inf')):
            continue
        
        if current == goal:
            path = reconstruct_path(came_from, current)
            return path, g_score[current]
        
        if current in closed_set:
            continue
        closed_set.add(current)
        
        for neighbor, edge_weight in graph.get(current, {}).items():
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + edge_weight
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                
                # Weighted heuristic for faster search
                h = heuristic_func(neighbor, goal)
                new_f = tentative_g + weight * h
                f_score[neighbor] = new_f
                
                heapq.heappush(open_set, (new_f, neighbor))
    
    return [], float('inf')


def a_star_with_constraints(graph, start, goal, heuristic_func,
                            max_cost=None, forbidden_nodes=None,
                            required_nodes=None):
    """
    A* with path constraints.
    
    Supports maximum path cost, forbidden nodes, and required waypoints.
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        start: Starting node
        goal: Target node
        heuristic_func: Function(node, goal) -> float
        max_cost: Maximum allowed path cost (None for unlimited)
        forbidden_nodes: Set of nodes that cannot be visited
        required_nodes: List of nodes that must be visited in order
    
    Returns:
        tuple: (path, cost)
    """
    if not graph or start not in graph or goal not in graph:
        return [], float('inf')
    
    if forbidden_nodes is None:
        forbidden_nodes = set()
    
    # If required nodes specified, chain multiple A* calls
    if required_nodes:
        full_path = []
        total_cost = 0
        current_start = start
        
        for waypoint in required_nodes + [goal]:
            if current_start == waypoint:
                continue
            
            path, cost = a_star_with_constraints(
                graph, current_start, waypoint, heuristic_func,
                max_cost - total_cost if max_cost else None,
                forbidden_nodes
            )
            
            if not path:
                return [], float('inf')
            
            # Add path without duplicating start node
            if full_path:
                full_path.extend(path[1:])
            else:
                full_path.extend(path)
            
            total_cost += cost
            current_start = waypoint
        
        return full_path, total_cost
    
    # Standard A* with constraints
    if start == goal:
        return [start], 0
    
    g_score = {start: 0}
    f_score = {start: heuristic_func(start, goal)}
    came_from = {start: None}
    
    open_set = [(f_score[start], start)]
    closed_set = set()
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current_f > f_score.get(current, float('inf')):
            continue
        
        if current == goal:
            path = reconstruct_path(came_from, current)
            return path, g_score[current]
        
        if current in closed_set:
            continue
        closed_set.add(current)
        
        for neighbor, weight in graph.get(current, {}).items():
            if neighbor in closed_set or neighbor in forbidden_nodes:
                continue
            
            tentative_g = g_score[current] + weight
            
            # Check max cost constraint
            if max_cost is not None and tentative_g > max_cost:
                continue
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                
                h = heuristic_func(neighbor, goal)
                new_f = tentative_g + h
                f_score[neighbor] = new_f
                
                heapq.heappush(open_set, (new_f, neighbor))
    
    return [], float('inf')


def a_star_grid(grid, start, goal, diagonal_movement=False):
    """
    A* specialized for 2D grid-based pathfinding.
    
    Common in game development and robotics for navigation
    on occupancy grids.
    
    Args:
        grid: 2D list where 1 = walkable, 0 = obstacle
        start: Tuple (row, col) of start position
        goal: Tuple (row, col) of goal position
        diagonal_movement: If True, allows 8-directional movement
    
    Returns:
        tuple: (path, cost) where path is list of (row, col) tuples
    """
    rows, cols = len(grid), len(grid[0])
    
    def is_valid(pos):
        r, c = pos
        return 0 <= r < rows and 0 <= c < cols and grid[r][c] == 1
    
    def get_neighbors(pos):
        r, c = pos
        neighbors = []
        
        # Cardinal directions (4-way)
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        
        if diagonal_movement:
            # Add diagonal directions (8-way)
            directions += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
        
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if is_valid((nr, nc)):
                # Diagonal movement costs sqrt(2) for uniform grid
                if dr != 0 and dc != 0:
                    cost = math.sqrt(2)
                else:
                    cost = 1.0
                neighbors.append(((nr, nc), cost))
        
        return neighbors
    
    def heuristic(pos, goal):
        r1, c1 = pos
        r2, c2 = goal
        dr = abs(r1 - r2)
        dc = abs(c1 - c2)
        
        if diagonal_movement:
            # Diagonal distance for 8-way movement
            return max(dr, dc)
        else:
            # Manhattan distance for 4-way movement
            return dr + dc
    
    if not is_valid(start) or not is_valid(goal):
        return [], float('inf')
    
    if start == goal:
        return [start], 0
    
    g_score = {start: 0}
    f_score = {start: heuristic(start, goal)}
    came_from = {start: None}
    
    open_set = [(f_score[start], start)]
    closed_set = set()
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        if current_f > f_score.get(current, float('inf')):
            continue
        
        if current == goal:
            path = reconstruct_path(came_from, current)
            return path, g_score[current]
        
        if current in closed_set:
            continue
        closed_set.add(current)
        
        for neighbor, cost in get_neighbors(current):
            if neighbor in closed_set:
                continue
            
            tentative_g = g_score[current] + cost
            
            if tentative_g < g_score.get(neighbor, float('inf')):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                h = heuristic(neighbor, goal)
                f_score[neighbor] = tentative_g + h
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
    
    return [], float('inf')