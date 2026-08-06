class FenwickTree:
    """
    Fenwick Tree (Binary Indexed Tree) for prefix sums.
    
    Supports O(log n) point updates and prefix sum queries
    with minimal memory overhead (n+1 elements).
    
    Time Complexity: O(log n) per operation
    Space Complexity: O(n)
    
    Example:
        >>> arr = [3, 1, 4, 1, 5, 9, 2, 6]
        >>> bit = FenwickTree(arr)
        >>> bit.prefix_sum(5)  # arr[1..5] = 3+1+4+1+5
        14
        >>> bit.range_sum(3, 6)  # arr[3..6] = 4+1+5+9
        19
        >>> bit.add(3, 10)  # arr[3] += 10
        >>> bit.range_sum(3, 6)
        29
    """
    
    def __init__(self, data):
        """
        Build Fenwick Tree from array in O(n).
        
        Args:
            data: List of numbers
        """
        self.n = len(data)
        self.tree = [0] * (self.n + 1)  # 1-indexed
        
        # O(n) build: first copy data, then propagate
        for i in range(self.n):
            self.tree[i + 1] = data[i]
        
        for i in range(1, self.n + 1):
            parent = i + self._lsb(i)
            if parent <= self.n:
                self.tree[parent] += self.tree[i]
    
    @staticmethod
    def _lsb(x):
        """
        Least Significant Bit.
        
        Returns the value of the lowest set bit.
        
        Examples:
            _lsb(6) = 2  (binary 110 → 010)
            _lsb(8) = 8  (1000)
        """
        return x & (-x)
    
    def add(self, index, delta):
        """
        Add delta to element at given index.
        
        Time Complexity: O(log n)
        
        Args:
            index: 1-based index (1 to n)
            delta: Value to add
        """
        if index < 1 or index > self.n:
            raise IndexError(f"Index {index} out of range [1, {self.n}]")
        
        i = index
        while i <= self.n:
            self.tree[i] += delta
            i += self._lsb(i)
    
    def point_update(self, index, value):
        """
        Set element at index to value.
        
        Time Complexity: O(log n)
        
        Args:
            index: 1-based index
            value: New value
        """
        current = self.prefix_sum(index) - self.prefix_sum(index - 1)
        delta = value - current
        self.add(index, delta)
    
    def prefix_sum(self, index):
        """
        Compute sum of elements from 1 to index.
        
        Time Complexity: O(log n)
        
        Args:
            index: 1-based index
        
        Returns:
            Sum of arr[1..index]
        """
        if index == 0:
            return 0
        if index < 0 or index > self.n:
            raise IndexError(f"Index {index} out of range [0, {self.n}]")
        
        total = 0
        i = index
        while i > 0:
            total += self.tree[i]
            i -= self._lsb(i)
        
        return total
    
    def range_sum(self, left, right):
        """
        Compute sum of elements in range [left, right].
        
        Time Complexity: O(log n)
        
        Args:
            left: 1-based left index
            right: 1-based right index (inclusive)
        
        Returns:
            Sum of arr[left..right]
        """
        if left < 1 or right > self.n or left > right:
            raise IndexError(f"Invalid range [{left}, {right}]")
        
        return self.prefix_sum(right) - self.prefix_sum(left - 1)
    
    def get(self, index):
        """
        Get value at index.
        
        Time Complexity: O(log n)
        """
        return self.prefix_sum(index) - self.prefix_sum(index - 1)
    
    def __len__(self):
        return self.n
    
    def __repr__(self):
        return f"FenwickTree(n={self.n}, tree={self.tree[1:]})"


class FenwickTree0Indexed:
    """
    Fenwick Tree with 0-indexed interface.
    
    Wraps 1-indexed implementation for convenience
    in languages with 0-indexed arrays.
    
    Example:
        >>> arr = [3, 1, 4, 1, 5]
        >>> bit = FenwickTree0Indexed(arr)
        >>> bit.range_sum(1, 3)  # arr[1..3] = 1+4+1 (0-indexed)
        6
    """
    
    def __init__(self, data):
        self.bit = FenwickTree(data)
    
    def add(self, index, delta):
        """0-indexed add."""
        self.bit.add(index + 1, delta)
    
    def prefix_sum(self, index):
        """Sum of arr[0..index] (0-indexed)."""
        return self.bit.prefix_sum(index + 1)
    
    def range_sum(self, left, right):
        """Sum of arr[left..right] (0-indexed)."""
        return self.bit.range_sum(left + 1, right + 1)
    
    def __len__(self):
        return len(self.bit)


