# Theory

PageRank is a revolutionary link analysis algorithm developed by Larry Page and Sergey Brin at Stanford University in 1996. It fundamentally changed web search by measuring the importance of web pages not just by their content, but by the structure of links pointing to them. The algorithm operates on a recursive principle: a page is important if important pages link to it.

## Key Concepts

- **Random Surfer Model**: Simulates a user randomly clicking links, occasionally jumping to random pages
- **Damping Factor (d)**: Typically 0.85, represents the probability of following links vs. random jumps
- **Recursive Definition**: Each node's importance is a weighted sum of its neighbors' importance
- **Convergence Guarantee**: Markov chain properties ensure convergence to a unique stationary distribution
- **Eigenvector Centrality Extension**: PageRank is essentially a variant of eigenvector centrality for directed graphs

## Mathematical Foundation

The PageRank formula:

$$PR(u) = \frac{1-d}{N} + d \sum_{v \in B_u} \frac{PR(v)}{L(v)}$$

Where:
- $PR(u)$ = PageRank of node u
- $d$ = damping factor (usually 0.85)
- $N$ = total number of nodes
- $B_u$ = set of nodes linking to u
- $L(v)$ = out-degree of node v

## Applications Beyond Web

- **Scientific Impact**: Ranking papers by citation networks (eigenfactor)
- **Social Networks**: Identifying influential users (TwitterRank)
- **Biology**: Prioritizing disease genes in protein interaction networks
- **Recommendation Systems**: ItemRank for collaborative filtering
- **Urban Planning**: StreetRank for analyzing urban street importance
- **Sports Analytics**: Ranking teams in sports leagues

## Historical Impact

PageRank transformed Google from a research project into the world's dominant search engine, demonstrating how graph theory could solve real-world information retrieval problems at unprecedented scale.