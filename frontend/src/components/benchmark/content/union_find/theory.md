# Theory

Union-Find (also called Disjoint Set Union or DSU) is a fundamental data structure that maintains a partition of a set into disjoint subsets. Developed in the 1960s by Bernard Galler and Michael Fischer, and later optimized by Robert Tarjan with the inverse Ackermann complexity proof, it provides near-constant-time operations for managing equivalence relations and connected components in graphs.

## Key Concepts

- **Disjoint Sets**: Each element belongs to exactly one set
- **Representative Element**: Each set has a canonical "root" element
- **Forest of Trees**: Sets are represented as rooted trees
- **Path Compression**: Flattens tree structure during find operations
- **Union by Rank**: Attaches smaller tree under larger tree's root
- **Inverse Ackermann Function**: α(V) — grows incredibly slowly (≤ 5 for all practical inputs)

## Mathematical Foundation

### Amortized Complexity Analysis (Tarjan, 1975)

With both optimizations, m operations on n elements take:

$$O(m \cdot \alpha(n))$$

Where α(n) is the inverse Ackermann function:

$$\alpha(n) = \min\{k : A(k, 1) \geq n\}$$

The Ackermann function A(m, n) is defined as:

$$A(0, n) = n + 1$$
$$A(m+1, 0) = A(m, 1)$$
$$A(m+1, n+1) = A(m, A(m+1, n))$$

This function grows astronomically fast:
- A(4, 4) ≈ 2^(2^(2^65536)) — unimaginably large
- α(n) ≤ 4 for any n ≤ A(4, 4)

### Correctness Proof

**Invariant**: The parent pointers always form a forest of rooted trees where each tree represents exactly one set.

**Union by Rank Property**: For any node with rank r, the subtree rooted at that node has at least 2^r nodes. Therefore, the maximum height is O(log V) without path compression.

**Path Compression Property**: After find(x), all nodes on the path from x to the root point directly to the root, reducing future access time.

## Operations

### Find(x)