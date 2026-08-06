# Theory

The Bellman-Ford algorithm is a fundamental shortest path algorithm that computes single-source shortest paths in a weighted graph. Unlike Dijkstra's algorithm, it can handle graphs with negative edge weights, making it more versatile though less efficient. Developed by Richard Bellman (1958) and Lester Ford Jr. (1956), it also serves as a negative cycle detector—a capability that Dijkstra's algorithm lacks entirely.

## Key Concepts

- **Dynamic Programming**: Builds solution iteratively, considering paths of increasing length
- **Edge Relaxation**: The core operation of improving distance estimates through edges
- **Negative Edge Weights**: Algorithm handles these correctly (unlike Dijkstra)
- **Negative Cycle Detection**: If distances improve after V-1 iterations, a negative cycle exists
- **Path Length Bound**: Shortest path without cycles has at most V-1 edges
- **Versatility**: Works on directed and undirected graphs, with or without negative weights

## Mathematical Foundation

### Core Principle

Let $dist^k[v]$ be the shortest path from source $s$ to $v$ using at most $k$ edges.

**Recurrence Relation:**
$$dist^0[s] = 0$$
$$dist^0[v] = \infty \text{ for } v \neq s$$
$$dist^k[v] = \min(dist^{k-1}[v], \min_{(u,v) \in E} (dist^{k-1}[u] + w(u,v)))$$

After $V-1$ iterations, $dist^{V-1}[v]$ equals the true shortest path distance (since any simple path has at most $V-1$ edges).

### Negative Cycle Detection

A negative cycle exists if and only if, after the $V^{th}$ iteration:
$$\exists (u,v) \in E: dist[u] + w(u,v) < dist[v]$$

### Correctness Proof

**Theorem**: After $i$ iterations of the outer loop, $dist[v]$ is at most the length of the shortest path from $s$ to $v$ using at most $i$ edges.

**Proof by Induction**:
- **Base case** ($i=0$): Only $dist[s] = 0$ is correct
- **Inductive step**: Assume true for $i-1$. A shortest path of at most $i$ edges either has $\leq i-1$ edges (correct by induction) or exactly $i$ edges. In the latter case, the last edge $(u,v)$ is relaxed in iteration $i$, and $dist[u]$ was correct by induction.

## Comparison with Dijkstra

| Property | Bellman-Ford | Dijkstra |
|----------|--------------|----------|
| Negative Weights | ✅ Handles | ❌ Fails |
| Negative Cycles | ✅ Detects | ❌ Cannot |
| Time Complexity | O(V·E) | O((V+E) log V) |
| Space Complexity | O(V) | O(V) |
| Greedy Approach | No (DP-based) | Yes |
| Best for | General graphs | Non-negative weights |

## Historical Context

The algorithm was independently developed by Richard Bellman at RAND Corporation and Lester Ford Jr. at RAND and later at the Office of Naval Research. Edward F. Moore also published a similar algorithm in 1959, and it is sometimes called the Bellman-Ford-Moore algorithm. The algorithm became crucial in the development of distance-vector routing protocols like RIP (Routing Information Protocol), which used a distributed version.

## Applications

- **Network Routing**: Distance-vector protocols (RIP, BGP uses modified version)
- **Financial Arbitrage**: Detecting negative cycles in currency exchange graphs
- **Operations Research**: Project planning with time/cost tradeoffs (negative costs for savings)
- **Transportation**: Logistics with time windows and penalties
- **Game Theory**: Solving certain types of games with negative rewards
- **Circuit Design**: Timing analysis in VLSI circuits
- **Blockchain**: Payment channel networks finding optimal routes
- **Arbitrage Detection**: Currency and commodity arbitrage opportunities

## Optimization Techniques

- **Yen's Optimization**: Partition edges to reduce relaxation operations
- **Early Termination**: Stop if no distance updates occur in an iteration
- **Queue-based (SPFA)**: Use queue to only process nodes whose distances changed
- **Parallel Implementation**: Edge relaxations within an iteration are independent