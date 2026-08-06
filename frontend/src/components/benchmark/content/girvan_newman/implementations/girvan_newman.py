from collections import deque, defaultdict
import heapq


def girvan_newman(graph, max_communities=None, verbose=False):
    """
    Girvan-Newman community detection algorithm.
    
    Progressively removes edges with highest betweenness centrality
    to reveal community structure. Uses Brandes' algorithm for
    efficient edge betweenness computation.
    
    Time Complexity: O(V * E²) for sparse graphs
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors (unweighted)
               OR dict mapping node -> dict of {neighbor: weight}
        max_communities: Stop when this many communities formed (optional)
        verbose: Print progress information
    
    Returns:
        tuple: (dendrogram, best_partition, modularity_history)
            - dendrogram: List of partitions at each split
            - best_partition: Dict mapping node -> community_id
            - modularity_history: List of Q values at each split
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B'},
        ...     'D': {'B', 'E', 'F'},
        ...     'E': {'D', 'F'},
        ...     'F': {'D', 'E'}
        ... }
        >>> dendrogram, partition, q_history = girvan_newman(graph)
        >>> len(set(partition.values()))
        2  # Two communities: {A,B,C} and {D,E,F}
    """
    # Convert to undirected unweighted format for betweenness
    if not graph:
        return [], {}, []
    
    working_graph = _to_undirected_adjacency(graph)
    nodes = list(working_graph.keys())
    n = len(nodes)
    
    if n <= 1:
        partition = {node: 0 for node in nodes}
        return [partition], partition, [0.0]
    
    # Initialize: one community containing all nodes
    components = _get_components(working_graph)
    current_partition = _components_to_partition(components)
    
    dendrogram = [current_partition.copy()]
    modularity_history = [_modularity(graph, current_partition)]
    
    best_modularity = modularity_history[0]
    best_partition = current_partition.copy()
    
    iteration = 0
    
    while len(working_graph) > 0:
        # Compute edge betweenness for all edges
        edge_betweenness = _compute_edge_betweenness(working_graph)
        
        if not edge_betweenness:
            break
        
        # Find edge(s) with maximum betweenness
        max_bw = max(edge_betweenness.values())
        edges_to_remove = [edge for edge, bw in edge_betweenness.items() 
                          if bw == max_bw]
        
        if verbose:
            print(f"Iteration {iteration}: Removing {len(edges_to_remove)} "
                  f"edge(s) with betweenness {max_bw:.4f}")
        
        # Remove all edges with maximum betweenness
        for u, v in edges_to_remove:
            _remove_edge(working_graph, u, v)
        
        # Check if graph split into more components
        new_components = _get_components(working_graph)
        new_partition = _components_to_partition(new_components)
        
        if _number_of_communities(new_partition) > _number_of_communities(current_partition):
            # New community structure emerged
            current_partition = new_partition
            dendrogram.append(current_partition.copy())
            
            q = _modularity(graph, current_partition)
            modularity_history.append(q)
            
            if q > best_modularity:
                best_modularity = q
                best_partition = current_partition.copy()
            
            if verbose:
                print(f"  Communities: {_number_of_communities(current_partition)}, "
                      f"Modularity Q = {q:.4f}")
            
            # Check stopping criterion
            if (max_communities is not None and 
                _number_of_communities(current_partition) >= max_communities):
                break
        
        iteration += 1
    
    return dendrogram, best_partition, modularity_history


def _to_undirected_adjacency(graph):
    """Convert graph to undirected adjacency dict of sets."""
    adj = defaultdict(set)
    
    for node, neighbors in graph.items():
        if isinstance(neighbors, set):
            for neighbor in neighbors:
                adj[node].add(neighbor)
                adj[neighbor].add(node)
        elif isinstance(neighbors, dict):
            for neighbor in neighbors:
                adj[node].add(neighbor)
                adj[neighbor].add(node)
        elif isinstance(neighbors, list):
            for neighbor in neighbors:
                adj[node].add(neighbor)
                adj[neighbor].add(node)
    
    return dict(adj)


