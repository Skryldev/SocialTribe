# Theory

Dijkstra's algorithm is one of the most fundamental and widely-used algorithms in computer science, developed by Dutch computer scientist Edsger W. Dijkstra in 1956 and published in 1959. It solves the single-source shortest path problem for graphs with non-negative edge weights, finding the shortest path from a starting node to all other nodes in the graph.

## Key Concepts

- **Greedy Strategy**: At each step, selects the locally optimal choice (closest unvisited node)
- **Optimal Substructure**: Any subpath of a shortest path is itself a shortest path
- **Non-negative Weights**: Algorithm fails if negative edge weights exist
- **Priority Queue**: Core data structure for efficient minimum distance extraction
- **Relaxation**: The process of updating distance estimates through edge examination
- **Deterministic**: Always produces the same result for a given input graph

## Mathematical Foundation

### Algorithm

Let $G = (V, E)$ be a weighted graph, $s$ the source node, $w(u,v)$ the weight of edge $(u,v)$.

1. **Initialization**:
   - $dist[s] = 0$
   - $dist[v] = \infty$ for all $v \neq s$
   - $prev[v] = \text{undefined}$ for all $v$

2. **Main Loop**:
   While there are unvisited nodes:
   - Select $u$ with minimum $dist[u]$
   - Mark $u$ as visited
   - For each neighbor $v$ of $u$:
     - If $dist[u] + w(u,v) < dist[v]$:
       - $dist[v] = dist[u] + w(u,v)$
       - $prev[v] = u$

### Correctness Proof (by Induction)

**Invariant**: When a node is marked as visited, $dist[u]$ equals the shortest path distance from $s$ to $u$.

**Proof**: Assume nodes visited so far have correct distances. Let $u$ be the next node to be visited (minimum $dist[u]$). Suppose there exists a shorter path to $u$ through some unvisited node $x$. Then $dist[x] + w(x,u) < dist[u]$. But since $dist[x] \geq 0$ and $w(x,u) \geq 0$, we would have $dist[x] < dist[u]$, contradicting the choice of $u$ as minimum.

## Historical Context

Dijkstra conceived the algorithm in 20 minutes while sitting in a café in Amsterdam, without pen or paper. He was trying to demonstrate the power of the ARMAC computer by finding the shortest railway route between two cities in the Netherlands. The algorithm revolutionized pathfinding and became foundational for GPS navigation, network routing protocols (OSPF, IS-IS), and countless other applications.

## Time Complexity

| Data Structure | Time Complexity |
|----------------|-----------------|
| Array (simple) | O(V²) |
| Binary Heap | O((V + E) log V) |
| Fibonacci Heap | O(E + V log V) |
| k-ary Heap | O((kV + E) log_k V) |

## Applications

- **GPS Navigation**: Finding shortest routes in road networks
- **Network Routing**: OSPF (Open Shortest Path First) protocol
- **Social Networks**: Finding shortest connection paths between people
- **Game AI**: Pathfinding for NPCs (often combined with A*)
- **Robotics**: Motion planning and obstacle avoidance
- **Telecommunications**: Optimal data packet routing
- **Operations Research**: Supply chain and logistics optimization
- **VLSI Design**: Finding shortest interconnects on circuit boards

## Limitations

- Cannot handle negative edge weights (use Bellman-Ford instead)
- Not suitable for all-pairs shortest paths on large graphs (use Floyd-Warshall for dense, Johnson's for sparse)
- Memory-intensive for very large graphs when storing all distances