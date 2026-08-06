# Theory

The Fenwick Tree, also known as the Binary Indexed Tree (BIT), is a data structure invented by Peter Fenwick in 1994 at the University of Auckland. It provides O(log n) time for point updates and prefix queries with minimal memory overhead—exactly n+1 elements compared to 4n for a Segment Tree. Its elegant bit manipulation-based traversal makes it one of the most efficient and widely-used data structures in competitive programming.

## Key Concepts

- **Binary Indexed**: Each index stores aggregated information for a range
- **Least Significant Bit (LSB)**: Core operation determining parent/child relationships
- **Prefix Queries**: Natural support for prefix sums; range queries via difference
- **Point Updates**: Add value at position, propagate to covering ranges
- **In-Place Building**: O(n) construction by processing each element once
- **No Recursion**: Pure iterative loops using bit operations
