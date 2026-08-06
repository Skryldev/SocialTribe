import random
from collections import defaultdict


def louvain(graph, max_iterations=100, random_seed=None):
    """
    Louvain Community Detection Algorithm.
    
    Detects communities by optimizing modularity through a hierarchical
    greedy approach. Alternates between local node movement (Phase 1)
    and graph compression (Phase 2) until modularity converges.
    
    Time Complexity: O(V log V) for sparse graphs
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
               OR dict mapping node -> set of neighbors (unweighted)
        max_iterations: Maximum iterations per level (default: 100)
        random_seed: Seed for reproducible results
    
    Returns:
        dict: Mapping of node -> community_id (integer)
    
    Example:
        >>> graph = {
        ...     'A': {'B': 1, 'C': 1},
        ...     'B': {'A': 1, 'C': 1},
        ...     'C': {'A': 1, 'B': 1, 'D': 1},
        ...     'D': {'C': 1, 'E': 1, 'F': 1},
        ...     'E': {'D': 1, 'F': 1},
        ...     'F': {'D': 1, 'E': 1}
        ... }
        >>> communities = louvain(graph, random_seed=42)
        >>> len(set(communities.values()))
        2  # Two communities: {A,B,C} and {D,E,F}
    """
    if random_seed is not None:
        random.seed(random_seed)
    
    # Normalize to weighted format
    weighted_graph = _to_weighted(graph)
    
    if not weighted_graph:
        return {}
    
    # Initialize: each node is its own community
    nodes = list(weighted_graph.keys())
    communities = {node: i for i, node in enumerate(nodes)}
    
    # Compute total edge weight (2m for undirected)
    total_weight = _total_weight(weighted_graph)
    
    if total_weight == 0:
        return {node: i for i, node in enumerate(nodes)}
    
    # Pre-compute node degrees (strength)
    degrees = {node: sum(neighbors.values()) 
               for node, neighbors in weighted_graph.items()}
    
    # Iterative modularity optimization
    improved = True
    
    while improved:
        improved = False
        
        # Phase 1: Local modularity optimization
        communities, improved = _local_optimization(
            weighted_graph, communities, degrees, 
            total_weight, max_iterations
        )
        
        if improved:
            # Phase 2: Graph compression
            weighted_graph, communities, degrees = _graph_compression(
                weighted_graph, communities
            )
            total_weight = _total_weight(weighted_graph)
    
    # Final community assignment
    final_communities = _flatten_communities(communities)
    
    return final_communities


def _to_weighted(graph):
    """Convert graph to weighted format {node: {neighbor: weight}}."""
    if not graph:
        return {}
    
    weighted = {}
    for node, neighbors in graph.items():
        if isinstance(neighbors, set) or isinstance(neighbors, list):
            # Unweighted: use weight 1.0
            weighted[node] = {n: 1.0 for n in neighbors}
        elif isinstance(neighbors, dict):
            weighted[node] = dict(neighbors)
        else:
            raise ValueError(f"Invalid graph format for node {node}")
    
    return weighted


def _total_weight(graph):
    """Compute total edge weight (2m for undirected)."""
    total = 0.0
    for node, neighbors in graph.items():
        total += sum(neighbors.values())
    return total  # Sum of all edge weights (counts each edge twice)


def _local_optimization(graph, communities, degrees, 
                        total_weight, max_iterations):
    """
    Phase 1 of Louvain: Local modularity optimization.
    
    Moves nodes to neighboring communities if it increases modularity.
    """
    nodes = list(graph.keys())
    community_weights = _compute_community_weights(graph, communities, degrees)
    
    improved = False
    
    for iteration in range(max_iterations):
        movement = 0
        
        # Random order for node processing
        shuffled_nodes = nodes[:]
        random.shuffle(shuffled_nodes)
        
        for node in shuffled_nodes:
            current_community = communities[node]
            
            # Compute weights to each neighboring community
            neighbor_communities = _compute_neighbor_communities(
                graph, node, communities
            )
            
            # Compute modularity gain for best move
            best_community, best_gain = _best_modularity_move(
                graph, node, current_community, neighbor_communities,
                communities, community_weights, degrees, total_weight
            )
            
            if best_gain > 0 and best_community != current_community:
                # Move node to best community
                _move_node(
                    node, current_community, best_community,
                    communities, community_weights, 
                    graph, degrees
                )
                movement += 1
        
        if movement > 0:
            improved = True
        else:
            break  # Local optimum reached
    
    return communities, improved


def _compute_community_weights(graph, communities, degrees):
    """
    Compute total weight of each community.
    
    community_weights[c] = sum of degrees of all nodes in community c
    """
    weights = defaultdict(float)
    for node, community in communities.items():
        weights[community] += degrees[node]
    return weights


