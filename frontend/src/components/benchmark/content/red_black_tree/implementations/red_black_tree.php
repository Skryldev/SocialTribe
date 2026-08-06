<?php

class RBNode {
    public int $key;
    public string $color;
    public ?RBNode $left;
    public ?RBNode $right;
    public ?RBNode $parent;

    public function __construct(int $key, string $color = 'RED') {
        $this->key = $key;
        $this->color = $color;
        $this->left = null;
        $this->right = null;
        $this->parent = null;
    }
}

class RedBlackTree {
    private ?RBNode $root;
    private RBNode $NIL;

    public function __construct() {
        $this->NIL = new RBNode(0, 'BLACK');
        $this->root = $this->NIL;
    }

    private function leftRotate(RBNode $x): void {
        $y = $x->right;
        $x->right = $y->left;
        if ($y->left !== $this->NIL) {
            $y->left->parent = $x;
        }
        $y->parent = $x->parent;
        if ($x->parent === null) {
            $this->root = $y;
        } else if ($x === $x->parent->left) {
            $x->parent->left = $y;
        } else {
            $x->parent->right = $y;
        }
        $y->left = $x;
        $x->parent = $y;
    }

    private function rightRotate(RBNode $x): void {
        $y = $x->left;
        $x->left = $y->right;
        if ($y->right !== $this->NIL) {
            $y->right->parent = $x;
        }
        $y->parent = $x->parent;
        if ($x->parent === null) {
            $this->root = $y;
        } else if ($x === $x->parent->right) {
            $x->parent->right = $y;
        } else {
            $x->parent->left = $y;
        }
        $y->right = $x;
        $x->parent = $y;
    }

    private function insertFixup(RBNode $z): void {
        while ($z->parent !== null && $z->parent->color === 'RED') {
            if ($z->parent === $z->parent->parent->left) {
                $y = $z->parent->parent->right;
                if ($y->color === 'RED') {
                    $z->parent->color = 'BLACK';
                    $y->color = 'BLACK';
                    $z->parent->parent->color = 'RED';
                    $z = $z->parent->parent;
                } else {
                    if ($z === $z->parent->right) {
                        $z = $z->parent;
                        $this->leftRotate($z);
                    }
                    $z->parent->color = 'BLACK';
                    $z->parent->parent->color = 'RED';
                    $this->rightRotate($z->parent->parent);
                }
            } else {
                $y = $z->parent->parent->left;
                if ($y->color === 'RED') {
                    $z->parent->color = 'BLACK';
                    $y->color = 'BLACK';
                    $z->parent->parent->color = 'RED';
                    $z = $z->parent->parent;
                } else {
                    if ($z === $z->parent->left) {
                        $z = $z->parent;
                        $this->rightRotate($z);
                    }
                    $z->parent->color = 'BLACK';
                    $z->parent->parent->color = 'RED';
                    $this->leftRotate($z->parent->parent);
                }
            }
        }
        $this->root->color = 'BLACK';
    }

    private function transplant(RBNode $u, RBNode $v): void {
        if ($u->parent === null) {
            $this->root = $v;
        } else if ($u === $u->parent->left) {
            $u->parent->left = $v;
        } else {
            $u->parent->right = $v;
        }
        $v->parent = $u->parent;
    }

    private function minimum(RBNode $node): RBNode {
        while ($node->left !== $this->NIL) {
            $node = $node->left;
        }
        return $node;
    }

    private function deleteFixup(RBNode $x): void {
        while ($x !== $this->root && $x->color === 'BLACK') {
            if ($x === $x->parent->left) {
                $w = $x->parent->right;
                if ($w->color === 'RED') {
                    $w->color = 'BLACK';
                    $x->parent->color = 'RED';
                    $this->leftRotate($x->parent);
                    $w = $x->parent->right;
                }
                if ($w->left->color === 'BLACK' && $w->right->color === 'BLACK') {
                    $w->color = 'RED';
                    $x = $x->parent;
                } else {
                    if ($w->right->color === 'BLACK') {
                        $w->left->color = 'BLACK';
                        $w->color = 'RED';
                        $this->rightRotate($w);
                        $w = $x->parent->right;
                    }
                    $w->color = $x->parent->color;
                    $x->parent->color = 'BLACK';
                    $w->right->color = 'BLACK';
                    $this->leftRotate($x->parent);
                    $x = $this->root;
                }
            } else {
                $w = $x->parent->left;
                if ($w->color === 'RED') {
                    $w->color = 'BLACK';
                    $x->parent->color = 'RED';
                    $this->rightRotate($x->parent);
                    $w = $x->parent->left;
                }
                if ($w->right->color === 'BLACK' && $w->left->color === 'BLACK') {
                    $w->color = 'RED';
                    $x = $x->parent;
                } else {
                    if ($w->left->color === 'BLACK') {
                        $w->right->color = 'BLACK';
                        $w->color = 'RED';
                        $this->leftRotate($w);
                        $w = $x->parent->left;
                    }
                    $w->color = $x->parent->color;
                    $x->parent->color = 'BLACK';
                    $w->left->color = 'BLACK';
                    $this->rightRotate($x->parent);
                    $x = $this->root;
                }
            }
        }
        $x->color = 'BLACK';
    }

    private function search(RBNode $node, int $key): RBNode {
        if ($node === $this->NIL || $key === $node->key) {
            return $node;
        }
        if ($key < $node->key) {
            return $this->search($node->left, $key);
        }
        return $this->search($node->right, $key);
    }

    private function inorderTraversal(RBNode $node, array &$result): void {
        if ($node !== $this->NIL) {
            $this->inorderTraversal($node->left, $result);
            $result[] = $node->key;
            $this->inorderTraversal($node->right, $result);
        }
    }

    public function insert(int $key): void {
        $z = new RBNode($key);
        $z->left = $this->NIL;
        $z->right = $this->NIL;

        $y = null;
        $x = $this->root;

        while ($x !== $this->NIL) {
            $y = $x;
            if ($z->key < $x->key) {
                $x = $x->left;
            } else {
                $x = $x->right;
            }
        }

        $z->parent = $y;
        if ($y === null) {
            $this->root = $z;
        } else if ($z->key < $y->key) {
            $y->left = $z;
        } else {
            $y->right = $z;
        }

        $this->insertFixup($z);
    }

    public function delete(int $key): void {
        $z = $this->search($this->root, $key);
        if ($z === $this->NIL) return;

        $y = $z;
        $yOriginalColor = $y->color;
        $x = null;

        if ($z->left === $this->NIL) {
            $x = $z->right;
            $this->transplant($z, $z->right);
        } else if ($z->right === $this->NIL) {
            $x = $z->left;
            $this->transplant($z, $z->left);
        } else {
            $y = $this->minimum($z->right);
            $yOriginalColor = $y->color;
            $x = $y->right;
            if ($y->parent === $z) {
                $x->parent = $y;
            } else {
                $this->transplant($y, $y->right);
                $y->right = $z->right;
                $y->right->parent = $y;
            }
            $this->transplant($z, $y);
            $y->left = $z->left;
            $y->left->parent = $y;
            $y->color = $z->color;
        }

        if ($yOriginalColor === 'BLACK') {
            $this->deleteFixup($x);
        }
    }

    public function searchKey(int $key): bool {
        return $this->search($this->root, $key) !== $this->NIL;
    }

    public function inorder(): array {
        $result = [];
        $this->inorderTraversal($this->root, $result);
        return $result;
    }
}

?>