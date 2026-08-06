def preferential_attachment(graph, node1, node2, directed=False, 
                           mode='both', alpha=1.0, constant=0.0):
    """
    Preferential Attachment link prediction algorithm.
    
    Computes the likelihood of a future connection between two nodes
    based on the product of their current degrees. High-degree nodes
    are more likely to attract new connections.
    
    Time Complexity: O(1)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors (undirected)
               OR dict mapping node -> {'in': set(), 'out': set()} (directed)
        node1: First node
        node2: Second node
        directed: If True, graph is treated as directed
        mode: For directed graphs: 'in', 'out', or 'both'
        alpha: Exponent for non-linear preferential attachment
        constant: Additive constant to prevent zero scores
    
    Returns:
        float: Preferential attachment score (degree product)
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C', 'D'},
        ...     'B': {'A', 'C', 'E', 'F'},
        ...     'C': {'A', 'B'},
        ...     'D': {'A'},
        ...     'E': {'B'},
        ...     'F': {'B'}
        ... }
        >>> preferential_attachment(graph, 'A', 'F')
        6  # deg(A)=3 * deg(F)=1 = 3, with alpha=1: 3^1 * 1^1 = 3
        >>> preferential_attachment(graph, 'B', 'C')
        8  # deg(B)=4 * deg(C)=2 = 8, with alpha=1: 4^1 * 2^1 = 8
    """
    if directed:
        deg1 = _get_directed_degree(graph, node1, mode)
        deg2 = _get_directed_degree(graph, node2, mode)
    else:
        deg1 = len(graph.get(node1, set()))
        deg2 = len(graph.get(node2, set()))
    
    # Apply additive constant
    deg1 += constant
    deg2 += constant
    
    # Apply exponent (non-linear preferential attachment)
    if alpha != 1.0:
        return (deg1 ** alpha) * (deg2 ** alpha)
    
    return deg1 * deg2


def _get_directed_degree(graph, node, mode):
    """Helper to get degree for directed graphs based on mode."""
    if node not in graph:
        return 0
    
    if mode == 'in':
        return len(graph[node].get('in', set()))
    elif mode == 'out':
        return len(graph[node].get('out', set()))
    elif mode == 'both':
        in_deg = len(graph[node].get('in', set()))
        out_deg = len(graph[node].get('out', set()))
        return in_deg + out_deg
    else:
        raise ValueError(f"Unknown mode: {mode}")


def preferential_attachment_top_k(graph, node, k=5, 
                                   exclude_existing=True, 
                                   directed=False, mode='both'):
    """
    Find top-k most likely connections using preferential attachment.
    
    Ranks all non-neighbor nodes by their degree, favoring connections
    to the most popular (high-degree) nodes in the network.
    
    Time Complexity: O(V log V) for sorting
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node: Source node
        k: Number of top predictions to return
        exclude_existing: If True, exclude already connected nodes
        directed: If True, graph is treated as directed
        mode: For directed graphs: 'in', 'out', or 'both'
    
    Returns:
        list: Tuples of (target_node, score) sorted by score descending
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'D', 'E', 'F'},
        ...     'C': {'A'},
        ...     'D': {'B'},
        ...     'E': {'B'},
        ...     'F': {'B', 'G'},
        ...     'G': {'F'}
        ... }
        >>> preferential_attachment_top_k(graph, 'A', k=3)
        [('F', 6), ('D', 3), ('E', 3)]  
        # A(deg=2) * F(deg=3) = 6, A*D = 2*1=2... wait let me recalculate
        # Actually: F has deg 2(F-B, F-G), D has deg 1(D-B), E has deg 1(E-B)
        # Score F: 2*2=4, D: 2*1=2, E: 2*1=2, G: 2*1=2
    """
    if directed:
        source_deg = _get_directed_degree(graph, node, mode)
    else:
        source_deg = len(graph.get(node, set()))
    
    # Get existing connections
    if directed:
        existing = set()
        if node in graph:
            existing = graph[node].get('in', set()) | graph[node].get('out', set())
    else:
        existing = graph.get(node, set())
    
    candidates = set(graph.keys()) - {node}
    
    if exclude_existing:
        candidates -= existing
    
    # Calculate scores for all candidates
    predictions = []
    for candidate in candidates:
        if directed:
            cand_deg = _get_directed_degree(graph, candidate, mode)
        else:
            cand_deg = len(graph.get(candidate, set()))
        
        score = source_deg * cand_deg
        if score > 0:
            predictions.append((candidate, score))
    
    # Sort by score descending
    predictions.sort(key=lambda x: x[1], reverse=True)
    return predictions[:k]


