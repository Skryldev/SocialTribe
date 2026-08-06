import math


def pagerank(graph, damping_factor=0.85, max_iterations=100, 
             convergence_threshold=1e-6, verbose=False):
    """
    PageRank algorithm for computing node importance in directed graphs.
    
    Implements the iterative power method to compute the stationary 
    distribution of a random walk with damping factor.
    
    Time Complexity: O(k * (V + E)) where k is iterations to convergence
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of outgoing neighbors
        damping_factor: Probability of following links (default: 0.85)
        max_iterations: Maximum number of iterations
        convergence_threshold: Stop when max change < threshold
        verbose: Print convergence progress if True
    
    Returns:
        dict: Mapping of node -> PageRank score (sums to 1.0)
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    # Initialize equal ranks
    initial_rank = 1.0 / n
    ranks = {node: initial_rank for node in nodes}
    
    # Handle dangling nodes (no outgoing edges)
    out_degree = {}
    for node in nodes:
        neighbors = graph.get(node, set())
        out_degree[node] = len(neighbors)
    
    dangling_nodes = [node for node in nodes if out_degree[node] == 0]
    
    # Pre-compute teleport probability (random jump)
    teleport_prob = (1.0 - damping_factor) / n
    
    # Iterative computation
    for iteration in range(max_iterations):
        prev_ranks = ranks.copy()
        
        # Initialize new ranks with teleport probability
        new_ranks = {node: teleport_prob for node in nodes}
        
        # Distribute rank from dangling nodes evenly
        if dangling_nodes:
            dangling_sum = damping_factor * sum(
                prev_ranks[node] for node in dangling_nodes
            ) / n
            for node in nodes:
                new_ranks[node] += dangling_sum
        
        # Distribute ranks along edges
        for node in nodes:
            neighbors = graph.get(node, set())
            if out_degree[node] > 0:
                contribution = damping_factor * prev_ranks[node] / out_degree[node]
                for neighbor in neighbors:
                    new_ranks[neighbor] += contribution
        
        # Calculate convergence (L1 norm of change)
        diff = sum(abs(new_ranks[node] - prev_ranks[node]) for node in nodes)
        
        ranks = new_ranks
        
        if verbose:
            print(f"Iteration {iteration + 1}: max change = {diff:.10f}")
        
        # Check convergence
        if diff < convergence_threshold:
            if verbose:
                print(f"Converged after {iteration + 1} iterations")
            break
    
    # Normalize to ensure sum is exactly 1.0
    total = sum(ranks.values())
    if total > 0:
        ranks = {node: score / total for node, score in ranks.items()}
    
    return ranks


def personalized_pagerank(graph, personalization_nodes, 
                          damping_factor=0.85, max_iterations=100,
                          convergence_threshold=1e-6):
    """
    Personalized PageRank biased towards specific nodes.
    
    Time Complexity: O(k * (V + E))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of outgoing neighbors
        personalization_nodes: Dict of node -> weight (should sum to 1.0)
        damping_factor: Probability of following links
        max_iterations: Maximum iterations
        convergence_threshold: Convergence threshold
    
    Returns:
        dict: Mapping of node -> personalized PageRank score
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    # Normalize personalization vector
    total_weight = sum(personalization_nodes.values())
    if total_weight == 0:
        raise ValueError("Personalization weights must sum to positive value")
    
    teleport = {node: personalization_nodes.get(node, 0) / total_weight 
                for node in nodes}
    
    # Initialize ranks
    ranks = {node: 1.0 / n for node in nodes}
    
    # Handle dangling nodes
    out_degree = {node: len(graph.get(node, set())) for node in nodes}
    
    # Iterative computation
    for iteration in range(max_iterations):
        prev_ranks = ranks.copy()
        
        # Initialize with personalized teleport
        new_ranks = {node: (1.0 - damping_factor) * teleport[node] 
                     for node in nodes}
        
        # Dangling nodes distribute to personalized vector
        dangling_dist = {}
        for node in nodes:
            if out_degree[node] == 0:
                rank_to_distribute = damping_factor * prev_ranks[node]
                for target, weight in teleport.items():
                    dangling_dist[target] = dangling_dist.get(target, 0) + \
                                           rank_to_distribute * weight
        
        for node in nodes:
            new_ranks[node] += dangling_dist.get(node, 0)
        
        # Main rank distribution
        for node in nodes:
            neighbors = graph.get(node, set())
            if out_degree[node] > 0:
                contribution = damping_factor * prev_ranks[node] / out_degree[node]
                for neighbor in neighbors:
                    new_ranks[neighbor] += contribution
        
        # Check convergence
        diff = sum(abs(new_ranks[node] - prev_ranks[node]) for node in nodes)
        ranks = new_ranks
        
        if diff < convergence_threshold:
            break
    
    return ranks


def get_top_pagerank(graph, k=10, **kwargs):
    """
    Get the k nodes with highest PageRank scores.
    
    Time Complexity: O(k * (V + E) + V log V)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of outgoing neighbors
        k: Number of top nodes to return
        **kwargs: Additional arguments passed to pagerank()
    
    Returns:
        list: Tuples of (node, score) sorted by score descending
    """
    ranks = pagerank(graph, **kwargs)
    
    sorted_nodes = sorted(
        ranks.items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    return sorted_nodes[:k]


def pagerank_sparse_matrix(graph, damping_factor=0.85, 
                           max_iterations=100, convergence_threshold=1e-6):
    """
    Memory-efficient PageRank using sparse operations for large graphs.
    Suitable when the full transition matrix cannot fit in memory.
    
    Time Complexity: O(k * E)
    Space Complexity: O(V + E) for sparse representation
    
    Args:
        graph: Dict mapping node -> set/list of outgoing neighbors
        damping_factor: Damping factor (default: 0.85)
        max_iterations: Maximum number of iterations
        convergence_threshold: Convergence threshold
    
    Returns:
        dict: Mapping of node -> PageRank score
    """
    if not graph:
        return {}
    
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    # Build reverse adjacency for efficient in-link computation
    in_links = {node: [] for node in nodes}
    for source, targets in graph.items():
        if targets:
            for target in targets:
                if target in in_links:
                    in_links[target].append(source)
    
    # Initialize ranks
    ranks = {node: 1.0 / n for node in nodes}
    
    # Compute out-degrees
    out_degree = {node: len(graph.get(node, set())) for node in nodes}
    
    for iteration in range(max_iterations):
        # Handle dangling nodes
        dangling_sum = sum(ranks[node] for node in nodes 
                          if out_degree[node] == 0)
        
        new_ranks = {}
        for node in nodes:
            # Random jump component (includes dangling distribution)
            rank_sum = (1.0 - damping_factor + damping_factor * dangling_sum) / n
            
            # Contributions from in-links
            for in_node in in_links[node]:
                if out_degree[in_node] > 0:
                    rank_sum += damping_factor * ranks[in_node] / out_degree[in_node]
            
            new_ranks[node] = rank_sum
        
        # Check convergence
        diff = sum(abs(new_ranks[node] - ranks[node]) for node in nodes)
        ranks = new_ranks
        
        if diff < convergence_threshold:
            break
    
    return ranks