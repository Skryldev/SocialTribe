# Theory

The AVL tree, named after its inventors Georgy **A**delson-**V**elsky and Evgenii **L**andis, was the first self-balancing binary search tree ever invented. Published in 1962 in the Soviet journal "Doklady Akademii Nauk SSSR," it guarantees logarithmic height through strict balance conditions and local rotations.

## Key Concepts

- **Self-Balancing BST**: Automatically maintains O(log n) height
- **Balance Factor**: The difference in heights of left and right subtrees
- **Rotation Operations**: Local tree transformations that restore balance
- **Strict Balance**: |BF| ≤ 1 for all nodes (strictest among balanced BSTs)
- **Height-Balanced**: Guarantees height ≤ 1.44 log₂ n
- **Binary Search Property**: Left < Root < Right preserved throughout