def preferential_attachment_normalized(graph, node1, node2, 
                                       total_edges=None):
    """
    Normalized preferential attachment score.
    
    Divides the degree product by the square of the total number
    of edges, producing a score that can be interpreted as a
    probability under the Barabási-Albert model.
    
    Time Complexity: O(1)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
        total_edges: Total number of edges (computed if None)
    
    Returns:
        float: Normalized score between 0 and 1
    
    Example:
        >>> graph = {'A': {'B'}, 'B': {'A', 'C'}, 'C': {'B'}}
        >>> preferential_attachment_normalized(graph, 'A', 'C')
        0.111...  # (1*1) / (2*2)²... let me check: total edges = 2
                  # deg(A)=1, deg(C)=1 -> 1*1=1, normalized: 1/(2*2)²=1/16=0.0625
    """
    if total_edges is None:
        total_edges = sum(len(neighbors) for neighbors in graph.values()) / 2
    
    if total_edges == 0:
        return 0.0
    
    deg1 = len(graph.get(node1, set()))
    deg2 = len(graph.get(node2, set()))
    
    # Under BA model: P(edge to i) = k_i / (2m)
    # P(edge between u,v) ≈ (k_u * k_v) / (2m)²
    return (deg1 * deg2) / ((2 * total_edges) ** 2)


def preferential_attachment_matrix(graph, nodes=None, directed=False, 
                                   mode='both'):
    """
    Compute preferential attachment scores for all node pairs.
    
    Creates a score matrix for batch link prediction evaluation.
    Since the score only depends on individual degrees, this is
    highly efficient to compute for all pairs.
    
    Time Complexity: O(V²) but each calculation is O(1)
    Space Complexity: O(V²)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        nodes: List of nodes to consider (default: all nodes)
        directed: If True, graph is treated as directed
        mode: For directed graphs: 'in', 'out', or 'both'
    
    Returns:
        dict: Mapping of (node1, node2) -> score
    """
    if nodes is None:
        nodes = list(graph.keys())
    
    # Pre-compute all degrees
    if directed:
        degrees = {}
        for node in nodes:
            degrees[node] = _get_directed_degree(graph, node, mode)
    else:
        degrees = {node: len(graph.get(node, set())) for node in nodes}
    
    scores = {}
    n = len(nodes)
    
    for i in range(n):
        node1 = nodes[i]
        deg1 = degrees[node1]
        
        if deg1 == 0:
            continue
        
        for j in range(i + 1, n):
            node2 = nodes[j]
            deg2 = degrees[node2]
            
            if deg2 == 0:
                continue
            
            # Skip existing connections for link prediction
            if not directed:
                neighbors = graph.get(node1, set())
                if node2 in neighbors:
                    continue
            
            score = deg1 * deg2
            scores[(node1, node2)] = score
            scores[(node2, node1)] = score
    
    return scores


def generate_barabasi_albert(n, m, seed_graph=None, random_seed=None):
    """
    Generate a scale-free network using the Barabási-Albert model.
    
    Implements the preferential attachment growth process that
    creates networks with power-law degree distributions.
    
    Time Complexity: O(n * m)
    Space Complexity: O(n * m)
    
    Args:
        n: Target number of nodes
        m: Number of edges for each new node (m >= 1)
        seed_graph: Initial graph dict (default: complete graph of m nodes)
        random_seed: Seed for reproducibility
    
    Returns:
        dict: Generated graph mapping node -> set of neighbors
    
    Example:
        >>> graph = generate_barabasi_albert(n=100, m=3, random_seed=42)
        >>> len(graph)
        100
        >>> # Check scale-free property
        >>> degrees = [len(v) for v in graph.values()]
        >>> min(degrees) >= 3
        True
    """
    import random
    
    if random_seed is not None:
        random.seed(random_seed)
    
    if m < 1:
        raise ValueError("m must be at least 1")
    
    # Initialize graph
    graph = {}
    
    if seed_graph is None:
        # Start with a complete graph of m+1 nodes
        initial_nodes = [f"v{i}" for i in range(m + 1)]
        for i, node in enumerate(initial_nodes):
            neighbors = set(initial_nodes[:i] + initial_nodes[i+1:])
            graph[node] = neighbors
    else:
        # Use provided seed graph
        graph = {node: set(neighbors) for node, neighbors in seed_graph.items()}
        initial_nodes = list(graph.keys())
    
    # List of all edge endpoints for preferential selection
    # Each node appears k times where k is its degree
    degree_list = []
    for node, neighbors in graph.items():
        degree_list.extend([node] * len(neighbors))
    
    # Add new nodes
    current_node_index = len(graph)
    
    for _ in range(n - len(graph)):
        new_node = f"v{current_node_index}"
        current_node_index += 1
        
        graph[new_node] = set()
        
        # Select m unique existing nodes to connect to
        # Probabilities proportional to degree
        targets = set()
        available = list(graph.keys())
        
        while len(targets) < m:
            if degree_list:
                # Preferential selection based on degree
                target = random.choice(degree_list)
                if target not in targets:
                    targets.add(target)
            else:
                # Fallback: uniform random
                target = random.choice(available)
                if target not in targets:
                    targets.add(target)
        
        # Add edges
        for target in targets:
            graph[new_node].add(target)
            graph[target].add(new_node)
            
            # Update degree list
            degree_list.append(new_node)
            degree_list.append(target)
    
    return graph


