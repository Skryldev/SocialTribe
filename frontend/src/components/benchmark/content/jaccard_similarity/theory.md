# Theory

Jaccard Similarity, also known as the Jaccard Index or Jaccard Coefficient, is one of the oldest and most intuitive measures of set similarity. Developed by Swiss botanist Paul Jaccard in 1901 to study alpine flora distribution, it has since become a fundamental tool in network science, information retrieval, ecology, and countless other fields. In the context of link prediction, it normalizes the common neighbors count by the total number of distinct neighbors, addressing the bias that high-degree nodes naturally have more common neighbors with others.

## Key Concepts

- **Normalized Measure**: Produces values strictly between 0 and 1
- **Set-based Metric**: Treats neighbor sets as mathematical sets
- **Degree Normalization**: Implicitly penalizes high-degree nodes
- **Symmetric**: J(A,B) = J(B,A) — order doesn't matter
- **Distance Metric**: 1 - J(A,B) is a proper metric (satisfies triangle inequality)
- **Foundation for Extension**: Basis for Tanimoto coefficient and other similarity measures

## Mathematical Definition

For two nodes u and v in a graph G, the Jaccard similarity is:

$$J(u,v) = \frac{|\Gamma(u) \cap \Gamma(v)|}{|\Gamma(u) \cup \Gamma(v)|}$$

Where:
- $\Gamma(u)$ = set of neighbors of node u
- $\Gamma(v)$ = set of neighbors of node v
- $|X|$ = cardinality (number of elements) of set X

### Properties

**Value Range:**
$$0 \leq J(u,v) \leq 1$$

**Boundary Cases:**
- $J(u,v) = 0$: No common neighbors (disjoint neighbor sets)
- $J(u,v) = 1$: Identical neighbor sets (complete overlap)
- $J(u,v) = \frac{k}{deg(u) + deg(v) - k}$ where k is common neighbors

### Comparison with Other Normalizations

| Measure | Formula | Range |
|---------|---------|-------|
| Common Neighbors | $\vert\Gamma(u) \cap \Gamma(v)\vert$ | [0, ∞) |
| Jaccard | $\frac{\vert\cap\vert}{\vert\cup\vert}$ | [0, 1] |
| Sørensen-Dice | $\frac{2\vert\cap\vert}{\vert\Gamma(u)\vert + \vert\Gamma(v)\vert}$ | [0, 1] |
| Salton (Cosine) | $\frac{\vert\cap\vert}{\sqrt{\vert\Gamma(u)\vert \cdot \vert\Gamma(v)\vert}}$ | [0, 1] |
| Hub Promoted | $\frac{\vert\cap\vert}{\min(\vert\Gamma(u)\vert, \vert\Gamma(v)\vert)}$ | [0, 1] |

Jaccard tends to give lower scores than Sørensen-Dice and Hub Promoted, making it more conservative in link prediction tasks.

## Historical Context

Paul Jaccard introduced this coefficient in 1901 to compare the similarity of alpine plant species across different mountain regions. The measure gained widespread adoption in the 20th century across disciplines:

- **Ecology**: Species distribution comparison (original application)
- **Computer Science**: Document similarity and clustering (1970s)
- **Information Retrieval**: Query-document matching
- **Network Science**: Link prediction (2000s, popularized by Liben-Nowell & Kleinberg, 2007)
- **Data Mining**: Market basket analysis and recommendation systems
- **Bioinformatics**: Gene sequence similarity and protein interaction prediction
- **NLP**: Text similarity and plagiarism detection

## Applications in Network Science

- **Link Prediction**: Predicting future connections in evolving networks
- **Community Detection**: Hierarchical clustering using Jaccard distance (1 - J)
- **Graph Compression**: Merging similar nodes to reduce graph size
- **Anomaly Detection**: Identifying unusual connection patterns
- **Node Embedding**: Feature construction for machine learning on graphs
- **Recommendation Systems**: User-user and item-item collaborative filtering

## Interpretation Guidelines

- **High Jaccard (> 0.5)**: Strongly overlapping neighborhoods, likely same community
- **Moderate Jaccard (0.2 - 0.5)**: Partial overlap, possible future connection
- **Low Jaccard (< 0.2)**: Minimal overlap, unlikely direct connection
- **Jaccard = 0**: No shared context, remote connection probability

## Limitations

Despite its widespread use, Jaccard similarity has notable limitations:
- Penalizes high-degree nodes heavily (may miss connections between hubs)
- Cannot distinguish between different types of common neighbors
- Does not capture indirect paths beyond length 2
- Sensitive to incomplete data (missing edges affect both numerator and denominator)