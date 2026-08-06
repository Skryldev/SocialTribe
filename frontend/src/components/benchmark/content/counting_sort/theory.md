# Theory

Counting Sort is a non-comparison-based sorting algorithm that achieves linear time complexity by exploiting the limited range of input values. Invented by Harold H. Seward in 1954 at MIT, it was one of the earliest efficient sorting algorithms for discrete, bounded integer data. Unlike comparison-based sorts which have a lower bound of Ω(n log n), Counting Sort bypasses this limit by using arithmetic on keys as array indices rather than comparing elements.

## Key Concepts

- **Non-Comparison Sort**: Uses values as indices, not pairwise comparisons
- **Linear Time**: O(n + k) where k is the range of values
- **Integer Sorting**: Requires discrete, integer (or integer-mappable) keys
- **Counting Array**: Direct addressing table for frequency counting
- **Cumulative Sum**: Prefix sums determine final positions
- **Stable Sort**: Preserves relative order of equal elements
- **Not In-Place**: Requires auxiliary arrays proportional to n and k

## Mathematical Foundation

### Algorithm Correctness

**Loop Invariant** (phase 3 — cumulative sum):
After processing index i, count[j] for j ≤ i contains the number of elements with value ≤ (j + min_value).

**Proof of Stability:**
The reverse iteration in the final phase ensures that when two elements have the same value, the one appearing later in the input gets placed later (higher index) in the output. Combined with decrementing counts, this preserves the original relative order.

### Time Complexity Analysis

$$T(n, k) = O(n) + O(k) + O(n) + O(k) = O(n + k)$$

Where:
- O(n): Iterating through input twice (counting + placing)
- O(k): Creating and processing the counting array

### Space Complexity Analysis

$$S(n, k) = O(k) \text{ (counting array) } + O(n) \text{ (output array) } = O(n + k)$$

### When Counting Sort Outperforms Comparison Sorts

| Condition | Counting Sort | Quick Sort |
|-----------|---------------|------------|
| k = O(n) | O(n) | O(n log n) |
| k = O(n log n) | O(n log n) | O(n log n) |
| k = O(n²) | O(n²) | O(n log n) |

**Rule of thumb**: Use Counting Sort when k ≤ n log n, otherwise use comparison sort.

### Theoretical Lower Bound

Comparison-based sorts have Ω(n log n) lower bound because they gain information only through pairwise comparisons (decision tree argument). Counting Sort avoids this by using values directly as array indices, gaining O(1) "information" per element about where it belongs.

## Historical Context

- **1954**: Harold Seward develops Counting Sort at MIT as part of his Master's thesis on radix sorting
- **1956**: Included in the first comprehensive sorting survey by Friend
- **1960s**: Became standard subroutine in Radix Sort implementations
- **1970s**: Formal analysis and comparison with other linear-time sorts
- **1980s**: Integrated into early parallel computing algorithms
- **Present**: Fundamental component in Radix Sort, used extensively in systems where k is bounded (e.g., sorting characters, grades, ages)

## Comparison with Other Linear-Time Sorts

| Algorithm | Time | Space | Stable | Requires |
|-----------|------|-------|--------|----------|
| Counting Sort | O(n+k) | O(n+k) | Yes | Integer keys, small k |
| Radix Sort | O(d·(n+b)) | O(n+b) | Yes | Fixed-width integer keys |
| Bucket Sort | O(n) average | O(n+k) | Yes | Uniform distribution |
| Pigeonhole Sort | O(n+k) | O(n+k) | Yes | Integer keys |

## Applications

### Systems
- **Character Sorting**: ASCII/Unicode characters (k = 256 or 65536)
- **Radix Sort Subroutine**: Most common use; sorts by each digit/character
- **Database Indexing**: Sorting integer keys with small range
- **Grade Processing**: Sorting student scores (0-100)
- **Histogram Equalization**: Image processing
- **Counting Inversions**: When values are bounded

### Specialized Domains
- **DNA Sequencing**: Sorting nucleotides (A, C, G, T — k = 4)
- **Voting Systems**: Tallying votes for candidates
- **Priority Queues**: With small integer priorities
- **Event Simulation**: Sorting events by small discrete timestamps
- **Embedded Systems**: When memory is tight and values are bounded

## Limitations and Edge Cases

1. **Large k Problem**: If range is huge (e.g., keys are 32-bit integers), O(k) space is impractical
   - **Solution**: Use Radix Sort instead

2. **Negative Numbers**: Basic version assumes non-negative keys
   - **Solution**: Shift values by min_value (standard approach)

3. **Sparse Data**: If n << k, most of counting array is wasted
   - **Solution**: Hash map for frequency counting (becomes O(n) average)

4. **Floating Point**: Cannot use floats as array indices
   - **Solution**: Bucket Sort or comparison sort

5. **Non-Numeric Keys**: Keys must be mappable to integers
   - **Solution**: Hash function or comparison sort for general objects