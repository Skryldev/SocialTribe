class SegmentTree:
    """
    Segment Tree for range sum queries and point updates.
    
    Supports O(log n) range queries and point updates.
    Uses 1-indexed array representation for the tree.
    
    Time Complexity: O(log n) per operation
    Space Complexity: O(n)
    
    Example:
        >>> arr = [1, 3, 5, 7, 9, 11]
        >>> st = SegmentTree(arr)
        >>> st.range_query(1, 3)  # arr[1..3] = 3+5+7
        15
        >>> st.point_update(2, 10)  # arr[2] = 10
        >>> st.range_query(1, 3)
        20
    """
    
    def __init__(self, data):
        """
        Build segment tree from array.
        
        Time Complexity: O(n)
        
        Args:
            data: List of numeric values
        """
        self.n = len(data)
        if self.n == 0:
            self.tree = []
            return
        
        # Allocate 4n space for tree (1-indexed)
        self.tree = [0] * (4 * self.n)
        self._build(data, 1, 0, self.n - 1)
    
    def _build(self, data, node, left, right):
        """
        Recursively build the segment tree.
        
        Args:
            data: Original array
            node: Current node index (1-indexed)
            left: Left boundary of segment
            right: Right boundary of segment
        """
        if left == right:
            # Leaf node
            self.tree[node] = data[left]
            return
        
        mid = (left + right) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        # Recursively build children
        self._build(data, left_child, left, mid)
        self._build(data, right_child, mid + 1, right)
        
        # Combine children
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def point_update(self, index, value):
        """
        Update a single element at given index.
        
        Time Complexity: O(log n)
        
        Args:
            index: 0-based index to update
            value: New value
        """
        self._point_update(1, 0, self.n - 1, index, value)
    
    def _point_update(self, node, left, right, index, value):
        """Recursive point update."""
        if left == right:
            # Leaf node reached
            self.tree[node] = value
            return
        
        mid = (left + right) // 2
        left_child = 2 * node
        right_child = 2 * node + 1
        
        if index <= mid:
            self._point_update(left_child, left, mid, index, value)
        else:
            self._point_update(right_child, mid + 1, right, index, value)
        
        # Update current node from children
        self.tree[node] = self.tree[left_child] + self.tree[right_child]
    
    def range_query(self, ql, qr):
        """
        Query sum over range [ql, qr] (inclusive).
        
        Time Complexity: O(log n)
        
        Args:
            ql: Left bound of query (0-based)
            qr: Right bound of query (0-based, inclusive)
        
        Returns:
            Sum of elements in range
        """
        return self._range_query(1, 0, self.n - 1, ql, qr)
    
    def _range_query(self, node, left, right, ql, qr):
        """
        Recursive range query.
        
        Three cases:
        1. Completely outside: return 0 (identity)
        2. Completely inside: return tree[node]
        3. Partial overlap: query both children
        """
        # Case 1: No overlap
        if ql > right or qr < left:
            return 0
        
        # Case 2: Complete overlap
        if ql <= left and right <= qr:
            return self.tree[node]
        
        # Case 3: Partial overlap
        mid = (left + right) // 2
        left_sum = self._range_query(2 * node, left, mid, ql, qr)
        right_sum = self._range_query(2 * node + 1, mid + 1, right, ql, qr)
        
        return left_sum + right_sum
    
    def __len__(self):
        return self.n


class LazySegmentTree:
    """
    Segment Tree with Lazy Propagation for range updates.
    
    Supports range add updates and range sum queries.
    Uses lazy propagation to defer updates to children.
    
    Time Complexity: O(log n) per operation
    Space Complexity: O(n)
    
    Example:
        >>> arr = [1, 2, 3, 4, 5]
        >>> lst = LazySegmentTree(arr)
        >>> lst.range_query(1, 3)  # 2+3+4
        9
        >>> lst.range_update(1, 3, 10)  # Add 10 to indices 1..3
        >>> lst.range_query(1, 3)  # 12+13+14
        39
    """
    
    def __init__(self, data):
        """
        Build segment tree with lazy propagation.
        
        Time Complexity: O(n)
        
        Args:
            data: List of numeric values
        """
        self.n = len(data)
        if self.n == 0:
            self.tree = []
            self.lazy = []
            return
        
        self.tree = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)  # Pending updates
        self._build(data, 1, 0, self.n - 1)
    
    def _build(self, data, node, left, right):
        """Build tree recursively."""
        if left == right:
            self.tree[node] = data[left]
            return
        
        mid = (left + right) // 2
        self._build(data, 2 * node, left, mid)
        self._build(data, 2 * node + 1, mid + 1, right)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
    
    def _push(self, node, left, right):
        """
        Push pending updates from node to its children.
        
        This is the key to lazy propagation: only propagate
        lazy values when children are actually needed.
        
        Time Complexity: O(1)
        """
        if self.lazy[node] != 0:
            mid = (left + right) // 2
            left_child = 2 * node
            right_child = 2 * node + 1
            
            # Apply lazy value to children's tree values
            self.tree[left_child] += self.lazy[node] * (mid - left + 1)
            self.tree[right_child] += self.lazy[node] * (right - mid)
            
            # Propagate lazy value to children
            self.lazy[left_child] += self.lazy[node]
            self.lazy[right_child] += self.lazy[node]
            
            # Clear lazy value of current node
            self.lazy[node] = 0
    
    def range_update(self, ql, qr, value):
        """
        Add value to all elements in range [ql, qr].
        
        Time Complexity: O(log n)
        
        Args:
            ql: Left bound (0-based, inclusive)
            qr: Right bound (0-based, inclusive)
            value: Value to add
        """
        self._range_update(1, 0, self.n - 1, ql, qr, value)
    
    def _range_update(self, node, left, right, ql, qr, value):
        """Recursive range update with lazy propagation."""
        # Case 1: No overlap
        if ql > right or qr < left:
            return
        
        # Case 2: Complete overlap
        if ql <= left and right <= qr:
            self.tree[node] += value * (right - left + 1)
            self.lazy[node] += value
            return
        
        # Case 3: Partial overlap - need to go deeper
        self._push(node, left, right)
        
        mid = (left + right) // 2
        self._range_update(2 * node, left, mid, ql, qr, value)
        self._range_update(2 * node + 1, mid + 1, right, ql, qr, value)
        
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
    
    def range_query(self, ql, qr):
        """
        Query sum over range [ql, qr].
        
        Time Complexity: O(log n)
        """
        return self._range_query(1, 0, self.n - 1, ql, qr)
    
    def _range_query(self, node, left, right, ql, qr):
        """Recursive range query with lazy propagation."""
        # No overlap
        if ql > right or qr < left:
            return 0
        
        # Complete overlap
        if ql <= left and right <= qr:
            return self.tree[node]
        
        # Partial overlap - push lazy before going deeper
        self._push(node, left, right)
        
        mid = (left + right) // 2
        left_val = self._range_query(2 * node, left, mid, ql, qr)
        right_val = self._range_query(2 * node + 1, mid + 1, right, ql, qr)
        
        return left_val + right_val
    
    def __len__(self):
        return self.n


