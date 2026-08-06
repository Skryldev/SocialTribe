# Theory

Resource Allocation is a link prediction algorithm inspired by the physical process of resource distribution in complex networks. Developed by Zhou, Lü, and Zhang in 2009, it models the flow of resources between two unconnected nodes through their common neighbors. The algorithm operates on a simple principle: each common neighbor acts as a resource transmitter, and nodes with higher degree distribute their resources more thinly, making them less meaningful as intermediaries.

## Key Concepts

- **Resource Flow Model**: Simulates how resources are transmitted through common neighbors
- **Inverse Degree Weighting**: Resources are divided equally among a node's connections (1/degree)
- **Physical Analogy**: Similar to electrical current distribution or heat diffusion
- **Deterministic**: Produces consistent results without randomness or parameters
- **Local Similarity Index**: Only considers paths of length 2 between nodes

## Mathematical Foundation

The Resource Allocation index between nodes u and v is defined as:

$$RA(u, v) = \sum_{z \in \Gamma(u) \cap \Gamma(v)} \frac{1}{|\Gamma(z)|}$$

Where:
- $\Gamma(u)$ = set of neighbors of node u
- $\Gamma(v)$ = set of neighbors of node v
- $|\Gamma(z)|$ = degree of common neighbor z

## Comparison with Adamic-Adar

Resource Allocation differs from Adamic-Adar in its penalty function:
- **Resource Allocation**: Uses 1/degree (linear penalty)
- **Adamic-Adar**: Uses 1/log(degree) (logarithmic penalty)

This means Resource Allocation penalizes high-degree common neighbors more aggressively, making it more sensitive to rare connections.

## Applications

- **Social Network Analysis**: Predicting future friendships and connections
- **Recommendation Systems**: Collaborative filtering in user-item networks
- **Biological Networks**: Protein-protein interaction prediction
- **Transportation Networks**: Predicting missing routes or connections
- **E-commerce**: Product recommendation based on co-purchase patterns

## Historical Context

The algorithm was introduced in 2009 as part of research on link prediction in complex networks, demonstrating that local similarity indices could achieve accuracy comparable to global methods while maintaining computational efficiency.