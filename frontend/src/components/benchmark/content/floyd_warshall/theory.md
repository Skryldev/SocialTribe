# Theory

The Floyd-Warshall algorithm is a classic dynamic programming solution for the all-pairs shortest paths problem. Published by Robert Floyd in 1962 (based on a theorem by Stephen Warshall, 1962, for transitive closure), it finds the shortest paths between every pair of vertices in a single execution. Its elegant O(V³) time complexity and O(V²) space complexity make it ideal for dense graphs where running Dijkstra from each node would be less efficient.

## Key Concepts

- **Dynamic Programming**: Builds solution incrementally by considering larger sets of allowed intermediate nodes
- **All-Pairs**: Computes shortest paths between every pair simultaneously
- **Intermediate Node**: A node that can be used as a stepping stone in a path
- **Transitive Closure**: Finding all reachable pairs (binary version of shortest paths)
- **Matrix Representation**: Naturally expressed and computed using adjacency matrices
- **In-Place Computation**: Updates distance matrix in place without extra memory

## Mathematical Foundation

### DP Formulation

Let $dist^k[i][j]$ be the shortest path from $i$ to $j$ using only vertices from $\{1, 2, ..., k\}$ as intermediate nodes.

**Base Case ($k = 0$):**
$$dist^0[i][j] = \begin{cases}
0 & \text{if } i = j \\
w(i,j) & \text{if edge } (i,j) \text{ exists} \\
\infty & \text{otherwise}
\end{cases}$$

**Recurrence ($k \geq 1$):**
$$dist^k[i][j] = \min(dist^{k-1}[i][j], dist^{k-1}[i][k] + dist^{k-1}[k][j])$$

After considering all $V$ nodes as intermediates, $dist^V[i][j]$ contains the true shortest path distance.

### Path Reconstruction

To reconstruct paths, maintain a predecessor matrix $next[i][j]$:
- Initialize $next[i][j] = j$ if edge $(i,j)$ exists
- When updating $dist[i][j]$ via $k$, set $next[i][j] = next[i][k]$

### Negative Cycle Detection

After the algorithm completes, if any diagonal element is negative:
$$\exists i: dist[i][i] < 0$$
Then a negative cycle exists (the path from $i$ back to itself through the cycle has negative weight).

## Complexity Analysis

| Aspect | Complexity |
|--------|------------|
| Time | O(V³) always |
| Space | O(V²) always |
| Operations | Exactly V³ comparisons |

**Why O(V³) is efficient for dense graphs:**
- For dense graph ($E \approx V²$), running Dijkstra V times: O(V · (V + E) log V) = O(V³ log V)
- Floyd-Warshall: O(V³) — simpler and often faster in practice despite same asymptotic class

## Historical Context

The algorithm has an interesting history:
- **Stephen Warshall** (1962) published an algorithm for computing transitive closure of boolean matrices
- **Robert Floyd** (1962) extended it to find shortest paths with real-valued weights
- **Bernard Roy** (1959) actually published the same algorithm three years earlier
- The algorithm is sometimes called the **Floyd-Warshall-Roy algorithm** or **Warshall-Floyd algorithm**

## Applications

- **Network Optimization**: Finding optimal routes in dense communication networks
- **Transitive Closure**: Determining reachability in directed graphs
- **Graph Diameter**: Computing the longest shortest path in a network
- **GIS Systems**: All-pairs distances for facility location problems
- **Circuit Design**: Timing analysis and wire length optimization
- **Social Networks**: Computing closeness centrality for all nodes
- **Bioinformatics**: Protein structure comparison and alignment
- **Game Development**: Precomputing all-pair distances in static maps
- **Database Systems**: Transitive closure queries in graph databases

## Variations

- **Path Reconstruction**: Store next-hop information alongside distances
- **Minimax Path**: Find path minimizing maximum edge weight (bottleneck paths)
- **Maximin Path**: Find path maximizing minimum edge weight (widest paths)
- **Sparse Graphs**: Johnson's algorithm (O(V² log V + VE)) is superior
- **Parallel Floyd**: Each k-iteration's inner loops are embarrassingly parallel