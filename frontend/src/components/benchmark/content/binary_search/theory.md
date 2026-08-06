# Theory

Binary Search is one of the most fundamental and elegant algorithms in computer science. It locates a target value within a sorted array by repeatedly dividing the search interval in half. First described in 1946 by John Mauchly (co-designer of ENIAC), it was formally analyzed by Derrick Henry Lehmer in 1960. The algorithm exemplifies the divide-and-conquer paradigm and achieves logarithmic time complexity—a dramatic improvement over linear search for large datasets.

## Key Concepts

- **Divide and Conquer**: Each step eliminates half the remaining elements
- **Sorted Array Requirement**: Input must be sorted for binary search to work
- **Logarithmic Time**: O(log n) comparisons—optimal for comparison-based search
- **Decision Tree**: Binary search corresponds to a balanced binary decision tree
- **Two-Pointer Technique**: Maintains left and right boundaries of search space
- **Invariant**: If target exists, it is always within [left, right]

## Mathematical Foundation

### Algorithm Correctness

**Loop Invariant**: At the start of each iteration, if the target exists in the array, its index is in the range [left, right].

**Proof**:
1. **Initialization**: left = 0, right = n-1. Invariant holds trivially.
2. **Maintenance**: If arr[mid] < target, target must be in (mid, right], so left = mid + 1 preserves invariant. If arr[mid] > target, target must be in [left, mid), so right = mid - 1 preserves invariant.
3. **Termination**: When left > right, the range is empty, so target is not in array.

### Complexity Analysis

**Recurrence Relation**:
$$T(n) = T\left(\frac{n}{2}\right) + O(1)$$

**Solution** (Master Theorem, Case 2a):
$$T(n) = \Theta(\log n)$$

**Exact Comparisons**:
- **Worst case (unsuccessful search)**: ⌊log₂ n⌋ + 1
- **Worst case (successful search)**: ⌊log₂ n⌋ + 1
- **Average case (successful)**: ≈ log₂ n - 1
- **Best case**: 1 (element at middle)

### Information-Theoretic Lower Bound

Binary search is **optimal** for comparison-based searching in sorted arrays:

- With k comparisons, we can distinguish at most 2ᵏ outcomes
- To find one element among n, we need 2ᵏ ≥ n
- Therefore k ≥ ⌈log₂ n⌉
- Binary search achieves this bound → **asymptotically optimal**

## Historical Context

Binary search has a surprisingly long history:

- **~200 BC**: Babylonian mathematicians used a form of binary search for calculating square roots
- **1946**: John Mauchly discusses binary search in Moore School Lectures (first explicit CS description)
- **1960**: Derrick Henry Lehmer publishes formal analysis
- **1962**: First correct implementation published (many early implementations had bugs!)
- **1986**: Jon Bentley's "Programming Pearls" famously noted that only 10% of professional programmers could write correct binary search
- **2006**: A study showed even Java's binary search implementation had a bug (integer overflow in `(low + high) / 2`)

The overflow bug (found in Java's `java.util.Arrays.binarySearch` in 2006) demonstrates the subtlety of implementing binary search correctly:

**Buggy**: `mid = (left + right) / 2` — can overflow for large arrays  
**Fixed**: `mid = left + (right - left) / 2` — always safe

## Variants

### Standard Binary Search
Finds exact match of target value. Returns index or -1.

### Lower Bound (First Occurrence)
Finds the first index where arr[i] ≥ target. Useful for finding insertion point.

### Upper Bound (Last Occurrence)
Finds the first index where arr[i] > target. Complementary to lower bound.

### Binary Search on Answer
Searches over a monotonic function f(x) to find threshold. Common in optimization problems.

### Exponential Search
Combines exponential probing with binary search for unbounded or infinite arrays.

### Interpolation Search
Uses linear interpolation instead of midpoint when values are uniformly distributed (O(log log n) expected).

### Fibonacci Search
Uses Fibonacci numbers for division; fewer divisions but same asymptotic complexity.

## Applications

### Core CS
- **Search in Sorted Arrays**: Most basic and common use
- **Symbol Tables**: Ordered dictionary implementations
- **Database Indexing**: B-tree traversal uses binary search within nodes
- **Memory Management**: Finding free blocks in buddy allocators

### Problem Solving
- **Square Root Calculation**: Finding √x with precision ε
- **Finding Roots**: Numerical methods for equation solving
- **Longest Increasing Subsequence**: O(n log n) algorithm uses binary search
- **Range Queries**: Finding elements in [a, b] range

### Real-World Systems
- **Git Bisect**: Finding buggy commits by binary searching git history
- **Debugging**: Binary search through code to find failure point
- **Autocomplete**: Finding prefix matches in sorted dictionary
- **Load Balancing**: Finding appropriate server in sorted load list
- **Peer-to-Peer Networks**: Chord DHT uses binary-search-like finger tables

## Common Pitfalls

1. **Integer Overflow**: `(left + right)` can overflow; use `left + (right - left) / 2`
2. **Off-by-One Errors**: Incorrectly updating left/right boundaries
3. **Infinite Loop**: Forgetting to move past middle: `left = mid` instead of `left = mid + 1`
4. **Unsorted Input**: Binary search on unsorted array produces undefined behavior
5. **Duplicate Handling**: Need specialized variants for lower/upper bound queries
6. **Empty Array**: Must check for n = 0 before starting

## Comparison with Other Search Algorithms

| Algorithm | Data Structure | Time | Space | Requires Sorting |
|-----------|---------------|------|-------|------------------|
| Linear Search | Any | O(n) | O(1) | No |
| Binary Search | Sorted Array | O(log n) | O(1) | Yes |
| Jump Search | Sorted Array | O(√n) | O(1) | Yes |
| Interpolation Search | Sorted Uniform Array | O(log log n) avg | O(1) | Yes |
| Hash Table Lookup | Hash Table | O(1) avg | O(n) | No |
| BST Search | Binary Search Tree | O(h) | O(1) | Yes (by construction) |