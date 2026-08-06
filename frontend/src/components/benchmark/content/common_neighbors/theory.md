# Theory

Common Neighbors is the most fundamental and intuitive link prediction algorithm in network science. It is based on a simple observation rooted in social network theory: if two individuals share many mutual friends, they are highly likely to become friends themselves in the future. This principle, known as triadic closure, forms the backbone of many more sophisticated link prediction methods.

## Key Concepts

- **Triadic Closure**: The tendency for two nodes with a common neighbor to form a connection
- **Local Similarity Index**: Uses only immediate neighborhood information
- **Unweighted Counting**: Treats all common neighbors equally
- **Baseline Algorithm**: Serves as the foundation for weighted variants like Adamic-Adar and Resource Allocation
- **Undirected Focus**: Primarily designed for undirected graphs

## Mathematical Definition

The Common Neighbors score between nodes u and v is defined as:

$$CN(u, v) = |\Gamma(u) \cap \Gamma(v)|$$

Where:
- $\Gamma(u)$ = set of neighbors of node u
- $\Gamma(v)$ = set of neighbors of node v
- $|...|$ = cardinality (size) of the set

## Historical Context

Common Neighbors is one of the earliest link prediction methods, emerging from social network analysis in sociology. Newman (2001) formalized its use in the context of collaboration networks, showing that the probability of future collaboration increases with the number of mutual collaborators. Liben-Nowell and Kleinberg (2007) later established it as a baseline in their seminal paper on link prediction in social networks.

## Applications

- **Social Networks**: Friend recommendation (Facebook's early "People You May Know")
- **Collaboration Networks**: Predicting future co-authorships in scientific communities
- **Biological Networks**: Identifying potential protein-protein interactions
- **Recommendation Systems**: User-item collaborative filtering
- **Security**: Detecting potential connections in criminal or terrorist networks
- **E-commerce**: Product recommendation based on shared purchase patterns

## Limitations

Common Neighbors treats all shared connections equally, regardless of their own connectivity. A shared connection to a popular celebrity is counted the same as a shared connection to a close mutual friend. This limitation led to the development of weighted variants like Adamic-Adar and Resource Allocation.