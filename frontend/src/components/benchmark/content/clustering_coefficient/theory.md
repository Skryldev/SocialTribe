# Theory

Clustering Coefficient is a fundamental measure in network science that quantifies the degree to which nodes in a graph tend to cluster together. It captures the "friends of my friends are also my friends" phenomenon, known as transitivity. Developed in the context of social network analysis, this metric reveals the presence of tightly-knit communities and is essential for understanding network structure, robustness, and information flow dynamics.

## Key Concepts

- **Triadic Closure**: The tendency for triangles to form in networks
- **Local vs Global**: Measures clustering at individual node level and network-wide level
- **Transitivity**: Probability that two neighbors of a node are also connected
- **Small-World Property**: High clustering combined with short path lengths
- **Community Structure**: High clustering indicates strong community formation

## Mathematical Definition

### Local Clustering Coefficient

For an undirected graph, the local clustering coefficient of node v is:

$$C(v) = \frac{2 \times T(v)}{deg(v)(deg(v) - 1)}$$

Where:
- $T(v)$ = number of triangles through node v
- $deg(v)$ = degree of node v
- For nodes with degree < 2, $C(v) = 0$

### Global Clustering Coefficient

Two common definitions exist:

**Average Local Clustering:**
$$C_{avg} = \frac{1}{n} \sum_{v \in V} C(v)$$

**Transitivity (Global):**
$$C_{global} = \frac{3 \times \text{number of triangles}}{\text{number of connected triplets}}$$

## Interpretation

- **C(v) = 1**: All neighbors are connected to each other (perfect clique)
- **C(v) = 0**: No connections among neighbors (star-like structure)
- **C(v) = 0.5**: Half of possible neighbor connections exist

## Network Types and Typical Values

- **Social Networks**: High clustering (0.1-0.5) due to triadic closure
- **Random Graphs**: Low clustering (~p, where p is edge probability)
- **Biological Networks**: Moderate to high clustering (functional modules)
- **Technological Networks**: Variable, often lower than social networks

## Historical Context

Watts and Strogatz (1998) used clustering coefficient to define small-world networks, showing that networks could simultaneously have high clustering (like regular lattices) and short path lengths (like random graphs). This discovery revolutionized our understanding of real-world network structure.

## Applications

- **Social Network Analysis**: Measuring community tightness
- **Epidemiology**: Understanding disease spread in clustered populations
- **Neuroscience**: Analyzing functional connectivity in brain networks
- **Biology**: Detecting protein complexes in interaction networks
- **Economics**: Analyzing interbank lending networks for systemic risk
- **Recommendation Systems**: Improving collaborative filtering with clustering information