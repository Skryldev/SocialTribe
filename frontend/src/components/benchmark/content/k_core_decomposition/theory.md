# Theory

K-Core Decomposition is a fundamental graph analysis technique that reveals the hierarchical core-periphery structure of networks. Introduced by Stephen Seidman in 1983, it decomposes a graph into nested subgraphs of increasing connectivity, providing a robust measure of node importance that is more nuanced than degree centrality and more stable than betweenness.

## Key Concepts

- **k-Core**: A maximal subgraph where every node has degree at least k within the subgraph
- **Core Number (Coreness)**: The largest k such that the node belongs to a k-core
- **Degeneracy**: The maximum core number of any node in the graph (= max k)
- **Nested Structure**: k-cores form a laminar family: (k+1)-core ⊆ k-core
- **Shell Index**: Alternative name for core number
- **Graph Degeneracy**: Equal to the maximum core number

## Mathematical Foundation

### Formal Definition

A subgraph H = (V', E') of G = (V, E) is a **k-core** if and only if:

$$\forall v \in V' : deg_H(v) \geq k$$

and H is maximal with this property (no superset of V' satisfies the condition).

The **core number** of node v is:

$$core(v) = \max\{k : v \in k\text{-core of } G\}$$

### Properties

1. **Nested (Laminar) Structure**:
   $$G = 0\text{-core} \supseteq 1\text{-core} \supseteq 2\text{-core} \supseteq ... \supseteq k_{max}\text{-core}$$

2. **Uniqueness**: The k-core is unique for any given k
3. **Degeneracy Relationship**: The degeneracy of G equals $\max_v core(v)$
4. **Minimum Degree**: Every non-empty k-core has minimum degree ≥ k
