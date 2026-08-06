# Theory

Merge Sort is one of the most elegant and theoretically important sorting algorithms. Invented by John von Neumann in 1945 as part of the EDVAC report, it was one of the first algorithms to achieve optimal O(n log n) time complexity. The algorithm exemplifies the divide-and-conquer paradigm and provides guaranteed performance regardless of input data distribution.

## Key Concepts

- **Divide and Conquer**: Split problem into subproblems, solve recursively, combine results
- **Stable Sorting**: Preserves relative order of equal elements
- **Guaranteed Performance**: O(n log n) in all cases (best, worst, average)
- **External Sorting**: Natural fit for sorting data too large to fit in memory
- **Merging**: Core operation combining two sorted sequences into one
- **Sentinel Values**: Infinity guards simplify merge logic