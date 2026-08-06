import math
from collections import defaultdict


def eigenvector_centrality(graph, max_iterations=100, tolerance=1e-6, 
                          normalized=True, weighted=False):
    """
    Eigenvector Centrality using power iteration method.
    
    Computes node importance based on the principle that connections
    to high-scoring nodes contribute more than connections to
    low-scoring nodes.
    
    Time Complexity: O(k * (V + E)) where k is iterations to convergence
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors (unweighted)
               OR dict mapping node -> dict of {neighbor: weight} (weighted)
        max_iterations: Maximum number of power iterations
        tolerance: Convergence threshold for L2 norm of change
        normalized: If True, normalize scores to sum to 1
        weighted: If True, use edge weights from dict format
    
    Returns:
        dict: Mapping of node -> eigenvector centrality score
    
    Example:
        >>> graph = {
        ...     'A': {'B', 'C'},
        ...     'B': {'A', 'C', 'D'},
        ...     'C': {'A', 'B', 'D', 'E'},
        ...     'D': {'B', 'C', 'E', 'F'},
        ...     'E': {'C', 'D', 'F'},
        ...     'F': {'D', 'E'}
        ... }
        >>> centrality = eigenvector_centrality(graph)
        >>> sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        [('D', 0.45...), ('C', 0.45...), ('E', 0.37...), ...]
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    # Handle single node
    if n == 1:
        return {nodes[0]: 1.0}
    
    # Initialize centrality vector with 1.0 for all nodes
    x = {node: 1.0 for node in nodes}
    
    # Pre-compute adjacency for faster iterations
    if weighted:
        # Weighted adjacency
        adj = {node: dict(neighbors) for node, neighbors in graph.items()}
    else:
        # Unweighted adjacency (convert sets to dicts with weight 1)
        adj = {}
        for node, neighbors in graph.items():
            if isinstance(neighbors, set) or isinstance(neighbors, list):
                adj[node] = {n: 1.0 for n in neighbors}
            else:
                adj[node] = dict(neighbors)
    
    # Power iteration
    for iteration in range(max_iterations):
        # Compute x_new = A * x
        x_new = {node: 0.0 for node in nodes}
        
        for node in nodes:
            for neighbor, weight in adj.get(node, {}).items():
                x_new[neighbor] += x[node] * weight
        
        # Normalize (L2 norm)
        norm = math.sqrt(sum(v ** 2 for v in x_new.values()))
        
        if norm == 0:
            # All zero - graph may be empty or disconnected
            return {node: 0.0 for node in nodes}
        
        for node in nodes:
            x_new[node] /= norm
        
        # Check convergence
        diff = math.sqrt(
            sum((x_new[node] - x[node]) ** 2 for node in nodes)
        )
        
        x = x_new
        
        if diff < tolerance:
            break
    
    # Normalize to sum to 1 or max to 1
    if normalized:
        total = sum(x.values())
        if total > 0:
            x = {node: score / total for node, score in x.items()}
    
    return x


def eigenvector_centrality_sparse(graph, max_iterations=100, 
                                  tolerance=1e-6, normalized=True):
    """
    Memory-efficient eigenvector centrality for large sparse graphs.
    
    Uses adjacency list operations instead of matrix multiplication
    to reduce memory overhead.
    
    Time Complexity: O(k * E) where k is iterations, E is edges
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
        max_iterations: Maximum iterations
        tolerance: Convergence threshold
        normalized: If True, normalize scores to sum to 1
    
    Returns:
        dict: Mapping of node -> eigenvector centrality
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    if n == 1:
        return {nodes[0]: 1.0}
    
    # Initialize
    x = {node: 1.0 / math.sqrt(n) for node in nodes}
    
    # Power iteration with sparse operations
    for iteration in range(max_iterations):
        # Matrix-vector multiply: y = A * x
        y = {node: 0.0 for node in nodes}
        
        for node, neighbors in graph.items():
            if not neighbors:
                continue
            x_node = x[node]
            for neighbor in neighbors:
                y[neighbor] += x_node
        
        # Compute L2 norm
        norm = math.sqrt(sum(v ** 2 for v in y.values()))
        
        if norm == 0:
            return {node: 0.0 for node in nodes}
        
        # Normalize and check convergence
        diff = 0.0
        for node in nodes:
            new_val = y[node] / norm
            diff += (new_val - x[node]) ** 2
            x[node] = new_val
        
        if math.sqrt(diff) < tolerance:
            break
    
    # Final normalization
    if normalized:
        total = sum(x.values())
        if total > 0:
            x = {node: score / total for node, score in x.items()}
    
    return x


