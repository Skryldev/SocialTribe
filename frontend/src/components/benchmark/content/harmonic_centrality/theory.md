# Theory

Harmonic Centrality is a variant of Closeness Centrality designed to gracefully handle disconnected graphs. Proposed by Massimo Marchiori and Vito Latora in 2000, it replaces the problematic arithmetic mean of distances with the harmonic mean, which naturally gives zero weight to unreachable nodes (since 1/∞ = 0).

## Key Concepts

- **Reciprocal Distance**: 1/d(s, v) instead of d(s, v)
- **Disconnected-Friendly**: Unreachable nodes contribute 0, not undefined
- **Harmonic Mean**: More robust to outliers than arithmetic mean
- **Global Measure**: Considers paths to all other nodes
- **Simple Computation**: Just BFS + sum reciprocals
- **No Special Cases**: No need to handle ∞ manually

## Mathematical Foundation

### Definition (Marchiori & Latora, 2000)

The harmonic centrality of node v is:

$$H(v) = \sum_{u \neq v} \frac{1}{d(v, u)}$$

Where:
- $d(v, u)$ = shortest path distance from v to u
- $\frac{1}{\infty} = 0$ by convention

### Comparison with Closeness Centrality

**Closeness (Bavelas, 1950; Beauchamp, 1965):**
$$C(v) = \frac{1}{\sum_{u \neq v} d(v, u)}$$

**Problem**: If graph is disconnected, $d(v, u) = \infty$ for some u → denominator is ∞ → C(v) = 0 for ALL nodes (useless).

**Standard Fix**: Compute closeness within each connected component only — but loses global comparison.

**Harmonic Solution**: 
$$H(v) = \sum_{u \neq v} \frac{1}{d(v, u)}$$

If $d(v, u) = \infty$, then $1/d(v, u) = 0$ → simply no contribution (elegant).

### Normalized Harmonic Centrality

$$H_{norm}(v) = \frac{1}{n-1} \sum_{u \neq v} \frac{1}{d(v, u)}$$

Range: [0, 1]
- 0: Isolated node (or all nodes at infinite distance)
- 1: Node directly connected to all other nodes (complete graph star)

### Properties

**Theorem**: Harmonic centrality satisfies:
1. $H(v) \geq 0$ for all v
2. $H(v) = 0$ if and only if v has no neighbors
3. Maximum $H(v) = n-1$ when v is directly connected to all nodes
4. $H_{norm}(v) \in [0, 1]$

**Monotonicity**: Adding edges cannot decrease harmonic centrality.

### Relationship to Average Distance

The harmonic mean of distances from v:
$$HM(v) = \frac{n-1}{\sum_{u \neq v} \frac{1}{d(v,u)}} = \frac{n-1}{H(v)}$$

So:
$$H(v) = \frac{n-1}{HM(v)}$$

Harmonic centrality is inversely proportional to the harmonic mean distance.

### Why "Harmonic"?

The name comes from the **harmonic mean**:

$$\text{Harmonic Mean}(x_1, ..., x_k) = \frac{k}{\sum_{i=1}^k \frac{1}{x_i}}$$

Harmonic centrality is:
$$H(v) = \sum_{u \neq v} \frac{1}{d(v,u)} = \frac{n-1}{\text{Harmonic Mean of distances from v}}$$

### Weighted Harmonic Centrality

For weighted graphs:
$$H(v) = \sum_{u \neq v} \frac{1}{d_w(v, u)}$$

Where $d_w(v,u)$ is the weighted shortest path distance (computed via Dijkstra).

## Historical Context

- **1950**: Alex Bavelas introduces Closeness Centrality
- **1965**: Murray Beauchamp formalizes closeness with normalization
- **1970s**: Disconnectedness problem recognized — ad hoc fixes within components
- **2000**: Marchiori & Latora propose harmonic centrality in "Harmony in the Small-World" (Physica A)
- **2003**: Latora & Marchiori extend to "Economic Small-World Behavior in Weighted Networks"
- **2010s**: Harmonic centrality becomes standard in network analysis toolkits

## Comparison with Closeness

| Property | Closeness | Harmonic |
|----------|-----------|----------|
| Formula | 1 / Σd | Σ(1/d) |
| Disconnected graphs | Undefined (0) | Well-defined |
| Outlier sensitivity | High (one large d dominates) | Low (1/d diminishes) |
| Computation | Same O(V·(V+E)) | Same O(V·(V+E)) |
| Interpretation | Inverse avg. distance | Sum reciprocal distances |
| Normalization | 0 to 1 (within component) | 0 to 1 (global) |

## Applications

### Network Analysis
- **Infrastructure Resilience**: Nodes that can quickly reach others
- **Communication Efficiency**: Information dissemination capability
- **Transportation Hub Ranking**: Airports with short travel times to many cities

### Biology
- **Protein Interaction Networks**: Proteins with efficient signaling paths
- **Brain Connectivity**: Regions with short functional paths to other regions
- **Metabolic Networks**: Key metabolites in reaction pathways

### Social Sciences
- **Social Influence**: People who can reach many others in few steps
- **Organizational Communication**: Efficient information positions
- **Collaboration Networks**: Researchers with short co-authorship paths

### Internet and Technology
- **Router Importance**: Hops to all destinations
- **Web Graph**: Pages close to many others
- **Peer-to-Peer Networks**: Efficient lookup nodes

## Advantages Over Closeness

1. **Handles Disconnectedness**: Naturally, without component isolation
2. **Less Sensitive to Outliers**: One very distant node doesn't dominate
3. **Simple Computation**: Just BFS + sum reciprocals — no special cases
4. **Meaningful Zero**: Only for truly isolated nodes
5. **Global Comparison**: Can compare nodes across components
6. **Monotonic**: Adding edges always increases (never decreases) centrality