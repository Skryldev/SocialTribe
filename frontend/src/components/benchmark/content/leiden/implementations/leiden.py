import random
from collections import defaultdict, deque


def leiden(graph, max_iterations=100, random_seed=None):
    """
    Leiden Community Detection Algorithm.
    
    Detects communities by optimizing modularity through a three-phase
    process: local moving, refinement, and aggregation. Guarantees
    well-connected communities unlike Louvain.
    
    Time Complexity: O(V log V) for sparse graphs
    Space Complexity: O(V + E)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
               OR dict mapping node -> set of neighbors (unweighted)
        max_iterations: Maximum iterations per level
        random_seed: Seed for reproducible results
    
    Returns:
        dict: Mapping of node -> community_id (integer)
    
    Example:
        >>> graph = {
        ...     'A': {'B': 1, 'C': 1},
        ...     'B': {'A': 1, 'C': 1, 'D': 1},
        ...     'C': {'A': 1, 'B': 1},
        ...     'D': {'B': 1, 'E': 1, 'F': 1},
        ...     'E': {'D': 1, 'F': 1},
        ...     'F': {'D': 1, 'E': 1}
        ... }
        >>> communities = leiden(graph, random_seed=42)
        >>> len(set(communities.values()))
        2  # Two communities: {A,B,C} and {D,E,F}
    """
    if random_seed is not None:
        random.seed(random_seed)
    
    # Normalize to weighted format
    weighted_graph = _to_weighted(graph)
    
    if not weighted_graph:
        return {}
    
    nodes = list(weighted_graph.keys())
    n = len(nodes)
    
    if n == 1:
        return {nodes[0]: 0}
    
    # Initialize: each node is its own community
    partition = {node: i for i, node in enumerate(nodes)}
    
    # Total edge weight (2m for undirected)
    total_weight = _total_weight(weighted_graph)
    
    if total_weight == 0:
        return partition
    
    # Pre-compute node degrees
    degrees = {node: sum(neighbors.values()) 
               for node, neighbors in weighted_graph.items()}
    
    # Iterative Leiden algorithm
    improved = True
    
    while improved:
        # Phase 1: Local moving
        partition, improved = _local_moving(
            weighted_graph, partition, degrees, 
            total_weight, max_iterations
        )
        
        if not improved:
            break
        
        # Phase 2: Refinement
        refined_partition = _refinement(
            weighted_graph, partition, degrees, total_weight
        )
        
        # Phase 3: Aggregation based on refined partition
        weighted_graph, partition, degrees = _aggregate_graph(
            weighted_graph, refined_partition
        )
        total_weight = _total_weight(weighted_graph)
    
    # Flatten final partition to sequential integers
    return _flatten_partition(partition)


def _to_weighted(graph):
    """Convert graph to weighted format {node: {neighbor: weight}}."""
    if not graph:
        return {}
    
    weighted = {}
    for node, neighbors in graph.items():
        if isinstance(neighbors, set) or isinstance(neighbors, list):
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
    return total


def _local_moving(graph, partition, degrees, total_weight, max_iterations):
    """
    Phase 1: Local moving phase (similar to Louvain).
    
    Moves nodes to neighboring communities if modularity increases.
    """
    nodes = list(graph.keys())
    community_weights = _compute_community_weights(partition, degrees)
    
    improved = False
    
    for iteration in range(max_iterations):
        movement = 0
        shuffled_nodes = nodes[:]
        random.shuffle(shuffled_nodes)
        
        for node in shuffled_nodes:
            current_community = partition[node]
            
            # Compute weights to neighboring communities
            neighbor_coms = _get_neighbor_communities(
                graph, node, partition
            )
            
            # Best move based on modularity gain
            best_community, best_gain = _best_modularity_move(
                graph, node, current_community, neighbor_coms,
                partition, community_weights, degrees, total_weight
            )
            
            if best_gain > 0 and best_community != current_community:
                _move_node(
                    node, current_community, best_community,
                    partition, community_weights, degrees
                )
                movement += 1
        
        if movement > 0:
            improved = True
        else:
            break
    
    return partition, improved


