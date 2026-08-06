# Theory

The Red-Black Tree, invented by Rudolf Bayer in 1972 (originally called "Symmetric Binary B-Trees"), is a self-balancing binary search tree that guarantees O(log n) time for all operations. It was refined by Leo Guibas and Robert Sedgewick in 1978, who introduced the red-black color metaphor. Red-Black trees are the most widely used balanced BST in practice, serving as the foundation for C++ STL `std::map`, Java `TreeMap`, and the Linux kernel's Completely Fair Scheduler.

## Key Concepts

- **Color Property**: Each node is either RED or BLACK
- **Black-Height**: Number of black nodes on any path from node to leaf
- **Rotation Operations**: Local transformations to restore balance
- **Recoloring**: Changing node colors to fix violations
- **Relaxed Balance**: Less strict than AVL (2 log n vs 1.44 log n height)
- **Parent Pointer**: Typically stores parent reference for efficient fix-up