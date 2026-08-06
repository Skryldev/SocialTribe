public class AVLTree {
    private class Node {
        int key;
        Node left, right;
        int height;

        Node(int key) {
            this.key = key;
            this.height = 1;
        }
    }

    private Node root;

    private int height(Node node) {
        return node == null ? 0 : node.height;
    }

    private int balance(Node node) {
        return node == null ? 0 : height(node.left) - height(node.right);
    }

    private void updateHeight(Node node) {
        node.height = 1 + Math.max(height(node.left), height(node.right));
    }

    private Node rotateRight(Node y) {
        Node x = y.left;
        Node t2 = x.right;
        x.right = y;
        y.left = t2;
        updateHeight(y);
        updateHeight(x);
        return x;
    }

    private Node rotateLeft(Node x) {
        Node y = x.right;
        Node t2 = y.left;
        y.left = x;
        x.right = t2;
        updateHeight(x);
        updateHeight(y);
        return y;
    }

    public void insert(int key) {
        root = insert(root, key);
    }

    private Node insert(Node node, int key) {
        if (node == null) {
            return new Node(key);
        }

        if (key < node.key) {
            node.left = insert(node.left, key);
        } else if (key > node.key) {
            node.right = insert(node.right, key);
        } else {
            return node;
        }

        updateHeight(node);
        int bal = balance(node);

        if (bal > 1 && key < node.left.key) {
            return rotateRight(node);
        }

        if (bal < -1 && key > node.right.key) {
            return rotateLeft(node);
        }

        if (bal > 1 && key > node.left.key) {
            node.left = rotateLeft(node.left);
            return rotateRight(node);
        }

        if (bal < -1 && key < node.right.key) {
            node.right = rotateRight(node.right);
            return rotateLeft(node);
        }

        return node;
    }

    public void delete(int key) {
        root = delete(root, key);
    }

    private Node delete(Node node, int key) {
        if (node == null) {
            return null;
        }

        if (key < node.key) {
            node.left = delete(node.left, key);
        } else if (key > node.key) {
            node.right = delete(node.right, key);
        } else {
            if (node.left == null) {
                return node.right;
            } else if (node.right == null) {
                return node.left;
            } else {
                Node minNode = findMin(node.right);
                node.key = minNode.key;
                node.right = delete(node.right, minNode.key);
            }
        }

        updateHeight(node);
        int bal = balance(node);

        if (bal > 1 && balance(node.left) >= 0) {
            return rotateRight(node);
        }

        if (bal > 1 && balance(node.left) < 0) {
            node.left = rotateLeft(node.left);
            return rotateRight(node);
        }

        if (bal < -1 && balance(node.right) <= 0) {
            return rotateLeft(node);
        }

        if (bal < -1 && balance(node.right) > 0) {
            node.right = rotateRight(node.right);
            return rotateLeft(node);
        }

        return node;
    }

    private Node findMin(Node node) {
        Node current = node;
        while (current.left != null) {
            current = current.left;
        }
        return current;
    }

    public boolean search(int key) {
        return search(root, key);
    }

    private boolean search(Node node, int key) {
        if (node == null) {
            return false;
        }
        if (key == node.key) {
            return true;
        }
        if (key < node.key) {
            return search(node.left, key);
        }
        return search(node.right, key);
    }

    public java.util.List<Integer> inorder() {
        java.util.List<Integer> result = new java.util.ArrayList<>();
        inorder(root, result);
        return result;
    }

    private void inorder(Node node, java.util.List<Integer> result) {
        if (node != null) {
            inorder(node.left, result);
            result.add(node.key);
            inorder(node.right, result);
        }
    }
}