class SegmentTreeMin:
    """
    Segment Tree for Range Minimum Queries (RMQ).
    
    Example:
        >>> arr = [5, 2, 8, 1, 9, 3]
        >>> st = SegmentTreeMin(arr)
        >>> st.range_min(1, 4)  # min(2, 8, 1, 9)
        1
    """
    
    def __init__(self, data):
        self.n = len(data)
        self.INF = float('inf')
        if self.n == 0:
            self.tree = []
            return
        self.tree = [self.INF] * (4 * self.n)
        self._build(data, 1, 0, self.n - 1)
    
    def _build(self, data, node, left, right):
        if left == right:
            self.tree[node] = data[left]
            return
        mid = (left + right) // 2
        self._build(data, 2 * node, left, mid)
        self._build(data, 2 * node + 1, mid + 1, right)
        self.tree[node] = min(self.tree[2 * node], self.tree[2 * node + 1])
    
    def range_min(self, ql, qr):
        return self._range_min(1, 0, self.n - 1, ql, qr)
    
    def _range_min(self, node, left, right, ql, qr):
        if ql > right or qr < left:
            return self.INF
        if ql <= left and right <= qr:
            return self.tree[node]
        mid = (left + right) // 2
        return min(
            self._range_min(2 * node, left, mid, ql, qr),
            self._range_min(2 * node + 1, mid + 1, right, ql, qr)
        )
    
    def point_update(self, index, value):
        self._point_update(1, 0, self.n - 1, index, value)
    
    def _point_update(self, node, left, right, index, value):
        if left == right:
            self.tree[node] = value
            return
        mid = (left + right) // 2
        if index <= mid:
            self._point_update(2 * node, left, mid, index, value)
        else:
            self._point_update(2 * node + 1, mid + 1, right, index, value)
        self.tree[node] = min(self.tree[2 * node], self.tree[2 * node + 1])


def iterative_segment_tree(data):
    """
    Iterative (bottom-up) Segment Tree for range sum queries.
    
    Uses 2n array. Faster constant factor, simpler code.
    Popularized by Al.Cash on Codeforces.
    
    Time Complexity: O(log n) per operation
    Space Complexity: O(2n)
    
    Example:
        >>> arr = [1, 3, 5, 7, 9, 11]
        >>> tree, n = iterative_segment_tree(arr)
        >>> # n is stored separately; tree is 2n array
    """
    n = len(data)
    if n == 0:
        return [], 0
    
    # Build tree: leaves at [n, 2n-1]
    tree = [0] * (2 * n)
    
    # Copy data to leaves
    for i in range(n):
        tree[n + i] = data[i]
    
    # Build internal nodes bottom-up
    for i in range(n - 1, 0, -1):
        tree[i] = tree[2 * i] + tree[2 * i + 1]
    
    return tree, n


def iterative_range_sum(tree, n, l, r):
    """
    Range sum query on iterative segment tree.
    
    Query sum on interval [l, r) (half-open).
    """
    l += n
    r += n
    result = 0
    
    while l < r:
        if l & 1:
            result += tree[l]
            l += 1
        if r & 1:
            r -= 1
            result += tree[r]
        l >>= 1
        r >>= 1
    
    return result


def iterative_point_update(tree, n, index, value):
    """
    Point update on iterative segment tree.
    """
    index += n
    tree[index] = value
    
    while index > 1:
        index >>= 1
        tree[index] = tree[2 * index] + tree[2 * index + 1]