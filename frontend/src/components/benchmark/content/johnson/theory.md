# Theory

Johnson's algorithm, published by Donald B. Johnson in 1977, solves the all-pairs shortest paths problem for sparse graphs with potentially negative edge weights. It elegantly combines Bellman-Ford and Dijkstra's algorithms to achieve better asymptotic complexity than running Bellman-Ford from each node, while retaining the ability to handle negative edges that Dijkstra alone cannot.

## Key Concepts

- **Reweighting Technique**: Transforms edge weights to make them non-negative
- **Potential Function**: Node potentials h(v) derived from Bellman-Ford
- **Shortest Path Preservation**: Reweighted paths maintain original shortest path ordering
- **Negative Cycle Detection**: Bellman-Ford phase detects if any negative cycles exist
- **Sparse Graph Optimization**: Faster than Floyd-Warshall for sparse graphs
- **Hybrid Approach**: Combines strengths of two fundamental algorithms

## Mathematical Foundation

### The Reweighting Lemma

Given a graph G = (V, E) with edge weights w(u,v) and a potential function h: V → ℝ, define new weights:

$$w'(u,v) = w(u,v) + h(u) - h(v)$$

For any path p = (v₀, v₁, ..., vₖ):

$$w'(p) = \sum_{i=0}^{k-1} [w(v_i, v_{i+1}) + h(v_i) - h(v_{i+1})]$$
$$= \sum_{i=0}^{k-1} w(v_i, v_{i+1}) + h(v_0) - h(v_k)$$
$$= w(p) + h(v_0) - h(v_k)$$

**Key Insight**: For any two paths between the same nodes u and v:
$$w'(p_1) < w'(p_2) \iff w(p_1) < w(p_2)$$

The ordering of paths by weight is preserved!

### Choosing the Potential Function

Set h(v) = δ(q, v), the shortest path distance from a new source q (connected to all nodes with zero-weight edges):

By triangle inequality:
$$h(v) \leq h(u) + w(u,v)$$
Therefore:
$$w'(u,v) = w(u,v) + h(u) - h(v) \geq 0$$

All reweighted edges are non-negative!

### Recovering Original Distances

For any nodes u and v:
$$d(u,v) = d'(u,v) - h(u) + h(v)$$

Where d'(u,v) is the shortest distance in the reweighted graph.

## Algorithm Complexity

| Phase | Algorithm | Time | Space |
|-------|-----------|------|-------|
| 1 | Bellman-Ford | O(VE) | O(V) |
| 2 | Reweighting | O(E) | O(1) |
| 3 | V runs of Dijkstra | O(V · (V + E) log V) | O(V) each |
| **Total** | | **O(VE + V² log V)** | **O(V²)** |

### When to Use Johnson's Algorithm

| Graph Type | Best Algorithm | Complexity |
|------------|----------------|------------|
| Sparse, negative edges | Johnson | O(V² log V + VE) |
| Sparse, non-negative | V × Dijkstra | O(V(V + E) log V) |
| Dense, any weights | Floyd-Warshall | O(V³) |
| Very sparse, negative | V × Bellman-Ford | O(V²E) |

Johnson wins when E = o(V²) and negative edges exist.

## Historical Context

Donald B. Johnson published this algorithm in 1977 in the Journal of the ACM. The key innovation was recognizing that the potential function from Bellman-Ford could transform any graph with negative edges (but no negative cycles) into one with only non-negative edges, enabling the use of Dijkstra's more efficient algorithm. This was a significant breakthrough as it provided the first algorithm that was provably more efficient than both repeated Bellman-Ford and Floyd-Warshall for sparse graphs with negative edges.

## Applications

- **Telecommunications**: Routing in networks with mixed costs (latency, bandwidth costs, penalties)
- **Transportation**: Finding optimal routes with toll roads (negative costs for subsidies)
- **Finance**: Currency exchange arbitrage detection with transaction costs
- **VLSI Design**: Circuit timing optimization with negative delays
- **Game Development**: Pathfinding with varying terrain costs and bonuses
- **Logistics**: Supply chain optimization with discounts and penalties
- **Social Network Analysis**: Computing betweenness centrality requiring all-pairs shortest paths

## Limitations

- **Negative Cycles**: Algorithm fails (as do all shortest path algorithms)
- **Memory**: O(V²) space to store all-pairs distances
- **Sparse Requirement**: For dense graphs (E ≈ V²), Floyd-Warshall is simpler and faster
- **Implementation Complexity**: More complex than Floyd-Warshall
- **Numerical Precision**: Reweighting may cause floating-point issues with very large/small weights

## Related Algorithms

| Algorithm | Year | Key Idea |
|-----------|------|----------|
| Floyd-Warshall | 1962 | DP with intermediate nodes |
| Johnson | 1977 | Reweighting + Dijkstra |
| Pettie-Ramachandran | 2002 | Optimal all-pairs (theoretical) |
| Williams | 2014 | Sub-cubic for unweighted |