def _compute_edge_betweenness(graph):
    """
    Compute edge betweenness using Brandes' algorithm.
    
    Time Complexity: O(V * (V + E))
    Space Complexity: O(V + E)
    
    Returns:
        dict: Mapping (u, v) -> betweenness score
    """
    edge_betweenness = defaultdict(float)
    nodes = list(graph.keys())
    
    for source in nodes:
        # BFS from source to compute shortest paths
        stack = []
        predecessors = defaultdict(list)
        num_paths = defaultdict(int)
        distance = defaultdict(lambda: -1)
        
        num_paths[source] = 1
        distance[source] = 0
        
        queue = deque([source])
        
        while queue:
            v = queue.popleft()
            stack.append(v)
            
            for neighbor in graph.get(v, set()):
                # Found for the first time
                if distance[neighbor] < 0:
                    queue.append(neighbor)
                    distance[neighbor] = distance[v] + 1
                
                # Shortest path to neighbor goes through v
                if distance[neighbor] == distance[v] + 1:
                    num_paths[neighbor] += num_paths[v]
                    predecessors[neighbor].append(v)
        
        # Accumulate dependencies
        dependency = defaultdict(float)
        
        while stack:
            w = stack.pop()
            
            for v in predecessors[w]:
                # Fraction of shortest paths from source to w that pass through v
                contribution = (num_paths[v] / num_paths[w]) * (1 + dependency[w])
                dependency[v] += contribution
                
                # Add to edge betweenness (ordered pair to avoid double counting)
                edge = tuple(sorted([v, w]))
                edge_betweenness[edge] += contribution
    
    return dict(edge_betweenness)


def _remove_edge(graph, u, v):
    """Remove an undirected edge from the graph."""
    if u in graph and v in graph[u]:
        graph[u].discard(v)
    if v in graph and u in graph[v]:
        graph[v].discard(u)


def _get_components(graph):
    """
    Find connected components using BFS.
    
    Returns:
        list: List of sets, each containing nodes in one component
    """
    visited = set()
    components = []
    
    for node in graph:
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
    
    # Add isolated nodes (not in graph)
    all_nodes = set(graph.keys())
    for component in components:
        all_nodes -= component
    for isolated_node in all_nodes:
        components.append({isolated_node})
    
    return components


def _components_to_partition(components):
    """Convert list of components to node -> community_id mapping."""
    partition = {}
    for community_id, component in enumerate(components):
        for node in component:
            partition[node] = community_id
    return partition


def _number_of_communities(partition):
    """Count number of unique communities in partition."""
    return len(set(partition.values()))


def _modularity(graph, communities):
    """
    Compute modularity Q of a partition.
    
    Q = (1/2m) * Σ_ij [A_ij - (k_i * k_j)/(2m)] * δ(c_i, c_j)
    """
    # Build weighted adjacency
    if not graph:
        return 0.0
    
    weighted = {}
    for node, neighbors in graph.items():
        if isinstance(neighbors, dict):
            weighted[node] = dict(neighbors)
        elif isinstance(neighbors, set):
            weighted[node] = {n: 1.0 for n in neighbors}
        else:
            weighted[node] = {n: 1.0 for n in neighbors}
    
    total_weight = sum(sum(neighbors.values()) for neighbors in weighted.values())
    
    if total_weight == 0:
        return 0.0
    
    m = total_weight
    degrees = {node: sum(neighbors.values()) 
               for node, neighbors in weighted.items()}
    
    q = 0.0
    for node, neighbors in weighted.items():
        for neighbor, weight in neighbors.items():
            if communities.get(node) == communities.get(neighbor):
                q += weight - (degrees[node] * degrees[neighbor]) / m
    
    return q / m


def girvan_newman_single_split(graph):
    """
    Perform a single split: remove edges until graph divides into two.
    
    Useful as building block for recursive bisection approaches
    or when exactly two communities are desired.
    
    Time Complexity: O(k * V * E) where k is edges removed
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        tuple: (community1, community2) as sets of nodes
    """
    working_graph = _to_undirected_adjacency(graph)
    components = _get_components(working_graph)
    
    if len(components) >= 2:
        # Already split
        return components[0], components[1] if len(components) > 1 else set()
    
    if len(graph) < 2:
        return set(graph.keys()), set()
    
    while len(working_graph) > 0:
        edge_betweenness = _compute_edge_betweenness(working_graph)
        
        if not edge_betweenness:
            break
        
        # Remove edge with maximum betweenness
        max_edge = max(edge_betweenness, key=edge_betweenness.get)
        _remove_edge(working_graph, max_edge[0], max_edge[1])
        
        # Check if graph split
        components = _get_components(working_graph)
        if len(components) >= 2:
            return components[0], components[1]
    
    # Never split
    all_nodes = set(graph.keys())
    return all_nodes, set()