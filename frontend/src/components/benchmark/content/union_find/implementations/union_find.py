class UnionFind:
    """
    Union-Find (Disjoint Set Union) data structure.
    
    Maintains a partition of elements into disjoint sets with
    near-constant-time union and find operations using path
    compression and union by rank.
    
    Time Complexity: O(α(V)) amortized per operation
    Space Complexity: O(V)
    
    Attributes:
        parent: Array mapping element -> parent element
        rank: Array mapping element -> rank (tree height bound)
        size: Array mapping element -> set size (optional)
        count: Number of disjoint sets
    
    Example:
        >>> uf = UnionFind(5)
        >>> uf.union(0, 1)
        >>> uf.union(2, 3)
        >>> uf.union(0, 2)
        >>> uf.find(1)
        0  # Root of set containing 1
        >>> uf.connected(0, 3)
        True
        >>> uf.num_sets
        2  # {0,1,2,3} and {4}
    """
    
    def __init__(self, n):
        """
        Initialize n disjoint sets, each containing one element.
        
        Args:
            n: Number of elements (0 to n-1)
        """
        if n < 0:
            raise ValueError("n must be non-negative")
        
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n  # Track size of each set
        self.count = n       # Number of disjoint sets
    
    def find(self, x):
        """
        Find the representative (root) of the set containing x.
        
        Applies path compression to flatten the tree structure,
        making future finds on the same elements O(1).
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(1) iterative, O(log V) recursive stack
        
        Args:
            x: Element to find (0 ≤ x < n)
        
        Returns:
            int: Root element of the set containing x
        
        Raises:
            IndexError: If x is out of bounds
        """
        if x < 0 or x >= len(self.parent):
            raise IndexError(f"Element {x} out of range [0, {len(self.parent)})")
        
        # Path compression: make all nodes on path point directly to root
        root = x
        while self.parent[root] != root:
            root = self.parent[root]
        
        # Compress path (iterative to avoid stack overflow)
        while x != root:
            next_node = self.parent[x]
            self.parent[x] = root
            x = next_node
        
        return root
    
    def find_recursive(self, x):
        """
        Recursive version of find with path compression.
        
        More elegant but risks stack overflow on deep trees
        (extremely unlikely with union by rank).
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(tree height) for recursion stack
        
        Args:
            x: Element to find
        
        Returns:
            int: Root element
        """
        if x < 0 or x >= len(self.parent):
            raise IndexError(f"Element {x} out of range")
        
        if self.parent[x] != x:
            self.parent[x] = self.find_recursive(self.parent[x])
        return self.parent[x]
    
    def union(self, x, y):
        """
        Merge the sets containing elements x and y.
        
        Uses union by rank: attaches the shorter tree under
        the taller tree's root to keep trees balanced.
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(1)
        
        Args:
            x: First element
            y: Second element
        
        Returns:
            bool: True if sets were merged, False if already same set
        
        Raises:
            IndexError: If x or y is out of bounds
        """
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x == root_y:
            return False  # Already in same set
        
        # Union by rank: attach shorter tree under taller tree
        if self.rank[root_x] < self.rank[root_y]:
            root_x, root_y = root_y, root_x
        
        self.parent[root_y] = root_x
        self.size[root_x] += self.size[root_y]
        
        # If ranks equal, the new root gains one rank
        if self.rank[root_x] == self.rank[root_y]:
            self.rank[root_x] += 1
        
        self.count -= 1
        return True
    
    def union_by_size(self, x, y):
        """
        Union using set size instead of rank.
        
        Attaches the smaller set under the larger set's root.
        Also guarantees O(log V) tree height and O(α(V))
        amortized complexity with path compression.
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(1)
        
        Args:
            x: First element
            y: Second element
        
        Returns:
            bool: True if merged, False if already same set
        """
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x == root_y:
            return False
        
        # Attach smaller set under larger set
        if self.size[root_x] < self.size[root_y]:
            root_x, root_y = root_y, root_x
        
        self.parent[root_y] = root_x
        self.size[root_x] += self.size[root_y]
        
        # Rank update for size-based union (not strictly necessary but maintains invariant)
        if self.rank[root_x] == self.rank[root_y]:
            self.rank[root_x] += 1
        
        self.count -= 1
        return True
    
    def connected(self, x, y):
        """
        Check if elements x and y are in the same set.
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(1)
        
        Args:
            x: First element
            y: Second element
        
        Returns:
            bool: True if x and y are connected
        """
        return self.find(x) == self.find(y)
    
    def get_size(self, x):
        """
        Get the size of the set containing element x.
        
        Time Complexity: O(α(V)) amortized
        Space Complexity: O(1)
        
        Args:
            x: Element to query
        
        Returns:
            int: Number of elements in x's set
        """
        return self.size[self.find(x)]
    
    def get_components(self):
        """
        Get all disjoint sets as lists of elements.
        
        Time Complexity: O(V · α(V))
        Space Complexity: O(V)
        
        Returns:
            dict: Mapping root -> list of elements in that set
        """
        from collections import defaultdict
        
        components = defaultdict(list)
        for i in range(len(self.parent)):
            root = self.find(i)
            components[root].append(i)
        
        return dict(components)
    
    @property
    def num_sets(self):
        """Return the current number of disjoint sets."""
        return self.count
    
    def __len__(self):
        """Return number of elements."""
        return len(self.parent)
    
    def __repr__(self):
        return (f"UnionFind(n={len(self.parent)}, "
                f"sets={self.count})")
    
    def __str__(self):
        components = self.get_components()
        lines = [f"UnionFind with {self.count} set(s):"]
        for root, members in components.items():
            lines.append(f"  Set {root}: {sorted(members)}")
        return "\n".join(lines)


