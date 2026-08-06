class RBNode {
    constructor(key, color = 'RED') {
        this.key = key;
        this.color = color;
        this.left = null;
        this.right = null;
        this.parent = null;
    }
}

class RedBlackTree {
    constructor() {
        this.NIL = new RBNode(0, 'BLACK');
        this.root = this.NIL;
    }

    leftRotate(x) {
        const y = x.right;
        x.right = y.left;
        if (y.left !== this.NIL) {
            y.left.parent = x;
        }
        y.parent = x.parent;
        if (x.parent === null) {
            this.root = y;
        } else if (x === x.parent.left) {
            x.parent.left = y;
        } else {
            x.parent.right = y;
        }
        y.left = x;
        x.parent = y;
    }

    rightRotate(x) {
        const y = x.left;
        x.left = y.right;
        if (y.right !== this.NIL) {
            y.right.parent = x;
        }
        y.parent = x.parent;
        if (x.parent === null) {
            this.root = y;
        } else if (x === x.parent.right) {
            x.parent.right = y;
        } else {
            x.parent.left = y;
        }
        y.right = x;
        x.parent = y;
    }

    insertFixup(z) {
        while (z.parent && z.parent.color === 'RED') {
            if (z.parent === z.parent.parent.left) {
                const y = z.parent.parent.right;
                if (y.color === 'RED') {
                    z.parent.color = 'BLACK';
                    y.color = 'BLACK';
                    z.parent.parent.color = 'RED';
                    z = z.parent.parent;
                } else {
                    if (z === z.parent.right) {
                        z = z.parent;
                        this.leftRotate(z);
                    }
                    z.parent.color = 'BLACK';
                    z.parent.parent.color = 'RED';
                    this.rightRotate(z.parent.parent);
                }
            } else {
                const y = z.parent.parent.left;
                if (y.color === 'RED') {
                    z.parent.color = 'BLACK';
                    y.color = 'BLACK';
                    z.parent.parent.color = 'RED';
                    z = z.parent.parent;
                } else {
                    if (z === z.parent.left) {
                        z = z.parent;
                        this.rightRotate(z);
                    }
                    z.parent.color = 'BLACK';
                    z.parent.parent.color = 'RED';
                    this.leftRotate(z.parent.parent);
                }
            }
        }
        this.root.color = 'BLACK';
    }

    transplant(u, v) {
        if (u.parent === null) {
            this.root = v;
        } else if (u === u.parent.left) {
            u.parent.left = v;
        } else {
            u.parent.right = v;
        }
        v.parent = u.parent;
    }

    minimum(node) {
        while (node.left !== this.NIL) {
            node = node.left;
        }
        return node;
    }

    deleteFixup(x) {
        while (x !== this.root && x.color === 'BLACK') {
            if (x === x.parent.left) {
                let w = x.parent.right;
                if (w.color === 'RED') {
                    w.color = 'BLACK';
                    x.parent.color = 'RED';
                    this.leftRotate(x.parent);
                    w = x.parent.right;
                }
                if (w.left.color === 'BLACK' && w.right.color === 'BLACK') {
                    w.color = 'RED';
                    x = x.parent;
                } else {
                    if (w.right.color === 'BLACK') {
                        w.left.color = 'BLACK';
                        w.color = 'RED';
                        this.rightRotate(w);
                        w = x.parent.right;
                    }
                    w.color = x.parent.color;
                    x.parent.color = 'BLACK';
                    w.right.color = 'BLACK';
                    this.leftRotate(x.parent);
                    x = this.root;
                }
            } else {
                let w = x.parent.left;
                if (w.color === 'RED') {
                    w.color = 'BLACK';
                    x.parent.color = 'RED';
                    this.rightRotate(x.parent);
                    w = x.parent.left;
                }
                if (w.right.color === 'BLACK' && w.left.color === 'BLACK') {
                    w.color = 'RED';
                    x = x.parent;
                } else {
                    if (w.left.color === 'BLACK') {
                        w.right.color = 'BLACK';
                        w.color = 'RED';
                        this.leftRotate(w);
                        w = x.parent.left;
                    }
                    w.color = x.parent.color;
                    x.parent.color = 'BLACK';
                    w.left.color = 'BLACK';
                    this.rightRotate(x.parent);
                    x = this.root;
                }
            }
        }
        x.color = 'BLACK';
    }

    search(node, key) {
        if (node === this.NIL || key === node.key) {
            return node;
        }
        if (key < node.key) {
            return this.search(node.left, key);
        }
        return this.search(node.right, key);
    }

    insert(key) {
        const z = new RBNode(key);
        z.left = this.NIL;
        z.right = this.NIL;

        let y = null;
        let x = this.root;

        while (x !== this.NIL) {
            y = x;
            if (z.key < x.key) {
                x = x.left;
            } else {
                x = x.right;
            }
        }

        z.parent = y;
        if (y === null) {
            this.root = z;
        } else if (z.key < y.key) {
            y.left = z;
        } else {
            y.right = z;
        }

        this.insertFixup(z);
    }

    delete(key) {
        const z = this.search(this.root, key);
        if (z === this.NIL) return;

        let y = z;
        let yOriginalColor = y.color;
        let x;

        if (z.left === this.NIL) {
            x = z.right;
            this.transplant(z, z.right);
        } else if (z.right === this.NIL) {
            x = z.left;
            this.transplant(z, z.left);
        } else {
            y = this.minimum(z.right);
            yOriginalColor = y.color;
            x = y.right;
            if (y.parent === z) {
                x.parent = y;
            } else {
                this.transplant(y, y.right);
                y.right = z.right;
                y.right.parent = y;
            }
            this.transplant(z, y);
            y.left = z.left;
            y.left.parent = y;
            y.color = z.color;
        }

        if (yOriginalColor === 'BLACK') {
            this.deleteFixup(x);
        }
    }

    searchKey(key) {
        return this.search(this.root, key) !== this.NIL;
    }

    inorder() {
        const result = [];
        this._inorder(this.root, result);
        return result;
    }

    _inorder(node, result) {
        if (node !== this.NIL) {
            this._inorder(node.left, result);
            result.push(node.key);
            this._inorder(node.right, result);
        }
    }
}

module.exports = RedBlackTree;