package main

type Node struct {
    key    int
    color  bool // true = RED, false = BLACK
    left   *Node
    right  *Node
    parent *Node
}

type RedBlackTree struct {
    root *Node
    NIL  *Node
}

func NewRedBlackTree() *RedBlackTree {
    nilNode := &Node{key: 0, color: false}
    return &RedBlackTree{
        root: nilNode,
        NIL:  nilNode,
    }
}

func (t *RedBlackTree) leftRotate(x *Node) {
    y := x.right
    x.right = y.left
    if y.left != t.NIL {
        y.left.parent = x
    }
    y.parent = x.parent
    if x.parent == nil {
        t.root = y
    } else if x == x.parent.left {
        x.parent.left = y
    } else {
        x.parent.right = y
    }
    y.left = x
    x.parent = y
}

func (t *RedBlackTree) rightRotate(x *Node) {
    y := x.left
    x.left = y.right
    if y.right != t.NIL {
        y.right.parent = x
    }
    y.parent = x.parent
    if x.parent == nil {
        t.root = y
    } else if x == x.parent.right {
        x.parent.right = y
    } else {
        x.parent.left = y
    }
    y.right = x
    x.parent = y
}

func (t *RedBlackTree) insertFixup(z *Node) {
    for z.parent != nil && z.parent.color == true {
        if z.parent == z.parent.parent.left {
            y := z.parent.parent.right
            if y.color == true {
                z.parent.color = false
                y.color = false
                z.parent.parent.color = true
                z = z.parent.parent
            } else {
                if z == z.parent.right {
                    z = z.parent
                    t.leftRotate(z)
                }
                z.parent.color = false
                z.parent.parent.color = true
                t.rightRotate(z.parent.parent)
            }
        } else {
            y := z.parent.parent.left
            if y.color == true {
                z.parent.color = false
                y.color = false
                z.parent.parent.color = true
                z = z.parent.parent
            } else {
                if z == z.parent.left {
                    z = z.parent
                    t.rightRotate(z)
                }
                z.parent.color = false
                z.parent.parent.color = true
                t.leftRotate(z.parent.parent)
            }
        }
    }
    t.root.color = false
}

func (t *RedBlackTree) transplant(u, v *Node) {
    if u.parent == nil {
        t.root = v
    } else if u == u.parent.left {
        u.parent.left = v
    } else {
        u.parent.right = v
    }
    v.parent = u.parent
}

func (t *RedBlackTree) minimum(node *Node) *Node {
    for node.left != t.NIL {
        node = node.left
    }
    return node
}

func (t *RedBlackTree) deleteFixup(x *Node) {
    for x != t.root && x.color == false {
        if x == x.parent.left {
            w := x.parent.right
            if w.color == true {
                w.color = false
                x.parent.color = true
                t.leftRotate(x.parent)
                w = x.parent.right
            }
            if w.left.color == false && w.right.color == false {
                w.color = true
                x = x.parent
            } else {
                if w.right.color == false {
                    w.left.color = false
                    w.color = true
                    t.rightRotate(w)
                    w = x.parent.right
                }
                w.color = x.parent.color
                x.parent.color = false
                w.right.color = false
                t.leftRotate(x.parent)
                x = t.root
            }
        } else {
            w := x.parent.left
            if w.color == true {
                w.color = false
                x.parent.color = true
                t.rightRotate(x.parent)
                w = x.parent.left
            }
            if w.right.color == false && w.left.color == false {
                w.color = true
                x = x.parent
            } else {
                if w.left.color == false {
                    w.right.color = false
                    w.color = true
                    t.leftRotate(w)
                    w = x.parent.left
                }
                w.color = x.parent.color
                x.parent.color = false
                w.left.color = false
                t.rightRotate(x.parent)
                x = t.root
            }
        }
    }
    x.color = false
}

func (t *RedBlackTree) search(node *Node, key int) *Node {
    if node == t.NIL || key == node.key {
        return node
    }
    if key < node.key {
        return t.search(node.left, key)
    }
    return t.search(node.right, key)
}

func (t *RedBlackTree) inorder(node *Node, result *[]int) {
    if node != t.NIL {
        t.inorder(node.left, result)
        *result = append(*result, node.key)
        t.inorder(node.right, result)
    }
}

func (t *RedBlackTree) Insert(key int) {
    z := &Node{key: key, color: true, left: t.NIL, right: t.NIL}

    var y *Node = nil
    x := t.root

    for x != t.NIL {
        y = x
        if z.key < x.key {
            x = x.left
        } else {
            x = x.right
        }
    }

    z.parent = y
    if y == nil {
        t.root = z
    } else if z.key < y.key {
        y.left = z
    } else {
        y.right = z
    }

    t.insertFixup(z)
}

func (t *RedBlackTree) Delete(key int) {
    z := t.search(t.root, key)
    if z == t.NIL {
        return
    }

    y := z
    yOriginalColor := y.color
    var x *Node

    if z.left == t.NIL {
        x = z.right
        t.transplant(z, z.right)
    } else if z.right == t.NIL {
        x = z.left
        t.transplant(z, z.left)
    } else {
        y = t.minimum(z.right)
        yOriginalColor = y.color
        x = y.right
        if y.parent == z {
            x.parent = y
        } else {
            t.transplant(y, y.right)
            y.right = z.right
            y.right.parent = y
        }
        t.transplant(z, y)
        y.left = z.left
        y.left.parent = y
        y.color = z.color
    }

    if yOriginalColor == false {
        t.deleteFixup(x)
    }
}

func (t *RedBlackTree) Search(key int) bool {
    return t.search(t.root, key) != t.NIL
}

func (t *RedBlackTree) Inorder() []int {
    result := []int{}
    t.inorder(t.root, &result)
    return result
}