def eigenvector_centrality_directed(graph, mode='out', max_iterations=100,
                                    tolerance=1e-6, normalized=True):
    """
    Eigenvector centrality for directed graphs.
    
    In directed graphs, either incoming or outgoing connections
    determine centrality. For most applications, use 'in' mode
    (nodes receiving links from important nodes are important).
    
    Time Complexity: O(k * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of outgoing neighbors
        mode: 'in' for prestige (receiving), 'out' for influence (sending)
        max_iterations: Maximum iterations
        tolerance: Convergence threshold
        normalized: If True, normalize scores
    
    Returns:
        dict: Mapping of node -> eigenvector centrality
    
    Example:
        >>> # Twitter-like directed graph (following relationships)
        >>> graph = {
        ...     'A': {'B', 'C'},  # A follows B and C
        ...     'B': {'C'},
        ...     'C': {'D'},
        ...     'D': {'A', 'B'}
        ... }
        >>> # 'in' mode measures prestige (who is followed by important people)
        >>> centrality = eigenvector_centrality_directed(graph, mode='in')
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    if n == 1:
        return {nodes[0]: 1.0}
    
    # Build transpose graph for 'in' mode
    if mode == 'in':
        transpose = defaultdict(set)
        for node, neighbors in graph.items():
            for neighbor in neighbors:
                transpose[neighbor].add(node)
        graph = transpose
    
    # Use sparse implementation
    return eigenvector_centrality_sparse(graph, max_iterations, 
                                         tolerance, normalized)


def eigenvector_centrality_weighted(graph, max_iterations=100,
                                    tolerance=1e-6, normalized=True):
    """
    Eigenvector centrality for weighted graphs.
    
    Edge weights represent the strength of connection, influencing
    how much centrality is transferred between nodes.
    
    Time Complexity: O(k * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> dict of {neighbor: weight}
        max_iterations: Maximum iterations
        tolerance: Convergence threshold
        normalized: If True, normalize scores
    
    Returns:
        dict: Mapping of node -> eigenvector centrality
    
    Example:
        >>> # Co-authorship network with number of joint papers as weight
        >>> graph = {
        ...     'Alice': {'Bob': 5, 'Carol': 3},
        ...     'Bob': {'Alice': 5, 'Carol': 2, 'Dave': 1},
        ...     'Carol': {'Alice': 3, 'Bob': 2, 'Dave': 4},
        ...     'Dave': {'Bob': 1, 'Carol': 4}
        ... }
        >>> centrality = eigenvector_centrality_weighted(graph)
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    if n == 1:
        return {nodes[0]: 1.0}
    
    # Initialize
    x = {node: 1.0 for node in nodes}
    
    # Power iteration with weights
    for iteration in range(max_iterations):
        x_new = {node: 0.0 for node in nodes}
        
        for node, neighbors in graph.items():
            x_node = x[node]
            for neighbor, weight in neighbors.items():
                x_new[neighbor] += x_node * weight
        
        # L2 normalization
        norm = math.sqrt(sum(v ** 2 for v in x_new.values()))
        
        if norm == 0:
            return {node: 0.0 for node in nodes}
        
        diff = 0.0
        for node in nodes:
            new_val = x_new[node] / norm
            diff += (new_val - x[node]) ** 2
            x[node] = new_val
        
        if math.sqrt(diff) < tolerance:
            break
    
    if normalized:
        total = sum(x.values())
        if total > 0:
            x = {node: score / total for node, score in x.items()}
    
    return x


def hits_algorithm(graph, max_iterations=100, tolerance=1e-6):
    """
    HITS (Hyperlink-Induced Topic Search) algorithm.
    
    Also known as Hubs and Authorities, this algorithm computes
    two measures for directed graphs:
    - Hub: Node that links to many authorities
    - Authority: Node that is linked to by many hubs
    
    This addresses the limitation of standard eigenvector centrality
    for directed graphs.
    
    Time Complexity: O(k * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of outgoing neighbors
        max_iterations: Maximum iterations
        tolerance: Convergence threshold
    
    Returns:
        tuple: (hubs, authorities)
            - hubs: Dict mapping node -> hub score
            - authorities: Dict mapping node -> authority score
    
    Example:
        >>> # Web page link structure
        >>> graph = {
        ...     'Page1': {'Page2', 'Page3'},
        ...     'Page2': {'Page3'},
        ...     'Page3': {},
        ...     'Page4': {'Page1', 'Page3'}
        ... }
        >>> hubs, authorities = hits_algorithm(graph)
        >>> # Page4 is a good hub (links to many pages)
        >>> # Page3 is a good authority (linked by many pages)
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}, {}
    
    if n == 1:
        return {nodes[0]: 1.0}, {nodes[0]: 1.0}
    
    # Build reverse graph for authority computation
    reverse_graph = defaultdict(set)
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            reverse_graph[neighbor].add(node)
    
    # Initialize
    hubs = {node: 1.0 for node in nodes}
    authorities = {node: 1.0 for node in nodes}
    
    for iteration in range(max_iterations):
        # Update authority scores: sum of hub scores of incoming nodes
        new_authorities = {node: 0.0 for node in nodes}
        for node in nodes:
            for in_node in reverse_graph.get(node, set()):
                new_authorities[node] += hubs[in_node]
        
        # Normalize authority scores
        auth_norm = math.sqrt(sum(v ** 2 for v in new_authorities.values()))
        if auth_norm > 0:
            for node in nodes:
                new_authorities[node] /= auth_norm
        
        # Update hub scores: sum of authority scores of outgoing nodes
        new_hubs = {node: 0.0 for node in nodes}
        for node, neighbors in graph.items():
            for neighbor in neighbors:
                new_hubs[node] += new_authorities[neighbor]
        
        # Normalize hub scores
        hub_norm = math.sqrt(sum(v ** 2 for v in new_hubs.values()))
        if hub_norm > 0:
            for node in nodes:
                new_hubs[node] /= hub_norm
        
        # Check convergence
        hub_diff = math.sqrt(
            sum((new_hubs[node] - hubs[node]) ** 2 for node in nodes)
        )
        auth_diff = math.sqrt(
            sum((new_authorities[node] - authorities[node]) ** 2 
                for node in nodes)
        )
        
        hubs = new_hubs
        authorities = new_authorities
        
        if hub_diff < tolerance and auth_diff < tolerance:
            break
    
    # Final normalization to sum to 1
    hub_sum = sum(hubs.values())
    auth_sum = sum(authorities.values())
    
    if hub_sum > 0:
        hubs = {node: score / hub_sum for node, score in hubs.items()}
    if auth_sum > 0:
        authorities = {node: score / auth_sum for node, score in authorities.items()}
    
    return hubs, authorities


def eigenvector_centrality_katz(graph, alpha=0.1, beta=1.0,
                                max_iterations=100, tolerance=1e-6):
    """
    Katz Centrality - improved eigenvector centrality with baseline.
    
    Adds a baseline importance beta to all nodes, ensuring that
    even isolated nodes get some centrality. This solves the
    problem of zero centrality for nodes in small components.
    
    Time Complexity: O(k * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        alpha: Attenuation factor (0 < alpha < 1/largest_eigenvalue)
        beta: Baseline centrality given to all nodes
        max_iterations: Maximum iterations
        tolerance: Convergence threshold
    
    Returns:
        dict: Mapping of node -> Katz centrality score
    
    Example:
        >>> graph = {
        ...     'A': {'B'},
        ...     'B': {'A', 'C'},
        ...     'C': {'B'},
        ...     'D': {'E'},
        ...     'E': {'D'}
        ... }
        >>> centrality = eigenvector_centrality_katz(graph, alpha=0.2)
        >>> # Node D and E get non-zero centrality unlike standard eigenvector
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return {}
    
    # Initialize with beta
    x = {node: beta for node in nodes}
    
    for iteration in range(max_iterations):
        x_new = {node: beta for node in nodes}  # Baseline importance
        
        # Add contributions from neighbors
        for node, neighbors in graph.items():
            for neighbor in neighbors:
                x_new[neighbor] += alpha * x[node]
        
        # Normalize (L2 norm)
        norm = math.sqrt(sum(v ** 2 for v in x_new.values()))
        if norm > 0:
            for node in nodes:
                x_new[node] /= norm
        
        # Check convergence
        diff = math.sqrt(
            sum((x_new[node] - x[node]) ** 2 for node in nodes)
        )
        
        x = x_new
        
        if diff < tolerance:
            break
    
    # Normalize to sum to 1
    total = sum(x.values())
    if total > 0:
        x = {node: score / total for node, score in x.items()}
    
    return x


def estimate_largest_eigenvalue(graph, num_iterations=50):
    """
    Estimate the largest eigenvalue of the adjacency matrix.
    
    Uses power iteration to approximate lambda_1, which is useful
    for setting parameters in Katz centrality and understanding
    network properties.
    
    Time Complexity: O(k * E)
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set of neighbors
        num_iterations: Number of power iterations
    
    Returns:
        float: Estimate of the largest eigenvalue
    """
    nodes = list(graph.keys())
    n = len(nodes)
    
    if n == 0:
        return 0.0
    
    # Initialize random vector
    import random
    x = {node: random.random() for node in nodes}
    
    # Normalize
    norm = math.sqrt(sum(v ** 2 for v in x.values()))
    for node in nodes:
        x[node] /= norm
    
    # Power iteration
    for _ in range(num_iterations):
        # y = A * x
        y = {node: 0.0 for node in nodes}
        for node, neighbors in graph.items():
            for neighbor in neighbors:
                y[neighbor] += x[node]
        
        # Compute Rayleigh quotient: (x^T * A * x) / (x^T * x)
        # Since x is normalized, denominator is 1
        eigenvalue = sum(x[node] * y[node] for node in nodes)
        
        # Normalize for next iteration
        norm = math.sqrt(sum(v ** 2 for v in y.values()))
        if norm > 0:
            for node in nodes:
                x[node] = y[node] / norm
    
    return eigenvalue