def _compute_community_weights(partition, degrees):
    """Compute total degree (weight) of each community."""
    weights = defaultdict(float)
    for node, community in partition.items():
        weights[community] += degrees[node]
    return weights


def _get_neighbor_communities(graph, node, partition):
    """Compute sum of edge weights from node to each community."""
    neighbor_coms = defaultdict(float)
    node_com = partition[node]
    
    for neighbor, weight in graph[node].items():
        neighbor_com = partition[neighbor]
        if neighbor_com != node_com:
            neighbor_coms[neighbor_com] += weight
    
    return neighbor_coms


def _best_modularity_move(graph, node, current_com, neighbor_coms,
                          partition, com_weights, degrees, total_weight):
    """Find best community to move node to (modularity gain)."""
    m = total_weight
    k_i = degrees[node]
    
    best_com = current_com
    best_gain = 0.0
    
    for community, k_i_in in neighbor_coms.items():
        sigma_tot = com_weights[community]
        gain = k_i_in / m - sigma_tot * k_i / (2 * m * m)
        
        if gain > best_gain:
            best_gain = gain
            best_com = community
    
    return best_com, best_gain


def _move_node(node, old_com, new_com, partition, com_weights, degrees):
    """Move node between communities."""
    partition[node] = new_com
    com_weights[old_com] -= degrees[node]
    com_weights[new_com] += degrees[node]
    
    if com_weights[old_com] <= 0:
        del com_weights[old_com]


def _refinement(graph, partition, degrees, total_weight):
    """
    Phase 2: Refinement phase.
    
    Splits each community from Phase 1 into well-connected
    sub-communities. This guarantees that final communities
    are internally connected.
    """
    # Group nodes by Phase-1 community
    com_nodes = defaultdict(set)
    for node, com in partition.items():
        com_nodes[com].add(node)
    
    refined_partition = {}
    
    for community, nodes in com_nodes.items():
        if len(nodes) <= 1:
            for node in nodes:
                refined_partition[node] = node  # Each node is its own sub-com
            continue
        
        # Initialize: each node is its own refined community
        node_to_refined = {node: node for node in nodes}
        refined_weights = {node: degrees[node] for node in nodes}
        
        # Build subgraph for this community
        subgraph = _build_subgraph(graph, nodes)
        
        # Local merging within the community
        nodes_list = list(nodes)
        random.shuffle(nodes_list)
        
        for node in nodes_list:
            current_ref = node_to_refined[node]
            
            # Find neighboring refined communities
            neighbor_refs = defaultdict(float)
            for neighbor, weight in subgraph.get(node, {}).items():
                neighbor_ref = node_to_refined[neighbor]
                if neighbor_ref != current_ref:
                    neighbor_refs[neighbor_ref] += weight
            
            if not neighbor_refs:
                continue
            
            # Best merge based on modularity within this community
            best_ref = current_ref
            best_gain = 0.0
            
            for ref_com, edge_weight in neighbor_refs.items():
                # Modularity gain within the sub-community
                gain = edge_weight / total_weight
                gain -= (refined_weights[ref_com] * degrees[node]) / (2 * total_weight * total_weight)
                
                if gain > best_gain:
                    best_gain = gain
                    best_ref = ref_com
            
            if best_gain > 0 and best_ref != current_ref:
                # Merge: move node to the best refined community
                _merge_refined(
                    node, current_ref, best_ref,
                    node_to_refined, refined_weights,
                    nodes, degrees
                )
        
        # Add refined communities to partition
        for node in nodes:
            refined_partition[node] = node_to_refined[node]
    
    return refined_partition


def _build_subgraph(graph, nodes):
    """Build subgraph containing only specified nodes."""
    subgraph = {}
    node_set = set(nodes)
    
    for node in nodes:
        subgraph[node] = {}
        for neighbor, weight in graph[node].items():
            if neighbor in node_set:
                subgraph[node][neighbor] = weight
    
    return subgraph


