# Theory

 "A-star" is a best-first search algorithm that finds the shortest path between a start and goal node in a weighted graph. Developed by Peter Hart, Nils Nilsson, and Bertram Raphael at SRI International in 1968, it improves upon Dijkstra's algorithm by using a heuristic function to guide the search toward the goal, dramatically reducing the number of nodes explored.

## Key Concepts

- **F-Score**: $f(n) = g(n) + h(n)$ — the estimated total cost through node n
- **G-Score**: Actual cost from start node to current node n
- **H-Score**: Heuristic estimate from node n to goal (must be admissible)
- **Admissibility**: Heuristic never overestimates the true cost to goal
- **Consistency**: For any edge (n, n'), $h(n) \leq c(n, n') + h(n')$
- **Optimality**: Guaranteed to find optimal path with admissible heuristic
- **Informed Search**: Uses domain knowledge (heuristic) to guide exploration

## Mathematical Foundation

### Algorithm Properties

**Optimality Condition**: A\* is optimal if the heuristic h(n) is admissible:
$$h(n) \leq h^*(n) \text{ for all nodes } n$$
where $h^*(n)$ is the true optimal cost from n to goal.

**Efficiency**: Among all optimal search algorithms using the same heuristic, A\* expands the fewest nodes (given consistent heuristic).

### Comparison with Other Algorithms

| Algorithm | Heuristic | Optimal | Complete |
|-----------|-----------|---------|----------|
| Dijkstra | h(n) = 0 | Yes | Yes |
| Greedy BFS | h(n) only | No | No |
| A\* | g(n) + h(n) | Yes\* | Yes\* |

\*With admissible heuristic

### Heuristic Design

**Common Heuristics for Grid Maps:**
- **Manhattan Distance**: $h(n) = |x_n - x_{goal}| + |y_n - y_{goal}|$ (for 4-directional movement)
- **Euclidean Distance**: $h(n) = \sqrt{(x_n - x_{goal})^2 + (y_n - y_{goal})^2}$ (for any-angle movement)
- **Diagonal Distance**: $h(n) = \max(|x_n - x_{goal}|, |y_n - y_{goal}|)$ (for 8-directional movement)
- **Chebyshev Distance**: Same as diagonal for uniform cost grids

**Heuristic Quality Trade-off:**
- **Weak heuristic** (h ≈ 0): Approaches Dijkstra — many nodes explored, slow
- **Strong heuristic** (h ≈ h\*): Approaches optimal — few nodes explored, fast
- **Overestimating heuristic**: Not admissible — may miss optimal path, but faster

## Historical Context

A\* was developed as part of the Shakey the Robot project at SRI International, one of the first mobile robots capable of reasoning about its actions. The algorithm was originally called "Algorithm A" and was later named A\* to denote its optimality property. It has since become the most widely used pathfinding algorithm in computer science.

## Applications

- **Video Games**: NPC pathfinding and navigation meshes
- **Robotics**: Motion planning and autonomous navigation
- **GPS Navigation**: Route calculation with traffic considerations
- **Natural Language Processing**: Parsing and machine translation
- **Puzzle Solving**: 15-puzzle, Rubik's cube, sliding puzzles
- **Network Routing**: QoS routing in telecommunications
- **Computational Biology**: DNA sequence alignment
- **Logistics**: Vehicle routing and warehouse optimization

## Advanced Variants

- **Weighted A\***: $f(n) = g(n) + \epsilon \cdot h(n)$ where $\epsilon > 1$ for faster (suboptimal) search
- **Dynamic Weighted A\***: $\epsilon$ decreases as search approaches goal
- **Anytime A\***: Returns best solution found within time limit, improves if time permits
- **Bidirectional A\***: Simultaneous search from start and goal
- **Lifelong Planning A\*** (LPA\*): Efficient re-planning when graph changes
- **D\* Lite**: A\* variant for unknown or changing environments
- **Theta\***: Any-angle pathfinding on grids