class UnionFindDict:
    """
    Union-Find for hashable elements (not just 0..n-1).
    
    Wrapper that maps arbitrary hashable elements to integer
    indices for use with the standard UnionFind.
    
    Time Complexity: O(α(V)) amortized per operation
    Space Complexity: O(V)
    
    Example:
        >>> uf = UnionFindDict()
        >>> uf.union('A', 'B')
        >>> uf.union('C', 'D')
        >>> uf.union('A', 'C')
        >>> uf.find('A')
        'A'  # 'A' is root
        >>> uf.connected('B', 'D')
        True
    """
    
    def __init__(self):
        self.uf = None
        self.elem_to_idx = {}
        self.idx_to_elem = {}
        self.next_idx = 0
    
    def _add_if_new(self, elem):
        """Add element if not already present."""
        if elem not in self.elem_to_idx:
            self.elem_to_idx[elem] = self.next_idx
            self.idx_to_elem[self.next_idx] = elem
            self.next_idx += 1
            return True
        return False
    
    def _rebuild_uf(self):
        """Rebuild underlying UnionFind with current elements."""
        n = len(self.elem_to_idx)
        self.uf = UnionFind(n)
    
    def find(self, elem):
        """Find root of set containing elem."""
        if self.uf is None:
            self._rebuild_uf()
        
        self._add_if_new(elem)
        idx = self.uf.find(self.elem_to_idx[elem])
        return self.idx_to_elem[idx]
    
    def union(self, elem1, elem2):
        """Merge sets containing elem1 and elem2."""
        if self.uf is None:
            self._rebuild_uf()
        
        self._add_if_new(elem1)
        self._add_if_new(elem2)
        
        if self.elem_to_idx[elem2] >= len(self.uf.parent):
            self._rebuild_uf()
        
        return self.uf.union(
            self.elem_to_idx[elem1],
            self.elem_to_idx[elem2]
        )
    
    def connected(self, elem1, elem2):
        """Check if elem1 and elem2 are in same set."""
        if self.uf is None:
            return elem1 == elem2
        
        idx1 = self.elem_to_idx.get(elem1)
        idx2 = self.elem_to_idx.get(elem2)
        
        if idx1 is None or idx2 is None:
            return elem1 == elem2
        
        return self.uf.connected(idx1, idx2)
    
    def get_components(self):
        """Get all sets as dict of root -> list of elements."""
        if self.uf is None:
            return {}
        
        components = {}
        raw_components = self.uf.get_components()
        
        for root_idx, members in raw_components.items():
            root = self.idx_to_elem[root_idx]
            components[root] = [self.idx_to_elem[i] for i in members]
        
        return components
    
    @property
    def num_sets(self):
        """Number of disjoint sets."""
        return self.uf.count if self.uf else 0
    
    def __len__(self):
        return len(self.elem_to_idx)


