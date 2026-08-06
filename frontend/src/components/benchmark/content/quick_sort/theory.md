# Theory

Quick Sort, developed by Sir Tony Hoare in 1959 during his work on machine translation at Moscow State University, is one of the most widely used sorting algorithms in practice. It employs the divide-and-conquer paradigm with an ingenious in-place partitioning scheme that sorts by recursively dividing an array around a chosen pivot element.

## Key Concepts

- **Divide and Conquer**: Partition array, then recursively sort subarrays
- **Pivot Selection**: Critical choice affecting performance dramatically
- **In-Place Partitioning**: Rearranges elements without extra array
- **Randomized Algorithm**: Random pivot selection provides probabilistic guarantees
- **Tail Recursion**: Optimization to limit worst-case stack depth
- **Hybrid Approaches**: Combined with insertion sort for small subarrays (Introsort)

## Mathematical Foundation

### Hoare's Original Algorithm (1961)

Tony Hoare published Quick Sort in 1961 in the Communications of the ACM. The paper is one of the most cited in computer science history.