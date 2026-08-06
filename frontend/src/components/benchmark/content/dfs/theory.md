# Theory

Depth-First Search (DFS) is one of the most fundamental and versatile graph traversal algorithms. Its origins trace back to the 19th century when French mathematician Charles Pierre Trémaux used it to solve mazes. It was formalized in computer science in the 1950s and became a cornerstone of algorithm design, underpinning solutions for connectivity, cycle detection, topological sorting, and strongly connected components.

## Key Concepts

- **Deep Exploration**: Goes as far as possible along each branch before backtracking
- **Recursive Backtracking**: Natural implementation using recursion stack
- **Pre-Visit / Post-Visit**: Timing of node processing enables powerful classifications
- **Edge Classification**: Tree edges, back edges, forward edges, cross edges
- **Discovery & Finishing Times**: Timestamps revealing graph structure
- **Parenthesis Theorem**: Nested intervals of discovery/finish times