def connected_components_union_find(graph):
    """
    Find connected components of an undirected graph using Union-Find.
    
    Time Complexity: O(V + E · α(V))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
    
    Returns:
        dict: Mapping root -> list of nodes in that component
    
    Example:
        >>> graph = {
        ...     'A': {'B'},
        ...     'B': {'A', 'C'},
        ...     'C': {'B'},
        ...     'D': {'E'},
        ...     'E': {'D'},
        ...     'F': set()
        ... }
        >>> components = connected_components_union_find(graph)
        >>> len(components)
        3  # {A,B,C}, {D,E}, {F}
    """
    if not graph:
        return {}
    
    # Map nodes to indices
    nodes = list(graph.keys())
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    
    # Initialize Union-Find
    uf = UnionFind(len(nodes))
    
    # Union connected nodes
    for node, neighbors in graph.items():
        idx1 = node_to_idx[node]
        for neighbor in neighbors:
            idx2 = node_to_idx[neighbor]
            uf.union(idx1, idx2)
    
    # Build component mapping
    components = {}
    raw_components = uf.get_components()
    
    for root_idx, members in raw_components.items():
        root = nodes[root_idx]
        components[root] = [nodes[i] for i in members]
    
    return components


def has_cycle_union_find(graph):
    """
    Detect cycles in undirected graph using Union-Find.
    
    A cycle exists if an edge connects two nodes already
    in the same set.
    
    Time Complexity: O(E · α(V))
    Space Complexity: O(V)
    
    Args:
        graph: Dict mapping node -> set/list of neighbors
               OR list of edges as (u, v) tuples
    
    Returns:
        bool: True if graph contains a cycle
    
    Example:
        >>> edges = [(0, 1), (1, 2), (2, 0)]
        >>> has_cycle_union_find(edges)
        True
        >>> tree = [(0, 1), (1, 2), (2, 3)]
        >>> has_cycle_union_find(tree)
        False
    """
    # Handle edge list format
    if isinstance(graph, list):
        edges = graph
        nodes = set()
        for u, v in edges:
            nodes.add(u)
            nodes.add(v)
        
        node_to_idx = {node: i for i, node in enumerate(sorted(nodes))}
        uf = UnionFind(len(nodes))
        
        for u, v in edges:
            idx_u = node_to_idx[u]
            idx_v = node_to_idx[v]
            
            if uf.connected(idx_u, idx_v):
                return True
            
            uf.union(idx_u, idx_v)
        
        return False
    
    # Handle adjacency list format
    nodes = list(graph.keys())
    node_to_idx = {node: i for i, node in enumerate(nodes)}
    uf = UnionFind(len(nodes))
    
    seen_edges = set()
    
    for node, neighbors in graph.items():
        for neighbor in neighbors:
            # Process each undirected edge once
            edge = tuple(sorted([node, neighbor]))
            if edge in seen_edges:
                continue
            seen_edges.add(edge)
            
            idx1 = node_to_idx[node]
            idx2 = node_to_idx[neighbor]
            
            if uf.connected(idx1, idx2):
                return True
            
            uf.union(idx1, idx2)
    
    return False