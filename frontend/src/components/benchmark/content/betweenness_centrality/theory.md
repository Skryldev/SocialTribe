# Theory

Betweenness Centrality is a fundamental measure in network analysis that quantifies the importance of a node based on the fraction of shortest paths between all pairs of nodes that pass through it. First formalized by Linton Freeman in 1977, it captures the concept of a node acting as a "bridge" or "broker" in a network, controlling the flow of information or resources.

## Key Concepts

- **Shortest Path Mediation**: Measures how often a node lies on shortest paths
- **Global Measure**: Considers the entire network structure, not just local connections
- **Bottleneck Identification**: High betweenness nodes are critical for network connectivity
- **Brandes' Algorithm**: Reduces time complexity from O(V³) to O(V·(V+E))
- **Dependency Accumulation**: Recursive formula avoids explicit path enumeration
- **Normalization**: Makes scores comparable across different-sized networks