def _merge_refined(node, old_ref, new_ref, node_to_refined, 
                   refined_weights, all_nodes, degrees):
    """Merge node into a refined community."""
    # Update all nodes in old refined community to new one
    for n in all_nodes:
        if node_to_refined[n] == old_ref:
            node_to_refined[n] = new_ref
    
    refined_weights[new_ref] += refined_weights.get(old_ref, 0)
    refined_weights.pop(old_ref, None)


def _aggregate_graph(graph, refined_partition):
    """
    Phase 3: Graph aggregation.
    
    Build compressed graph where each refined community
    becomes a super-node.
    """
    # Group nodes by refined community
    ref_groups = defaultdict(set)
    for node, ref_com in refined_partition.items():
        ref_groups[ref_com].add(node)
    
    # Build compressed graph
    compressed = defaultdict(lambda: defaultdict(float))
    
    for ref_com, nodes in ref_groups.items():
        for node in nodes:
            for neighbor, weight in graph[node].items():
                neighbor_ref = refined_partition[neighbor]
                if neighbor_ref != ref_com:
                    compressed[ref_com][neighbor_ref] += weight
    
    # Remove self-loops
    for com in compressed:
        compressed[com].pop(com, None)
    
    # New partition for compressed graph
    unique_refs = sorted(ref_groups.keys())
    new_partition = {ref: i for i, ref in enumerate(unique_refs)}
    
    # Rename to sequential integers
    renamed_graph = {}
    for com, neighbors in compressed.items():
        renamed_graph[new_partition[com]] = {}
        for neighbor, weight in neighbors.items():
            renamed_graph[new_partition[com]][new_partition[neighbor]] = weight
    
    # New degrees
    new_degrees = {}
    for com in unique_refs:
        new_degrees[new_partition[com]] = sum(
            sum(graph[node][neighbor] 
                for neighbor in graph[node] 
                if refined_partition[neighbor] != com)
            for node in ref_groups[com]
        )
    
    return dict(renamed_graph), new_partition, new_degrees


def _flatten_partition(partition):
    """Convert partition to sequential integers starting from 0."""
    unique_coms = sorted(set(partition.values()))
    mapping = {old: i for i, old in enumerate(unique_coms)}
    return {node: mapping[com] for node, com in partition.items()}


def leiden_modularity(graph, communities):
    """
    Compute modularity Q of a partition (same formula as Louvain).
    
    Args:
        graph: Dict mapping node -> dict/set of neighbors
        communities: Dict mapping node -> community_id
    
    Returns:
        float: Modularity score (-1 to 1)
    """
    weighted = _to_weighted(graph)
    total_weight = _total_weight(weighted)
    
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


def verify_connected_communities(graph, communities):
    """
    Verify that all communities are internally connected.
    
    This is the key guarantee that Leiden provides but Louvain doesn't.
    
    Args:
        graph: Dict mapping node -> set/dict of neighbors
        communities: Dict mapping node -> community_id
    
    Returns:
        tuple: (all_connected, disconnected_communities)
            - all_connected: True if all communities are connected
            - disconnected_communities: List of community IDs that are disconnected
    """
    # Group nodes by community
    com_nodes = defaultdict(set)
    for node, com in communities.items():
        com_nodes[com].add(node)
    
    disconnected = []
    
    for com, nodes in com_nodes.items():
        if len(nodes) <= 1:
            continue
        
        # Check connectivity using BFS from first node
        start = next(iter(nodes))
        visited = set()
        queue = deque([start])
        visited.add(start)
        
        while queue:
            current = queue.popleft()
            for neighbor in graph.get(current, {}):
                if (neighbor in nodes and 
                    neighbor not in visited and
                    communities.get(neighbor) == com):
                    visited.add(neighbor)
                    queue.append(neighbor)
        
        if len(visited) != len(nodes):
            disconnected.append(com)
    
    return len(disconnected) == 0, disconnected