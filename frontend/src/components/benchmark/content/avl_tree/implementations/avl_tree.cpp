#include <vector>
#include <algorithm>

using namespace std;

class AVLTree {
private:
    struct Node {
        int key;
        Node* left;
        Node* right;
        int height;

        Node(int k) : key(k), left(nullptr), right(nullptr), height(1) {}
    };

    Node* root;

    int height(Node* node) {
        return node ? node->height : 0;
    }

    int balance(Node* node) {
        return node ? height(node->left) - height(node->right) : 0;
    }

    void updateHeight(Node* node) {
        node->height = 1 + max(height(node->left), height(node->right));
    }

    Node* rotateRight(Node* y) {
        Node* x = y->left;
        Node* t2 = x->right;
        x->right = y;
        y->left = t2;
        updateHeight(y);
        updateHeight(x);
        return x;
    }

    Node* rotateLeft(Node* x) {
        Node* y = x->right;
        Node* t2 = y->left;
        y->left = x;
        x->right = t2;
        updateHeight(x);
        updateHeight(y);
        return y;
    }

    Node* insert(Node* node, int key) {
        if (!node) {
            return new Node(key);
        }

        if (key < node->key) {
            node->left = insert(node->left, key);
        } else if (key > node->key) {
            node->right = insert(node->right, key);
        } else {
            return node;
        }

        updateHeight(node);
        int bal = balance(node);

        if (bal > 1 && key < node->left->key) {
            return rotateRight(node);
        }

        if (bal < -1 && key > node->right->key) {
            return rotateLeft(node);
        }

        if (bal > 1 && key > node->left->key) {
            node->left = rotateLeft(node->left);
            return rotateRight(node);
        }

        if (bal < -1 && key < node->right->key) {
            node->right = rotateRight(node->right);
            return rotateLeft(node);
        }

        return node;
    }

    Node* findMin(Node* node) {
        Node* current = node;
        while (current->left) {
            current = current->left;
        }
        return current;
    }

    Node* deleteNode(Node* node, int key) {
        if (!node) {
            return nullptr;
        }

        if (key < node->key) {
            node->left = deleteNode(node->left, key);
        } else if (key > node->key) {
            node->right = deleteNode(node->right, key);
        } else {
            if (!node->left) {
                return node->right;
            } else if (!node->right) {
                return node->left;
            } else {
                Node* minNode = findMin(node->right);
                node->key = minNode->key;
                node->right = deleteNode(node->right, minNode->key);
            }
        }

        updateHeight(node);
        int bal = balance(node);

        if (bal > 1 && balance(node->left) >= 0) {
            return rotateRight(node);
        }

        if (bal > 1 && balance(node->left) < 0) {
            node->left = rotateLeft(node->left);
            return rotateRight(node);
        }

        if (bal < -1 && balance(node->right) <= 0) {
            return rotateLeft(node);
        }

        if (bal < -1 && balance(node->right) > 0) {
            node->right = rotateRight(node->right);
            return rotateLeft(node);
        }

        return node;
    }

    bool search(Node* node, int key) {
        if (!node) {
            return false;
        }
        if (key == node->key) {
            return true;
        }
        if (key < node->key) {
            return search(node->left, key);
        }
        return search(node->right, key);
    }

    void inorder(Node* node, vector<int>& result) {
        if (node) {
            inorder(node->left, result);
            result.push_back(node->key);
            inorder(node->right, result);
        }
    }

public:
    AVLTree() : root(nullptr) {}

    void insert(int key) {
        root = insert(root, key);
    }

    void deleteKey(int key) {
        root = deleteNode(root, key);
    }

    bool search(int key) {
        return search(root, key);
    }

    vector<int> inorder() {
        vector<int> result;
        inorder(root, result);
        return result;
    }
};