# Theory

Triangle Detection is a fundamental graph algorithm that identifies all cycles of length 3 (triangles) in a network. Triangles are the smallest non-trivial clique and represent the most basic form of clustering or transitivity. The presence and distribution of triangles reveal critical information about network structure, community formation, and the strength of local connections.

## Key Concepts

- **Triadic Closure**: The formation of a triangle when two nodes with a common neighbor connect
- **Cycle Detection**: Triangles are cycles of length 3 (C₃)
- **Clique Identification**: A triangle is a K₃ (3-clique) complete subgraph
- **Counting vs Listing**: Algorithms can count total triangles or enumerate all triangle instances
- **Node Ordering**: Optimizing algorithms by processing nodes in degree order
- **Heavy-Hitter Triangles**: Triangles involving high-degree nodes require special handling

## Mathematical Foundation

For an undirected graph G = (V, E), a triangle is a set of three vertices {u, v, w} such that all three edges exist:

$$(u,v) \in E, (v,w) \in E, (u,w) \in E$$

### Counting Triangles Using Adjacency Matrix

If A is the adjacency matrix, the number of triangles is:

$$\text{Triangles} = \frac{\text{trace}(A^3)}{6}$$

Each triangle is counted 6 times in trace(A³) (3 vertices × 2 directions).

### Total Possible Triangles

The maximum number of triangles in a graph with n nodes:

$$\binom{n}{3} = \frac{n(n-1)(n-2)}{6}$$

## Algorithm Variations

### 1. Node-Iterator Algorithm
For each node, check connections among its neighbors. Time: O(V * d²)

### 2. Edge-Iterator Algorithm  
For each edge, find common neighbors of its endpoints. Time: O(E * min(d_u, d_v))

### 3. Forward Algorithm (Optimal)
Order nodes by degree, create directed edges from low to high degree. Only search forward, guaranteeing O(E^(3/2)) worst-case complexity.

### 4. Matrix Multiplication
Compute A³ and extract trace. Time: O(V^ω) where ω ≈ 2.373 (theoretical)

## Applications

- **Social Network Analysis**: Measuring community structure and cohesion
- **Fraud Detection**: Identifying suspicious transaction cycles in financial networks
- **Bioinformatics**: Finding protein complexes in PPI networks (cliques often correspond to functional modules)
- **Recommender Systems**: Triangle closing for friend/item recommendation
- **Network Motif Analysis**: Detecting structural patterns in biological and technological networks
- **Graph Database Queries**: Subgraph pattern matching in property graphs
- **Epidemiology**: Understanding disease transmission paths through close contacts

## Historical Context

Triangle counting has been studied since the early days of graph theory. The "forward algorithm" was popularized by Schank and Wagner (2005) and later optimized by various researchers. The problem gained renewed importance with the rise of large-scale social network analysis, where triangle counting is a core primitive for computing clustering coefficients, transitivity, and community detection metrics.