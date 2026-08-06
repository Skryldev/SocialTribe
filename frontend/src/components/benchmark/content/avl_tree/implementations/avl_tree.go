package main

type Node struct {
    key    int
    left   *Node
    right  *Node
    height int
}

type AVLTree struct {
    root *Node
}

func NewAVLTree() *AVLTree {
    return &AVLTree{}
}

func height(node *Node) int {
    if node == nil {
        return 0
    }
    return node.height
}

func balance(node *Node) int {
    if node == nil {
        return 0
    }
    return height(node.left) - height(node.right)
}

func updateHeight(node *Node) {
    node.height = 1 + max(height(node.left), height(node.right))
}

func max(a, b int) int {
    if a > b {
        return a
    }
    return b
}

func rotateRight(y *Node) *Node {
    x := y.left
    t2 := x.right
    x.right = y
    y.left = t2
    updateHeight(y)
    updateHeight(x)
    return x
}

func rotateLeft(x *Node) *Node {
    y := x.right
    t2 := y.left
    y.left = x
    x.right = t2
    updateHeight(x)
    updateHeight(y)
    return y
}

func (t *AVLTree) Insert(key int) {
    t.root = insert(t.root, key)
}

func insert(node *Node, key int) *Node {
    if node == nil {
        return &Node{key: key, height: 1}
    }

    if key < node.key {
        node.left = insert(node.left, key)
    } else if key > node.key {
        node.right = insert(node.right, key)
    } else {
        return node
    }

    updateHeight(node)
    bal := balance(node)

    if bal > 1 && key < node.left.key {
        return rotateRight(node)
    }

    if bal < -1 && key > node.right.key {
        return rotateLeft(node)
    }

    if bal > 1 && key > node.left.key {
        node.left = rotateLeft(node.left)
        return rotateRight(node)
    }

    if bal < -1 && key < node.right.key {
        node.right = rotateRight(node.right)
        return rotateLeft(node)
    }

    return node
}

func (t *AVLTree) Delete(key int) {
    t.root = deleteNode(t.root, key)
}

func deleteNode(node *Node, key int) *Node {
    if node == nil {
        return nil
    }

    if key < node.key {
        node.left = deleteNode(node.left, key)
    } else if key > node.key {
        node.right = deleteNode(node.right, key)
    } else {
        if node.left == nil {
            return node.right
        } else if node.right == nil {
            return node.left
        } else {
            minNode := findMin(node.right)
            node.key = minNode.key
            node.right = deleteNode(node.right, minNode.key)
        }
    }

    updateHeight(node)
    bal := balance(node)

    if bal > 1 && balance(node.left) >= 0 {
        return rotateRight(node)
    }

    if bal > 1 && balance(node.left) < 0 {
        node.left = rotateLeft(node.left)
        return rotateRight(node)
    }

    if bal < -1 && balance(node.right) <= 0 {
        return rotateLeft(node)
    }

    if bal < -1 && balance(node.right) > 0 {
        node.right = rotateRight(node.right)
        return rotateLeft(node)
    }

    return node
}

func findMin(node *Node) *Node {
    current := node
    for current.left != nil {
        current = current.left
    }
    return current
}

func (t *AVLTree) Search(key int) bool {
    return search(t.root, key)
}

func search(node *Node, key int) bool {
    if node == nil {
        return false
    }
    if key == node.key {
        return true
    }
    if key < node.key {
        return search(node.left, key)
    }
    return search(node.right, key)
}

func (t *AVLTree) Inorder() []int {
    result := []int{}
    inorder(t.root, &result)
    return result
}

func inorder(node *Node, result *[]int) {
    if node != nil {
        inorder(node.left, result)
        *result = append(*result, node.key)
        inorder(node.right, result)
    }
}