class FenwickTreeRangeUpdate:
    """
    Fenwick Tree supporting range updates and point queries.
    
    Uses difference array technique:
    To add x to range [l, r]: add(l, x), add(r+1, -x)
    Point query at i = prefix_sum(i)
    
    Time Complexity: O(log n) per operation
    
    Example:
        >>> ft = FenwickTreeRangeUpdate(10)
        >>> ft.range_add(3, 7, 5)  # Add 5 to indices 3..7
        >>> ft.point_query(4)
        5
        >>> ft.point_query(8)
        0
    """
    
    def __init__(self, n):
        """
        Initialize for array of size n (all zeros).
        
        Args:
            n: Size of array
        """
        self.n = n
        self.tree = [0] * (n + 2)  # Extra space for r+1 overflow
    
    def _add(self, index, delta):
        """Internal add to BIT."""
        i = index
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)
    
    def range_add(self, left, right, delta):
        """
        Add delta to all elements in [left, right].
        
        Args:
            left: 1-based left index
            right: 1-based right index
            delta: Value to add
        """
        self._add(left, delta)
        self._add(right + 1, -delta)
    
    def point_query(self, index):
        """
        Get value at index.
        
        Args:
            index: 1-based index
        
        Returns:
            Value at index after all range updates
        """
        total = 0
        i = index
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)
        return total


class FenwickTreeRangeUpdateRangeQuery:
    """
    Fenwick Tree supporting both range updates and range queries.
    
    Uses two BITs:
    BIT1: stores coefficient for linear term
    BIT2: stores constant term
    
    Range add x to [l, r]:
    - BIT1: add(l, x), add(r+1, -x)
    - BIT2: add(l, x*(l-1)), add(r+1, -x*r)
    
    Prefix sum at i = BIT1.prefix(i) * i - BIT2.prefix(i)
    
    Time Complexity: O(log n) per operation
    
    Example:
        >>> ft = FenwickTreeRangeUpdateRangeQuery(10)
        >>> ft.range_add(3, 7, 5)
        >>> ft.range_sum(4, 6)  # Sum of indices 4..6
        15
    """
    
    def __init__(self, n):
        self.n = n
        self.bit1 = [0] * (n + 2)
        self.bit2 = [0] * (n + 2)
    
    def _add(self, tree, index, delta):
        """Internal add to a BIT."""
        i = index
        while i <= self.n:
            tree[i] += delta
            i += i & (-i)
    
    def _prefix_sum(self, tree, index):
        """Internal prefix sum on a BIT."""
        total = 0
        i = index
        while i > 0:
            total += tree[i]
            i -= i & (-i)
        return total
    
    def range_add(self, left, right, delta):
        """
        Add delta to all elements in [left, right].
        
        Args:
            left: 1-based left index
            right: 1-based right index
            delta: Value to add
        """
        self._add(self.bit1, left, delta)
        self._add(self.bit1, right + 1, -delta)
        self._add(self.bit2, left, delta * (left - 1))
        self._add(self.bit2, right + 1, -delta * right)
    
    def _prefix_sum_combined(self, index):
        """Prefix sum at index with range updates applied."""
        if index == 0:
            return 0
        return (self._prefix_sum(self.bit1, index) * index - 
                self._prefix_sum(self.bit2, index))
    
    def range_sum(self, left, right):
        """
        Sum of elements in [left, right].
        
        Args:
            left: 1-based left index
            right: 1-based right index
        
        Returns:
            Sum in range
        """
        return self._prefix_sum_combined(right) - self._prefix_sum_combined(left - 1)


def count_inversions_bit(arr):
    """
    Count inversions in array using Fenwick Tree.
    
    An inversion is a pair (i,j) where i < j but arr[i] > arr[j].
    
    Time Complexity: O(n log n)
    Space Complexity: O(n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        int: Number of inversions
    
    Example:
        >>> count_inversions_bit([2, 4, 1, 3, 5])
        3  # Inversions: (2,1), (4,1), (4,3)
    """
    if not arr:
        return 0
    
    # Coordinate compression
    sorted_unique = sorted(set(arr))
    rank = {val: i + 1 for i, val in enumerate(sorted_unique)}
    
    bit = FenwickTree([0] * len(sorted_unique))
    inversions = 0
    
    # Process from right to left
    for val in reversed(arr):
        r = rank[val]
        # Count elements smaller than current (already processed)
        inversions += bit.prefix_sum(r - 1)
        bit.add(r, 1)
    
    return inversions