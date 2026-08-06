# Theory

The Segment Tree is a versatile data structure for answering range queries and performing range updates on an array in logarithmic time. First introduced by Jon Louis Bentley in 1977 at Stanford University, it has become fundamental in competitive programming and systems requiring efficient interval operations.

## Key Concepts

- **Divide and Conquer**: Each node represents a contiguous segment of the array
- **Associative Operations**: Supports sum, min, max, gcd, bitwise operations, etc.
- **Range Queries**: Answer queries over any interval [l, r] in O(log n)
- **Lazy Propagation**: Deferred updates for efficient range modifications
- **Static Structure**: Array size fixed at construction (can be dynamic with overhead)
- **Binary Tree Representation**: Typically stored in array for cache efficiency

## Mathematical Foundation

### Tree Structure

For an array A[0..n-1]:
- **Root**: Represents segment [0, n-1]
- **Internal node for [l, r]**: 
  - mid = (l + r) // 2
  - Left child: [l, mid]
  - Right child: [mid+1, r]
- **Leaf**: Single element A[i]

### Array Representation (1-indexed)

For a segment tree of maximum size 4n:
- Root at index 1
- For node at index i:
  - Left child: 2i
  - Right child: 2i + 1
  - Parent: ⌊i/2⌋
- Node i represents segment [l, r] determined recursively

### Query Analysis

A range query on [ql, qr] visits O(log n) nodes because:

1. At each level, at most 2 nodes are "partially covered" (boundary nodes)
2. All nodes between boundaries are "fully covered" — their values used directly
3. Number of levels = ⌈log n⌉
4. Total visited nodes ≤ 4 log n (tight bound)

**Proof Sketch**:
- On each level, only nodes intersecting the query boundaries are explored
- Once a node is fully inside [ql, qr], its subtree is not explored
- This limits exploration to O(log n) nodes on the "edges" of the interval

### Lazy Propagation Analysis

For range updates without lazy propagation: O(n log n) — impractical
With lazy propagation: O(log n) — optimal

**Lazy Update Invariant**:
For each node i with pending lazy value lazy[i]:
- tree[i] already reflects the update for the segment
- Children have NOT yet received the update
- Before accessing children, push lazy[i] down

### Space Complexity Proof

**Claim**: A segment tree for an array of size n requires at most 4n nodes.

**Proof**:
- The tree is a full binary tree with n leaves
- In a full binary tree: internal nodes = leaves - 1
- Total nodes = n + (n - 1) = 2n - 1 (exact for n = 2^k)
- For arbitrary n: next power of 2 is < 2n
- Max nodes < 2 × 2n - 1 = 4n - 1
- **Therefore**: 4n is a safe upper bound

## Associative Operations

Segment trees support any **associative** operation ★ where:
$$(a \star b) \star c = a \star (b \star c)$$

| Operation | Identity | Use Case |
|-----------|----------|----------|
| Sum (+) | 0 | Range sum queries |
| Minimum (min) | +∞ | Range minimum queries (RMQ) |
| Maximum (max) | -∞ | Range maximum queries |
| GCD | 0 | Range GCD queries |
| Bitwise AND | ~0 (all 1s) | Range AND queries |
| Bitwise OR | 0 | Range OR queries |
| Bitwise XOR | 0 | Range XOR queries |
| Matrix Multiplication | Identity matrix | Range product queries |

**Non-associative operations** (like subtraction or division) cannot be used directly.

## Historical Context

- **1977**: Jon Bentley introduces Segment Trees in "Solutions to Klee's rectangle problems" (Carnegie Mellon University)
- **1980s**: Widely adopted in computational geometry for windowing queries
- **1990s**: Popularized in competitive programming by USSR/Russian competitors
- **2000s**: Standard technique in ICPC and IOI competitions
- **2010s**: Integrated into production systems (databases, game engines, GIS)

## Variants

### Iterative Segment Tree
- Uses bit operations for traversal
- Faster constant factor, simpler code
- Popularized by Al.Cash (Codeforces, 2015)

### Fenwick Tree (Binary Indexed Tree)
- Special case: only prefix queries, no range updates
- More memory-efficient (n+1 nodes)
- Simpler implementation

### Persistent Segment Tree
- Maintains all historical versions
- O(log n) query, O(log n) space per update
- Used for range queries on past versions

### 2D Segment Tree
- Segment tree of segment trees
- O(log² n) for rectangle queries in 2D grid
- O(n log n) space

### Segment Tree Beats
- Supports complex range operations (chmin, chmax, add, sum)
- Amortized O(log n) per operation
- Developed by Ji Driver (2016)

## Applications

### Competitive Programming
- **Range Sum/Min/Max**: Most common query types
- **Range GCD/LCM**: Number theory problems
- **Inversion Counting**: With coordinate compression
- **LIS (Longest Increasing Subsequence)**: O(n log n) using segment tree

### Real-World Systems
- **Game Engines**: Spatial partitioning for collision detection
- **GIS Systems**: Range queries on geographic data
- **Databases**: Materialized views with range aggregations
- **Financial Systems**: Time-series analysis (moving averages, range statistics)
- **Image Processing**: Integral images for box filters

## Comparison with Other Range Query Structures

| Structure | Build | Query | Update | Range Update | Space |
|-----------|-------|-------|--------|--------------|-------|
| Segment Tree | O(n) | O(log n) | O(log n) | O(log n) | O(n) |
| Fenwick Tree | O(n log n) | O(log n) | O(log n) | Not native | O(n) |
| Sparse Table | O(n log n) | O(1) | O(n) | No | O(n log n) |
| Sqrt Decomposition | O(n) | O(√n) | O(√n) | O(√n) | O(n) |

**When to use Segment Tree**: When you need both range queries AND range updates in logarithmic time.