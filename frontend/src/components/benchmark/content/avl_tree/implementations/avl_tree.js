class AVLNode {
    constructor(key) {
        this.key = key;
        this.left = null;
        this.right = null;
        this.height = 1;
    }
}

class AVLTree {
    constructor() {
        this.root = null;
    }

    height(node) {
        return node ? node.height : 0;
    }

    balance(node) {
        return node ? this.height(node.left) - this.height(node.right) : 0;
    }

    updateHeight(node) {
        node.height = 1 + Math.max(this.height(node.left), this.height(node.right));
    }

    rotateRight(y) {
        const x = y.left;
        const t2 = x.right;
        x.right = y;
        y.left = t2;
        this.updateHeight(y);
        this.updateHeight(x);
        return x;
    }

    rotateLeft(x) {
        const y = x.right;
        const t2 = y.left;
        y.left = x;
        x.right = t2;
        this.updateHeight(x);
        this.updateHeight(y);
        return y;
    }

    insert(key) {
        this.root = this._insert(this.root, key);
    }

    _insert(node, key) {
        if (!node) {
            return new AVLNode(key);
        }

        if (key < node.key) {
            node.left = this._insert(node.left, key);
        } else if (key > node.key) {
            node.right = this._insert(node.right, key);
        } else {
            return node;
        }

        this.updateHeight(node);
        const bal = this.balance(node);

        if (bal > 1 && key < node.left.key) {
            return this.rotateRight(node);
        }

        if (bal < -1 && key > node.right.key) {
            return this.rotateLeft(node);
        }

        if (bal > 1 && key > node.left.key) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }

        if (bal < -1 && key < node.right.key) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }

        return node;
    }

    delete(key) {
        this.root = this._delete(this.root, key);
    }

    _delete(node, key) {
        if (!node) {
            return null;
        }

        if (key < node.key) {
            node.left = this._delete(node.left, key);
        } else if (key > node.key) {
            node.right = this._delete(node.right, key);
        } else {
            if (!node.left) {
                return node.right;
            } else if (!node.right) {
                return node.left;
            } else {
                const minNode = this._findMin(node.right);
                node.key = minNode.key;
                node.right = this._delete(node.right, minNode.key);
            }
        }

        this.updateHeight(node);
        const bal = this.balance(node);

        if (bal > 1 && this.balance(node.left) >= 0) {
            return this.rotateRight(node);
        }

        if (bal > 1 && this.balance(node.left) < 0) {
            node.left = this.rotateLeft(node.left);
            return this.rotateRight(node);
        }

        if (bal < -1 && this.balance(node.right) <= 0) {
            return this.rotateLeft(node);
        }

        if (bal < -1 && this.balance(node.right) > 0) {
            node.right = this.rotateRight(node.right);
            return this.rotateLeft(node);
        }

        return node;
    }

    _findMin(node) {
        let current = node;
        while (current.left) {
            current = current.left;
        }
        return current;
    }

    search(key) {
        return this._search(this.root, key);
    }

    _search(node, key) {
        if (!node) {
            return false;
        }
        if (key === node.key) {
            return true;
        }
        if (key < node.key) {
            return this._search(node.left, key);
        }
        return this._search(node.right, key);
    }

    inorder() {
        const result = [];
        this._inorder(this.root, result);
        return result;
    }

    _inorder(node, result) {
        if (node) {
            this._inorder(node.left, result);
            result.push(node.key);
            this._inorder(node.right, result);
        }
    }
}

module.exports = AVLTree;