def _compute_neighbor_communities(graph, node, communities):
    """
    Compute the sum of edge weights from node to each community.
    """
    neighbor_coms = defaultdict(float)
    node_community = communities[node]
    
    for neighbor, weight in graph[node].items():
        neighbor_com = communities[neighbor]
        if neighbor_com != node_community:
            neighbor_coms[neighbor_com] += weight
    
    return neighbor_coms


def _best_modularity_move(graph, node, current_community, 
                          neighbor_communities, communities,
                          community_weights, degrees, total_weight):
    """
    Find the best community to move node to, based on modularity gain.
    
    ΔQ = [ (Σ_in + k_i_in) / 2m - ((Σ_tot + k_i) / 2m)² ]
         - [ Σ_in / 2m - (Σ_tot / 2m)² - (k_i / 2m)² ]
    
    Simplified to: ΔQ = k_i_in / m - Σ_tot * k_i / (2 * m²)
    """
    if total_weight == 0:
        return current_community, 0.0
    
    m = total_weight
    k_i = degrees[node]
    
    # Contribution of removing node from current community
    # (only if node is not alone in its community)
    best_community = current_community
    best_gain = 0.0
    
    for community, k_i_in in neighbor_communities.items():
        sigma_tot = community_weights[community]
        
        # Modularity gain
        gain = k_i_in / m - sigma_tot * k_i / (2 * m * m)
        
        if gain > best_gain:
            best_gain = gain
            best_community = community
    
    # Also consider staying in current community (gain = 0)
    if best_gain <= 0:
        best_community = current_community
        best_gain = 0.0
    
    return best_community, best_gain


def _move_node(node, old_community, new_community, 
               communities, community_weights, 
               graph, degrees):
    """Move node from old community to new community."""
    communities[node] = new_community
    
    # Update community weights
    community_weights[old_community] -= degrees[node]
    community_weights[new_community] += degrees[node]
    
    # Clean up empty communities
    if community_weights[old_community] <= 0:
        del community_weights[old_community]


def _graph_compression(graph, communities):
    """
    Phase 2 of Louvain: Graph compression.
    
    Creates a new weighted graph where each community becomes a super-node.
    """
    # Group nodes by community
    community_nodes = defaultdict(set)
    for node, community in communities.items():
        community_nodes[community].add(node)
    
    # Build compressed graph
    compressed = defaultdict(lambda: defaultdict(float))
    
    for community, nodes in community_nodes.items():
        compressed[community] = {}
    
    # Map each node to its community
    node_to_com = communities
    
    # Aggregate edges between communities
    for node, neighbors in graph.items():
        com_node = node_to_com[node]
        for neighbor, weight in neighbors.items():
            com_neighbor = node_to_com[neighbor]
            
            if com_node != com_neighbor:
                compressed[com_node][com_neighbor] += weight
                compressed[com_neighbor][com_node] += weight
            else:
                # Self-loop: internal edges within community
                compressed[com_node][com_node] = \
                    compressed[com_node].get(com_node, 0) + weight
    
    # Remove self-loops (they don't affect modularity optimization)
    for com in compressed:
        compressed[com].pop(com, None)
    
    # New community assignments (super-nodes)
    new_communities = {com: i for i, com in enumerate(sorted(compressed.keys()))}
    
    # Degrees in compressed graph
    new_degrees = {
        com: sum(neighbors.values()) 
        for com, neighbors in compressed.items()
    }
    
    # Rename communities for simplicity
    renamed_graph = {}
    for com, neighbors in compressed.items():
        renamed_graph[new_communities[com]] = {}
        for neighbor, weight in neighbors.items():
            renamed_graph[new_communities[com]][new_communities[neighbor]] = weight
    
    renamed_degrees = {
        new_communities[com]: deg for com, deg in new_degrees.items()
    }
    
    return dict(renamed_graph), new_communities, renamed_degrees


def _flatten_communities(communities):
    """
    Convert hierarchical community IDs to sequential integers.
    """
    unique_coms = sorted(set(communities.values()))
    com_mapping = {old: i for i, old in enumerate(unique_coms)}
    
    return {node: com_mapping[com] for node, com in communities.items()}


def modularity(graph, communities):
    """
    Compute the modularity Q of a partition.
    
    Q = (1/2m) * Σ_ij [A_ij - (k_i * k_j)/(2m)] * δ(c_i, c_j)
    
    Time Complexity: O(V + E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        communities: Dict mapping node -> community_id
    
    Returns:
        float: Modularity score (-1 to 1)
    """
    weighted_graph = _to_weighted(graph)
    total_weight = _total_weight(weighted_graph)
    
    if total_weight == 0:
        return 0.0
    
    m = total_weight
    degrees = {node: sum(neighbors.values()) 
               for node, neighbors in weighted_graph.items()}
    
    q = 0.0
    
    for node, neighbors in weighted_graph.items():
        for neighbor, weight in neighbors.items():
            if communities.get(node) == communities.get(neighbor):
                q += weight - (degrees[node] * degrees[neighbor]) / m
    
    q /= m
    
    return q