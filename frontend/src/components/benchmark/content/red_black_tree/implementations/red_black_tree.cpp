#include <vector>
#include <memory>

using namespace std;

class RedBlackTree {
private:
    struct Node {
        int key;
        bool color; // true = RED, false = BLACK
        Node* left;
        Node* right;
        Node* parent;
        
        Node(int k, bool c = true) : key(k), color(c), left(nullptr), right(nullptr), parent(nullptr) {}
    };
    
    Node* root;
    Node* NIL;
    
    void left_rotate(Node* x) {
        Node* y = x->right;
        x->right = y->left;
        if (y->left != NIL) {
            y->left->parent = x;
        }
        y->parent = x->parent;
        if (x->parent == nullptr) {
            root = y;
        } else if (x == x->parent->left) {
            x->parent->left = y;
        } else {
            x->parent->right = y;
        }
        y->left = x;
        x->parent = y;
    }
    
    void right_rotate(Node* x) {
        Node* y = x->left;
        x->left = y->right;
        if (y->right != NIL) {
            y->right->parent = x;
        }
        y->parent = x->parent;
        if (x->parent == nullptr) {
            root = y;
        } else if (x == x->parent->right) {
            x->parent->right = y;
        } else {
            x->parent->left = y;
        }
        y->right = x;
        x->parent = y;
    }
    
    void insert_fixup(Node* z) {
        while (z->parent && z->parent->color == true) {
            if (z->parent == z->parent->parent->left) {
                Node* y = z->parent->parent->right;
                if (y->color == true) {
                    z->parent->color = false;
                    y->color = false;
                    z->parent->parent->color = true;
                    z = z->parent->parent;
                } else {
                    if (z == z->parent->right) {
                        z = z->parent;
                        left_rotate(z);
                    }
                    z->parent->color = false;
                    z->parent->parent->color = true;
                    right_rotate(z->parent->parent);
                }
            } else {
                Node* y = z->parent->parent->left;
                if (y->color == true) {
                    z->parent->color = false;
                    y->color = false;
                    z->parent->parent->color = true;
                    z = z->parent->parent;
                } else {
                    if (z == z->parent->left) {
                        z = z->parent;
                        right_rotate(z);
                    }
                    z->parent->color = false;
                    z->parent->parent->color = true;
                    left_rotate(z->parent->parent);
                }
            }
        }
        root->color = false;
    }
    
    void transplant(Node* u, Node* v) {
        if (u->parent == nullptr) {
            root = v;
        } else if (u == u->parent->left) {
            u->parent->left = v;
        } else {
            u->parent->right = v;
        }
        v->parent = u->parent;
    }
    
    Node* minimum(Node* node) {
        while (node->left != NIL) {
            node = node->left;
        }
        return node;
    }
    
    void delete_fixup(Node* x) {
        while (x != root && x->color == false) {
            if (x == x->parent->left) {
                Node* w = x->parent->right;
                if (w->color == true) {
                    w->color = false;
                    x->parent->color = true;
                    left_rotate(x->parent);
                    w = x->parent->right;
                }
                if (w->left->color == false && w->right->color == false) {
                    w->color = true;
                    x = x->parent;
                } else {
                    if (w->right->color == false) {
                        w->left->color = false;
                        w->color = true;
                        right_rotate(w);
                        w = x->parent->right;
                    }
                    w->color = x->parent->color;
                    x->parent->color = false;
                    w->right->color = false;
                    left_rotate(x->parent);
                    x = root;
                }
            } else {
                Node* w = x->parent->left;
                if (w->color == true) {
                    w->color = false;
                    x->parent->color = true;
                    right_rotate(x->parent);
                    w = x->parent->left;
                }
                if (w->right->color == false && w->left->color == false) {
                    w->color = true;
                    x = x->parent;
                } else {
                    if (w->left->color == false) {
                        w->right->color = false;
                        w->color = true;
                        left_rotate(w);
                        w = x->parent->left;
                    }
                    w->color = x->parent->color;
                    x->parent->color = false;
                    w->left->color = false;
                    right_rotate(x->parent);
                    x = root;
                }
            }
        }
        x->color = false;
    }
    
    Node* search(Node* node, int key) {
        if (node == NIL || key == node->key) {
            return node;
        }
        if (key < node->key) {
            return search(node->left, key);
        }
        return search(node->right, key);
    }
    
    void inorder(Node* node, vector<int>& result) {
        if (node != NIL) {
            inorder(node->left, result);
            result.push_back(node->key);
            inorder(node->right, result);
        }
    }

public:
    RedBlackTree() {
        NIL = new Node(0, false);
        root = NIL;
    }
    
    void insert(int key) {
        Node* z = new Node(key);
        z->left = NIL;
        z->right = NIL;
        
        Node* y = nullptr;
        Node* x = root;
        
        while (x != NIL) {
            y = x;
            if (z->key < x->key) {
                x = x->left;
            } else {
                x = x->right;
            }
        }
        
        z->parent = y;
        if (y == nullptr) {
            root = z;
        } else if (z->key < y->key) {
            y->left = z;
        } else {
            y->right = z;
        }
        
        insert_fixup(z);
    }
    
    void delete_key(int key) {
        Node* z = search(root, key);
        if (z == NIL) return;
        
        Node* y = z;
        bool y_original_color = y->color;
        Node* x;
        
        if (z->left == NIL) {
            x = z->right;
            transplant(z, z->right);
        } else if (z->right == NIL) {
            x = z->left;
            transplant(z, z->left);
        } else {
            y = minimum(z->right);
            y_original_color = y->color;
            x = y->right;
            if (y->parent == z) {
                x->parent = y;
            } else {
                transplant(y, y->right);
                y->right = z->right;
                y->right->parent = y;
            }
            transplant(z, y);
            y->left = z->left;
            y->left->parent = y;
            y->color = z->color;
        }
        
        if (y_original_color == false) {
            delete_fixup(x);
        }
    }
    
    bool search(int key) {
        return search(root, key) != NIL;
    }
    
    vector<int> inorder() {
        vector<int> result;
        inorder(root, result);
        return result;
    }
};