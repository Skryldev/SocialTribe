class AVLNode:
    """Node in an AVL tree."""
    
    def __init__(self, key, value=None):
        self.key = key
        self.value = value
        self.left = None
        self.right = None
        self.height = 1  # Height of leaf node is 1


class AVLTree:
    """
    AVL Tree - Self-balancing Binary Search Tree.
    
    Guarantees O(log n) height for all operations through
    strict balance conditions and rotation operations.
    
    Time Complexity: O(log n) for search, insert, delete
    Space Complexity: O(n) for n nodes
    
    Example:
        >>> avl = AVLTree()
        >>> avl.insert(10, "A")
        >>> avl.insert(20, "B")
        >>> avl.insert(30, "C")  # Triggers rotation
        >>> avl.search(20)
        'B'
        >>> avl.inorder()
        [10, 20, 30]
    """
    
    def __init__(self):
        self.root = None
        self._size = 0
    
    # ==================== Public API ====================
    
    def insert(self, key, value=None):
        """
        Insert a key-value pair into the AVL tree.
        
        Time Complexity: O(log n)
        
        Args:
            key: Comparable key
            value: Associated value (optional)
        """
        self.root = self._insert(self.root, key, value)
        self._size += 1
    
    def delete(self, key):
        """
        Remove a key from the AVL tree.
        
        Time Complexity: O(log n)
        
        Args:
            key: Key to remove
        
        Raises:
            KeyError: If key not found
        """
        if key not in self:
            raise KeyError(f"Key {key} not found")
        self.root = self._delete(self.root, key)
        self._size -= 1
    
    def search(self, key):
        """
        Find value associated with key.
        
        Time Complexity: O(log n)
        
        Args:
            key: Key to search for
        
        Returns:
            Value associated with key
        
        Raises:
            KeyError: If key not found
        """
        node = self._search(self.root, key)
        if node is None:
            raise KeyError(f"Key {key} not found")
        return node.value
    
    def get(self, key, default=None):
        """
        Get value with default if key not found.
        
        Time Complexity: O(log n)
        """
        try:
            return self.search(key)
        except KeyError:
            return default
    
    def contains(self, key):
        """
        Check if key exists in tree.
        
        Time Complexity: O(log n)
        """
        return self._search(self.root, key) is not None
    
    def minimum(self):
        """
        Get minimum key in tree.
        
        Time Complexity: O(log n)
        """
        if self.root is None:
            raise ValueError("Tree is empty")
        return self._minimum(self.root).key
    
    def maximum(self):
        """
        Get maximum key in tree.
        
        Time Complexity: O(log n)
        """
        if self.root is None:
            raise ValueError("Tree is empty")
        return self._maximum(self.root).key
    
    def inorder(self):
        """
        In-order traversal (sorted order).
        
        Time Complexity: O(n)
        
        Returns:
            list: Keys in sorted order
        """
        result = []
        self._inorder(self.root, result)
        return result
    
    def preorder(self):
        """Pre-order traversal."""
        result = []
        self._preorder(self.root, result)
        return result
    
    def size(self):
        """Number of nodes in tree."""
        return self._size
    
    def height(self):
        """Height of the tree."""
        return self._get_height(self.root)
    
    def is_balanced(self):
        """
        Verify AVL balance property for all nodes.
        
        Returns:
            bool: True if tree satisfies AVL balance condition
        """
        return self._is_balanced(self.root)
    
    # ==================== Internal Operations ====================
    
    def _get_height(self, node):
        """Get height of node (0 for None)."""
        return node.height if node else 0
    
    def _get_balance(self, node):
        """Get balance factor of node."""
        if not node:
            return 0
        return self._get_height(node.left) - self._get_height(node.right)
    
    def _update_height(self, node):
        """Update height of node based on children."""
        if node:
            node.height = 1 + max(
                self._get_height(node.left),
                self._get_height(node.right)
            )
    
    # ==================== Rotations ====================
    
    def _right_rotate(self, y):
        """
        Right rotation (LL case).
        
        Args:
            y: Unbalanced node (BF > 1)
        
        Returns:
            x: New root of subtree
        """
        x = y.left
        T2 = x.right
        
        # Perform rotation
        x.right = y
        y.left = T2
        
        # Update heights (y first, then x)
        self._update_height(y)
        self._update_height(x)
        
        return x
    
    def _left_rotate(self, x):
        """
        Left rotation (RR case).
        
        Args:
            x: Unbalanced node (BF < -1)
        
        Returns:
            y: New root of subtree
        """
        y = x.right
        T2 = y.left
        
        # Perform rotation
        y.left = x
        x.right = T2
        
        # Update heights (x first, then y)
        self._update_height(x)
        self._update_height(y)
        
        return y
    
    # ==================== Insertion ====================
    
    def _insert(self, node, key, value):
        """
        Recursive insertion with rebalancing.
        
        Returns:
            New root of subtree after insertion
        """
        # Standard BST insertion
        if not node:
            return AVLNode(key, value)
        
        if key < node.key:
            node.left = self._insert(node.left, key, value)
        elif key > node.key:
            node.right = self._insert(node.right, key, value)
        else:
            # Key exists, update value
            node.value = value
            self._size -= 1  # Will be incremented in public insert
            return node
        
        # Update height of current node
        self._update_height(node)
        
        # Get balance factor
        balance = self._get_balance(node)
        
        # Left-Left case
        if balance > 1 and key < node.left.key:
            return self._right_rotate(node)
        
        # Right-Right case
        if balance < -1 and key > node.right.key:
            return self._left_rotate(node)
        
        # Left-Right case
        if balance > 1 and key > node.left.key:
            node.left = self._left_rotate(node.left)
            return self._right_rotate(node)
        
        # Right-Left case
        if balance < -1 and key < node.right.key:
            node.right = self._right_rotate(node.right)
            return self._left_rotate(node)
        
        return node
    
    # ==================== Deletion ====================
    
    def _delete(self, node, key):
        """
        Recursive deletion with rebalancing.
        
        Returns:
            New root of subtree after deletion
        """
        if not node:
            return None
        
        # Standard BST deletion
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif key > node.key:
            node.right = self._delete(node.right, key)
        else:
            # Node found - perform deletion
            if not node.left:
                return node.right
            elif not node.right:
                return node.left
            else:
                # Two children: replace with inorder successor
                successor = self._minimum(node.right)
                node.key = successor.key
                node.value = successor.value
                node.right = self._delete(node.right, successor.key)
        
        # Update height
        self._update_height(node)
        
        # Rebalance
        balance = self._get_balance(node)
        
        # Left-Left
        if balance > 1 and self._get_balance(node.left) >= 0:
            return self._right_rotate(node)
        
        # Left-Right
        if balance > 1 and self._get_balance(node.left) < 0:
            node.left = self._left_rotate(node.left)
            return self._right_rotate(node)
        
        # Right-Right
        if balance < -1 and self._get_balance(node.right) <= 0:
            return self._left_rotate(node)
        
        # Right-Left
        if balance < -1 and self._get_balance(node.right) > 0:
            node.right = self._right_rotate(node.right)
            return self._left_rotate(node)
        
        return node
    
    # ==================== Search ====================
    
    def _search(self, node, key):
        """Recursive search for key."""
        if not node:
            return None
        if key == node.key:
            return node
        elif key < node.key:
            return self._search(node.left, key)
        else:
            return self._search(node.right, key)
    
    # ==================== Utility ====================
    
    def _minimum(self, node):
        """Find node with minimum key in subtree."""
        current = node
        while current.left:
            current = current.left
        return current
    
    def _maximum(self, node):
        """Find node with maximum key in subtree."""
        current = node
        while current.right:
            current = current.right
        return current
    
    def _inorder(self, node, result):
        """In-order traversal helper."""
        if node:
            self._inorder(node.left, result)
            result.append(node.key)
            self._inorder(node.right, result)
    
    def _preorder(self, node, result):
        """Pre-order traversal helper."""
        if node:
            result.append(node.key)
            self._preorder(node.left, result)
            self._preorder(node.right, result)
    
    def _is_balanced(self, node):
        """Verify AVL balance property recursively."""
        if not node:
            return True
        
        balance = self._get_balance(node)
        if abs(balance) > 1:
            return False
        
        return self._is_balanced(node.left) and self._is_balanced(node.right)
    
    # ==================== Dunder Methods ====================
    
    def __contains__(self, key):
        return self.contains(key)
    
    def __getitem__(self, key):
        return self.search(key)
    
    def __setitem__(self, key, value):
        self.insert(key, value)
    
    def __delitem__(self, key):
        self.delete(key)
    
    def __len__(self):
        return self._size
    
    def __iter__(self):
        return iter(self.inorder())
    
    def __repr__(self):
        return f"AVLTree(size={self._size}, keys={self.inorder()})"


