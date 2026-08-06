# Theory

Degree Centrality is the simplest and most intuitive measure of node importance in a network. It quantifies how many direct connections a node has, operating on the principle that a node with more connections is more central, influential, and potentially more powerful within the network structure.

## Key Concepts

- **Local measure**: Only considers immediate neighbors, not global structure
- **Undirected graphs**: Degree = number of unique connections
- **Directed graphs**: In-degree (prestige) and out-degree (gregariousness)
- **Normalization**: Dividing by (n-1) enables cross-graph comparison
- **Scale-free networks**: Often reveals power-law distribution of connections

## Mathematical Definition

For undirected graphs:
$$C_D(v) = \deg(v)$$

Normalized:
$$C_D'(v) = \frac{\deg(v)}{n-1}$$

For directed graphs:
$$C_D^{in}(v) = \deg^{in}(v)$$
$$C_D^{out}(v) = \deg^{out}(v)$$

## Applications

- Social network analysis: Identifying key influencers
- Epidemiology: Locating super-spreaders in disease networks
- Citation networks: Finding highly-cited papers
- Infrastructure: Evaluating critical nodes in transportation networks