# Theory

Eigenvector Centrality is a sophisticated measure of node importance that extends Degree Centrality by considering not just the number of connections, but the importance of those connections. A node is considered central if it is connected to other central nodes. This recursive definition leads naturally to an eigenvector formulation, making it one of the most theoretically elegant centrality measures in network science.

## Key Concepts

- **Recursive Importance**: A node's importance is proportional to the sum of its neighbors' importance
- **Eigenvector Problem**: Computing centrality reduces to finding the principal eigenvector of the adjacency matrix
- **Dominant Eigenvalue**: The largest eigenvalue of the adjacency matrix
- **Power Iteration**: Numerical method to compute the principal eigenvector without full eigendecomposition
- **Mutual Reinforcement**: Nodes boost each other's importance through connections
- **Global Measure**: Considers the entire network structure, not just local neighborhoods

## Mathematical Foundation

### Definition

Let A be the adjacency matrix of graph G. The eigenvector centrality x_i of node i satisfies:

$$x_i = \frac{1}{\lambda} \sum_{j \in N(i)} x_j = \frac{1}{\lambda} \sum_{j=1}^{n} A_{ij} x_j$$

In matrix form:
$$Ax = \lambda x$$

Where:
- $x$ is the eigenvector centrality vector
- $\lambda$ is the largest eigenvalue of A (Perron-Frobenius eigenvalue)
- $A$ is the adjacency matrix

### Perron-Frobenius Theorem

For connected, undirected graphs with non-negative adjacency matrix:
- The largest eigenvalue $\lambda_1$ is positive and unique
- The corresponding eigenvector $x$ has all positive entries
- This eigenvector is the desired centrality measure

### Power Iteration Method

Since computing eigenvectors directly is expensive for large matrices, we use the power method:

1. Initialize $x^{(0)} = (1, 1, ..., 1)^T$
2. Iterate: $x^{(k+1)} = \frac{A x^{(k)}}{||A x^{(k)}||}$
3. As $k \to \infty$, $x^{(k)}$ converges to the principal eigenvector

Convergence rate depends on the ratio $|\lambda_2 / \lambda_1|$:
- Fast convergence when the spectral gap is large
- Slow convergence when $\lambda_2 \approx \lambda_1$

### Relationship to Other Measures

| Measure | Formula | Considers |
|---------|---------|-----------|
| Degree Centrality | $C_D(i) = \sum_j A_{ij}$ | Direct connections |
| Eigenvector Centrality | $C_E(i) \propto \sum_j A_{ij} C_E(j)$ | Recursive importance |
| Katz Centrality | $C_K(i) = \alpha \sum_j A_{ij} C_K(j) + \beta$ | With baseline importance |
| PageRank | $PR(i) = \frac{1-d}{N} + d \sum_j \frac{A_{ji}}{d_j} PR(j)$ | Random walk variant |

## Directed Graphs

For directed graphs, eigenvector centrality presents challenges:
- Nodes with no incoming edges get zero centrality
- Centrality can concentrate in certain structures (sinks)
- **Hubs and Authorities** (HITS algorithm) resolves this using two measures:
  - **Hub score**: Sum of authority scores of nodes it links to
  - **Authority score**: Sum of hub scores of nodes linking to it

## Historical Context

Eigenvector Centrality was introduced by **Phillip Bonacich** in 1972 as part of his work on social network analysis at UCLA. Bonacich recognized that simple degree counts failed to capture the nuance that connections to important people are more valuable than connections to peripheral members. The measure became widely known through its application to analyzing citation networks, corporate interlock networks, and later social media influence.

Google's PageRank (1998) can be viewed as a variant of eigenvector centrality adapted for the directed web graph with a damping factor to handle dangling nodes.

## Applications

- **Social Network Analysis**: Identifying influential individuals
- **Citation Networks**: Ranking papers by importance of citations
- **Organizational Networks**: Finding key people in corporate structures
- **Epidemiology**: Identifying critical nodes for disease spread
- **Neuroscience**: Finding hub regions in brain connectivity networks
- **Economics**: Analyzing systemic importance in interbank networks
- **Ecology**: Keystone species identification in food webs
- **Recommendation Systems**: Collaborative filtering with item centrality

## Limitations

- **Zero Centrality**: Nodes in small disconnected components get zero centrality
- **Convergence Issues**: Bipartite graphs cause oscillations
- **Scale Sensitivity**: Results depend on graph size and density
- **Directed Graphs**: Requires adaptation (Katz, PageRank, HITS)
- **Interpretation**: Less intuitive than degree or betweenness centrality