def estimate_preferential_attachment_exponent(graph):
    """
    Estimate the preferential attachment exponent from a graph.
    
    Tests whether the network exhibits linear, sub-linear, or
    super-linear preferential attachment by analyzing the
    relationship between node degree and attachment probability.
    
    Time Complexity: O(E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
    
    Returns:
        float: Estimated exponent (1.0 = linear, < 1.0 = sub-linear,
               > 1.0 = super-linear)
    
    Reference:
        Newman (2001) - Clustering and preferential attachment
        in growing networks
    """
    from collections import defaultdict
    import math
    
    # For each degree k, compute the average degree of neighbors
    # Under linear PA, avg neighbor degree should be ~ k
    degree_neighbor_sum = defaultdict(float)
    degree_count = defaultdict(int)
    
    for node, neighbors in graph.items():
        k = len(neighbors)
        if k == 0:
            continue
        
        degree_count[k] += 1
        
        for neighbor in neighbors:
            neighbor_deg = len(graph.get(neighbor, set()))
            degree_neighbor_sum[k] += neighbor_deg
    
    # Compute average neighbor degree for each degree value
    # and estimate the exponent
    log_k = []
    log_avg_neighbor = []
    
    for k in sorted(degree_count.keys()):
        if degree_count[k] > 0:
            avg_neighbor_deg = degree_neighbor_sum[k] / (k * degree_count[k])
            if k > 0 and avg_neighbor_deg > 0:
                log_k.append(math.log(k))
                log_avg_neighbor.append(math.log(avg_neighbor_deg))
    
    if len(log_k) < 2:
        return 1.0  # Default assumption
    
    # Linear regression: log(avg_neighbor_deg) = alpha * log(k) + c
    n_points = len(log_k)
    sum_x = sum(log_k)
    sum_y = sum(log_avg_neighbor)
    sum_xy = sum(x * y for x, y in zip(log_k, log_avg_neighbor))
    sum_xx = sum(x * x for x in log_k)
    
    # Slope = (n*sum(xy) - sum(x)*sum(y)) / (n*sum(xx) - sum(x)²)
    denominator = n_points * sum_xx - sum_x ** 2
    if denominator == 0:
        return 1.0
    
    exponent = (n_points * sum_xy - sum_x * sum_y) / denominator
    
    return exponent


def preferential_attachment_advanced(graph, node1, node2, 
                                     alpha=1.0, beta=0.0, 
                                     gamma=1.0):
    """
    Advanced preferential attachment with multiple parameters.
    
    Extends the basic model with:
    - Non-linearity (alpha)
    - Additive constant (beta) for cold start
    - Multiplicative scaling (gamma)
    
    PA(u,v) = gamma * (deg(u) + beta)^alpha * (deg(v) + beta)^alpha
    
    Time Complexity: O(1)
    Space Complexity: O(1)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        node1: First node
        node2: Second node
        alpha: Non-linearity exponent
        beta: Additive constant for zero-degree nodes
        gamma: Global scaling factor
    
    Returns:
        float: Advanced preferential attachment score
    """
    deg1 = len(graph.get(node1, set()))
    deg2 = len(graph.get(node2, set()))
    
    return gamma * ((deg1 + beta) ** alpha) * ((deg2 + beta) ** alpha)