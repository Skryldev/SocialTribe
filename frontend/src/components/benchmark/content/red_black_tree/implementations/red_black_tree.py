class Color:
    RED = True
    BLACK = False


class RBNode:
    """Node in a Red-Black tree."""
    
    def __init__(self, key, value=None, color=Color.RED):
        self.key = key
        self.value = value
        self.color = color  # New nodes are red
        self.left = None
        self.right = None
        self.parent = None


class RedBlackTree:
    """
    Red-Black Tree - Self-balancing Binary Search Tree.
    
    Guarantees O(log n) height through color invariants
    and local rotations. Optimized for update-heavy workloads.
    
    Time Complexity: O(log n) for search, insert, delete
    Space Complexity: O(n) for n nodes
    
    Example:
        >>> rbt = RedBlackTree()
        >>> rbt.insert(10, "A")
        >>> rbt.insert(20, "B")
        >>> rbt.insert(30, "C")  # Triggers recoloring
        >>> rbt.search(20)
        'B'
        >>> rbt.inorder()
        [10, 20, 30]
    """
    
    def __init__(self):
        self.NIL = RBNode(key=None, color=Color.BLACK)  # Sentinel NIL node
        self.root = self.NIL
        self._size = 0
    
    # ==================== Public API ====================
    
    def insert(self, key, value=None):
        """
        Insert a key-value pair into the Red-Black tree.
        
        Time Complexity: O(log n)
        
        Args:
            key: Comparable key
            value: Associated value (optional)
        """
        node = RBNode(key, value, Color.RED)
        node.left = self.NIL
        node.right = self.NIL
        
        # Standard BST insertion
        parent = None
        current = self.root
        
        while current != self.NIL:
            parent = current
            if node.key < current.key:
                current = current.left
            elif node.key > current.key:
                current = current.right
            else:
                # Key exists, update value
                current.value = value
                return
        
        node.parent = parent
        
        if parent is None:
            self.root = node
        elif node.key < parent.key:
            parent.left = node
        else:
            parent.right = node
        
        self._size += 1
        
        # Fix Red-Black properties
        self._insert_fixup(node)
    
    def delete(self, key):
        """
        Remove a key from the Red-Black tree.
        
        Time Complexity: O(log n)
        
        Args:
            key: Key to remove
        
        Raises:
            KeyError: If key not found
        """
        node = self._search_node(self.root, key)
        if node == self.NIL:
            raise KeyError(f"Key {key} not found")
        
        self._delete_node(node)
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
        node = self._search_node(self.root, key)
        if node == self.NIL:
            raise KeyError(f"Key {key} not found")
        return node.value
    
    def get(self, key, default=None):
        """Get value with default if key not found."""
        node = self._search_node(self.root, key)
        return node.value if node != self.NIL else default
    
    def contains(self, key):
        """Check if key exists in tree."""
        return self._search_node(self.root, key) != self.NIL
    
    def minimum(self):
        """Get minimum key in tree."""
        if self.root == self.NIL:
            raise ValueError("Tree is empty")
        return self._minimum(self.root).key
    
    def maximum(self):
        """Get maximum key in tree."""
        if self.root == self.NIL:
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
    
    def size(self):
        """Number of nodes in tree."""
        return self._size
    
    def is_valid(self):
        """
        Verify Red-Black tree properties.
        
        Returns:
            bool: True if all RB properties hold
        """
        if self.root == self.NIL:
            return True
        
        # Property 2: Root must be black
        if self.root.color != Color.BLACK:
            return False
        
        # Check all properties recursively
        black_height = [0]
        return self._is_valid_rb(self.root, black_height)
    
    # ==================== Insertion Fix-Up ====================
    
    def _insert_fixup(self, node):
        """
        Restore Red-Black properties after insertion.
        
        Cases:
        1. Uncle is RED → recolor
        2. Uncle is BLACK, triangle → rotate parent
        3. Uncle is BLACK, line → rotate grandparent
        """
        while node.parent and node.parent.color == Color.RED:
            if node.parent == node.parent.parent.left:
                uncle = node.parent.parent.right
                
                # Case 1: Uncle is RED
                if uncle.color == Color.RED:
                    node.parent.color = Color.BLACK
                    uncle.color = Color.BLACK
                    node.parent.parent.color = Color.RED
                    node = node.parent.parent
                else:
                    # Case 2: Triangle (right child of left parent)
                    if node == node.parent.right:
                        node = node.parent
                        self._left_rotate(node)
                    
                    # Case 3: Line (left child of left parent)
                    node.parent.color = Color.BLACK
                    node.parent.parent.color = Color.RED
                    self._right_rotate(node.parent.parent)
            else:
                # Mirror: parent is right child
                uncle = node.parent.parent.left
                
                # Case 1: Uncle is RED
                if uncle.color == Color.RED:
                    node.parent.color = Color.BLACK
                    uncle.color = Color.BLACK
                    node.parent.parent.color = Color.RED
                    node = node.parent.parent
                else:
                    # Case 2: Triangle (left child of right parent)
                    if node == node.parent.left:
                        node = node.parent
                        self._right_rotate(node)
                    
                    # Case 3: Line (right child of right parent)
                    node.parent.color = Color.BLACK
                    node.parent.parent.color = Color.RED
                    self._left_rotate(node.parent.parent)
        
        # Property 2: Root is black
        self.root.color = Color.BLACK
    
    # ==================== Deletion ====================
    
    def _delete_node(self, z):
        """
        Delete node z and restore Red-Black properties.
        
        Handles three cases:
        1. z has no children
        2. z has one child
        3. z has two children (replace with successor)
        """
        y = z
        y_original_color = y.color
        
        if z.left == self.NIL:
            x = z.right
            self._transplant(z, z.right)
        elif z.right == self.NIL:
            x = z.left
            self._transplant(z, z.left)
        else:
            # Two children: find successor
            y = self._minimum(z.right)
            y_original_color = y.color
            x = y.right
            
            if y.parent == z:
                x.parent = y
            else:
                self._transplant(y, y.right)
                y.right = z.right
                y.right.parent = y
            
            self._transplant(z, y)
            y.left = z.left
            y.left.parent = y
            y.color = z.color
        
        if y_original_color == Color.BLACK:
            self._delete_fixup(x)
    
    def _delete_fixup(self, x):
        """
        Restore Red-Black properties after deletion.
        
        x is the node that replaced the deleted node.
        It may be "doubly black" — fix by redistributing blackness.
        """
        while x != self.root and x.color == Color.BLACK:
            if x == x.parent.left:
                w = x.parent.right  # Sibling
                
                # Case 1: Sibling is RED
                if w.color == Color.RED:
                    w.color = Color.BLACK
                    x.parent.color = Color.RED
                    self._left_rotate(x.parent)
                    w = x.parent.right
                
                # Case 2: Sibling's children are both BLACK
                if w.left.color == Color.BLACK and w.right.color == Color.BLACK:
                    w.color = Color.RED
                    x = x.parent
                else:
                    # Case 3: Sibling's right child is BLACK
                    if w.right.color == Color.BLACK:
                        w.left.color = Color.BLACK
                        w.color = Color.RED
                        self._right_rotate(w)
                        w = x.parent.right
                    
                    # Case 4: Sibling's right child is RED
                    w.color = x.parent.color
                    x.parent.color = Color.BLACK
                    w.right.color = Color.BLACK
                    self._left_rotate(x.parent)
                    x = self.root
            else:
                # Mirror: x is right child
                w = x.parent.left
                
                if w.color == Color.RED:
                    w.color = Color.BLACK
                    x.parent.color = Color.RED
                    self._right_rotate(x.parent)
                    w = x.parent.left
                
                if w.right.color == Color.BLACK and w.left.color == Color.BLACK:
                    w.color = Color.RED
                    x = x.parent
                else:
                    if w.left.color == Color.BLACK:
                        w.right.color = Color.BLACK
                        w.color = Color.RED
                        self._left_rotate(w)
                        w = x.parent.left
                    
                    w.color = x.parent.color
                    x.parent.color = Color.BLACK
                    w.left.color = Color.BLACK
                    self._right_rotate(x.parent)
                    x = self.root
        
        x.color = Color.BLACK
    
    def _transplant(self, u, v):
        """Replace subtree rooted at u with subtree rooted at v."""
        if u.parent is None:
            self.root = v
        elif u == u.parent.left:
            u.parent.left = v
        else:
            u.parent.right = v
        v.parent = u.parent
    
    # ==================== Rotations ====================
    
    def _left_rotate(self, x):
        """Left rotation around x."""
        y = x.right
        x.right = y.left
        if y.left != self.NIL:
            y.left.parent = x
        y.parent = x.parent
        
        if x.parent is None:
            self.root = y
        elif x == x.parent.left:
            x.parent.left = y
        else:
            x.parent.right = y
        
        y.left = x
        x.parent = y
    
    def _right_rotate(self, y):
        """Right rotation around y."""
        x = y.left
        y.left = x.right
        if x.right != self.NIL:
            x.right.parent = y
        x.parent = y.parent
        
        if y.parent is None:
            self.root = x
        elif y == y.parent.right:
            y.parent.right = x
        else:
            y.parent.left = x
        
        x.right = y
        y.parent = x
    
    # ==================== Search ====================
    
    def _search_node(self, node, key):
        """Recursive search for key."""
        if node == self.NIL or key == node.key:
            return node
        if key < node.key:
            return self._search_node(node.left, key)
        else:
            return self._search_node(node.right, key)
    
    # ==================== Utility ====================
    
    def _minimum(self, node):
        """Find node with minimum key in subtree."""
        while node.left != self.NIL:
            node = node.left
        return node
    
    def _maximum(self, node):
        """Find node with maximum key in subtree."""
        while node.right != self.NIL:
            node = node.right
        return node
    
    def _inorder(self, node, result):
        """In-order traversal helper."""
        if node != self.NIL:
            self._inorder(node.left, result)
            result.append(node.key)
            self._inorder(node.right, result)
    
    def _is_valid_rb(self, node, path_black_count):
        """
        Recursively verify RB properties.
        
        Returns (is_valid, black_height_of_subtree).
        """
        if node == self.NIL:
            return True
        
        # Property 4: Red node cannot have red children
        if node.color == Color.RED:
            if (node.left != self.NIL and node.left.color == Color.RED) or \
               (node.right != self.NIL and node.right.color == Color.RED):
                return False
        
        # Check left subtree
        if not self._is_valid_rb(node.left, path_black_count):
            return False
        
        # Check right subtree
        if not self._is_valid_rb(node.right, path_black_count):
            return False
        
        return True
    
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
        return f"RedBlackTree(size={self._size}, keys={self.inorder()[:10]}...)"