class AVLTreeIterative(AVLTree):
    """
    Iterative AVL Tree implementation.
    
    Avoids recursion to prevent stack overflow on very
    deep trees (though AVL height guarantees limit this).
    Useful for systems with limited stack space.
    """
    
    def insert(self, key, value=None):
        """Iterative insertion."""
        # Standard BST insert (iterative)
        if not self.root:
            self.root = AVLNode(key, value)
            self._size += 1
            return
        
        # Track path for rebalancing
        path = []
        current = self.root
        
        while current:
            path.append(current)
            if key < current.key:
                if not current.left:
                    current.left = AVLNode(key, value)
                    break
                current = current.left
            elif key > current.key:
                if not current.right:
                    current.right = AVLNode(key, value)
                    break
                current = current.right
            else:
                current.value = value
                return
        
        self._size += 1
        
        # Rebalance bottom-up
        self._rebalance_path(path)
    
    def _rebalance_path(self, path):
        """Rebalance nodes along the path from bottom to top."""
        while path:
            node = path.pop()
            self._update_height(node)
            balance = self._get_balance(node)
            
            # Determine rotation type
            if balance > 1:
                if self._get_balance(node.left) >= 0:
                    self._replace_in_parent(path, node, self._right_rotate(node))
                else:
                    node.left = self._left_rotate(node.left)
                    self._replace_in_parent(path, node, self._right_rotate(node))
            elif balance < -1:
                if self._get_balance(node.right) <= 0:
                    self._replace_in_parent(path, node, self._left_rotate(node))
                else:
                    node.right = self._right_rotate(node.right)
                    self._replace_in_parent(path, node, self._left_rotate(node))
    
    def _replace_in_parent(self, path, old_node, new_node):
        """Replace old_node with new_node in its parent."""
        if not path:
            self.root = new_node
        else:
            parent = path[-1]
            if parent.left == old_node:
                parent.left = new_node
            else:
                parent.right = new_node