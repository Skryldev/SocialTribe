import java.util.*;

public class RedBlackTree {
    private class Node {
        int key;
        boolean color; // true = RED, false = BLACK
        Node left, right, parent;

        Node(int key, boolean color) {
            this.key = key;
            this.color = color;
            this.left = null;
            this.right = null;
            this.parent = null;
        }
    }

    private Node root;
    private Node NIL;

    public RedBlackTree() {
        NIL = new Node(0, false);
        root = NIL;
    }

    private void leftRotate(Node x) {
        Node y = x.right;
        x.right = y.left;
        if (y.left != NIL) {
            y.left.parent = x;
        }
        y.parent = x.parent;
        if (x.parent == null) {
            root = y;
        } else if (x == x.parent.left) {
            x.parent.left = y;
        } else {
            x.parent.right = y;
        }
        y.left = x;
        x.parent = y;
    }

    private void rightRotate(Node x) {
        Node y = x.left;
        x.left = y.right;
        if (y.right != NIL) {
            y.right.parent = x;
        }
        y.parent = x.parent;
        if (x.parent == null) {
            root = y;
        } else if (x == x.parent.right) {
            x.parent.right = y;
        } else {
            x.parent.left = y;
        }
        y.right = x;
        x.parent = y;
    }

    private void insertFixup(Node z) {
        while (z.parent != null && z.parent.color == true) {
            if (z.parent == z.parent.parent.left) {
                Node y = z.parent.parent.right;
                if (y.color == true) {
                    z.parent.color = false;
                    y.color = false;
                    z.parent.parent.color = true;
                    z = z.parent.parent;
                } else {
                    if (z == z.parent.right) {
                        z = z.parent;
                        leftRotate(z);
                    }
                    z.parent.color = false;
                    z.parent.parent.color = true;
                    rightRotate(z.parent.parent);
                }
            } else {
                Node y = z.parent.parent.left;
                if (y.color == true) {
                    z.parent.color = false;
                    y.color = false;
                    z.parent.parent.color = true;
                    z = z.parent.parent;
                } else {
                    if (z == z.parent.left) {
                        z = z.parent;
                        rightRotate(z);
                    }
                    z.parent.color = false;
                    z.parent.parent.color = true;
                    leftRotate(z.parent.parent);
                }
            }
        }
        root.color = false;
    }

    private void transplant(Node u, Node v) {
        if (u.parent == null) {
            root = v;
        } else if (u == u.parent.left) {
            u.parent.left = v;
        } else {
            u.parent.right = v;
        }
        v.parent = u.parent;
    }

    private Node minimum(Node node) {
        while (node.left != NIL) {
            node = node.left;
        }
        return node;
    }

    private void deleteFixup(Node x) {
        while (x != root && x.color == false) {
            if (x == x.parent.left) {
                Node w = x.parent.right;
                if (w.color == true) {
                    w.color = false;
                    x.parent.color = true;
                    leftRotate(x.parent);
                    w = x.parent.right;
                }
                if (w.left.color == false && w.right.color == false) {
                    w.color = true;
                    x = x.parent;
                } else {
                    if (w.right.color == false) {
                        w.left.color = false;
                        w.color = true;
                        rightRotate(w);
                        w = x.parent.right;
                    }
                    w.color = x.parent.color;
                    x.parent.color = false;
                    w.right.color = false;
                    leftRotate(x.parent);
                    x = root;
                }
            } else {
                Node w = x.parent.left;
                if (w.color == true) {
                    w.color = false;
                    x.parent.color = true;
                    rightRotate(x.parent);
                    w = x.parent.left;
                }
                if (w.right.color == false && w.left.color == false) {
                    w.color = true;
                    x = x.parent;
                } else {
                    if (w.left.color == false) {
                        w.right.color = false;
                        w.color = true;
                        leftRotate(w);
                        w = x.parent.left;
                    }
                    w.color = x.parent.color;
                    x.parent.color = false;
                    w.left.color = false;
                    rightRotate(x.parent);
                    x = root;
                }
            }
        }
        x.color = false;
    }

    private Node search(Node node, int key) {
        if (node == NIL || key == node.key) {
            return node;
        }
        if (key < node.key) {
            return search(node.left, key);
        }
        return search(node.right, key);
    }

    private void inorder(Node node, List<Integer> result) {
        if (node != NIL) {
            inorder(node.left, result);
            result.add(node.key);
            inorder(node.right, result);
        }
    }

    public void insert(int key) {
        Node z = new Node(key, true);
        z.left = NIL;
        z.right = NIL;

        Node y = null;
        Node x = root;

        while (x != NIL) {
            y = x;
            if (z.key < x.key) {
                x = x.left;
            } else {
                x = x.right;
            }
        }

        z.parent = y;
        if (y == null) {
            root = z;
        } else if (z.key < y.key) {
            y.left = z;
        } else {
            y.right = z;
        }

        insertFixup(z);
    }

    public void delete(int key) {
        Node z = search(root, key);
        if (z == NIL) return;

        Node y = z;
        boolean yOriginalColor = y.color;
        Node x;

        if (z.left == NIL) {
            x = z.right;
            transplant(z, z.right);
        } else if (z.right == NIL) {
            x = z.left;
            transplant(z, z.left);
        } else {
            y = minimum(z.right);
            yOriginalColor = y.color;
            x = y.right;
            if (y.parent == z) {
                x.parent = y;
            } else {
                transplant(y, y.right);
                y.right = z.right;
                y.right.parent = y;
            }
            transplant(z, y);
            y.left = z.left;
            y.left.parent = y;
            y.color = z.color;
        }

        if (yOriginalColor == false) {
            deleteFixup(x);
        }
    }

    public boolean search(int key) {
        return search(root, key) != NIL;
    }

    public List<Integer> inorder() {
        List<Integer> result = new ArrayList<>();
        inorder(root, result);
        return result;
    }
}