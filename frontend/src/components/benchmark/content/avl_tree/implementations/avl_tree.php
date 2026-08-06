<?php

class AVLNode {
    public int $key;
    public ?AVLNode $left;
    public ?AVLNode $right;
    public int $height;

    public function __construct(int $key) {
        $this->key = $key;
        $this->left = null;
        $this->right = null;
        $this->height = 1;
    }
}

class AVLTree {
    private ?AVLNode $root = null;

    private function height(?AVLNode $node): int {
        return $node ? $node->height : 0;
    }

    private function balance(?AVLNode $node): int {
        return $node ? $this->height($node->left) - $this->height($node->right) : 0;
    }

    private function updateHeight(AVLNode $node): void {
        $node->height = 1 + max($this->height($node->left), $this->height($node->right));
    }

    private function rotateRight(AVLNode $y): AVLNode {
        $x = $y->left;
        $t2 = $x->right;
        $x->right = $y;
        $y->left = $t2;
        $this->updateHeight($y);
        $this->updateHeight($x);
        return $x;
    }

    private function rotateLeft(AVLNode $x): AVLNode {
        $y = $x->right;
        $t2 = $y->left;
        $y->left = $x;
        $x->right = $t2;
        $this->updateHeight($x);
        $this->updateHeight($y);
        return $y;
    }

    public function insert(int $key): void {
        $this->root = $this->insertNode($this->root, $key);
    }

    private function insertNode(?AVLNode $node, int $key): AVLNode {
        if ($node === null) {
            return new AVLNode($key);
        }

        if ($key < $node->key) {
            $node->left = $this->insertNode($node->left, $key);
        } else if ($key > $node->key) {
            $node->right = $this->insertNode($node->right, $key);
        } else {
            return $node;
        }

        $this->updateHeight($node);
        $bal = $this->balance($node);

        if ($bal > 1 && $key < $node->left->key) {
            return $this->rotateRight($node);
        }

        if ($bal < -1 && $key > $node->right->key) {
            return $this->rotateLeft($node);
        }

        if ($bal > 1 && $key > $node->left->key) {
            $node->left = $this->rotateLeft($node->left);
            return $this->rotateRight($node);
        }

        if ($bal < -1 && $key < $node->right->key) {
            $node->right = $this->rotateRight($node->right);
            return $this->rotateLeft($node);
        }

        return $node;
    }

    public function delete(int $key): void {
        $this->root = $this->deleteNode($this->root, $key);
    }

    private function deleteNode(?AVLNode $node, int $key): ?AVLNode {
        if ($node === null) {
            return null;
        }

        if ($key < $node->key) {
            $node->left = $this->deleteNode($node->left, $key);
        } else if ($key > $node->key) {
            $node->right = $this->deleteNode($node->right, $key);
        } else {
            if ($node->left === null) {
                return $node->right;
            } else if ($node->right === null) {
                return $node->left;
            } else {
                $minNode = $this->findMin($node->right);
                $node->key = $minNode->key;
                $node->right = $this->deleteNode($node->right, $minNode->key);
            }
        }

        $this->updateHeight($node);
        $bal = $this->balance($node);

        if ($bal > 1 && $this->balance($node->left) >= 0) {
            return $this->rotateRight($node);
        }

        if ($bal > 1 && $this->balance($node->left) < 0) {
            $node->left = $this->rotateLeft($node->left);
            return $this->rotateRight($node);
        }

        if ($bal < -1 && $this->balance($node->right) <= 0) {
            return $this->rotateLeft($node);
        }

        if ($bal < -1 && $this->balance($node->right) > 0) {
            $node->right = $this->rotateRight($node->right);
            return $this->rotateLeft($node);
        }

        return $node;
    }

    private function findMin(AVLNode $node): AVLNode {
        $current = $node;
        while ($current->left !== null) {
            $current = $current->left;
        }
        return $current;
    }

    public function search(int $key): bool {
        return $this->searchNode($this->root, $key);
    }

    private function searchNode(?AVLNode $node, int $key): bool {
        if ($node === null) {
            return false;
        }
        if ($key === $node->key) {
            return true;
        }
        if ($key < $node->key) {
            return $this->searchNode($node->left, $key);
        }
        return $this->searchNode($node->right, $key);
    }

    public function inorder(): array {
        $result = [];
        $this->inorderTraversal($this->root, $result);
        return $result;
    }

    private function inorderTraversal(?AVLNode $node, array &$result): void {
        if ($node !== null) {
            $this->inorderTraversal($node->left, $result);
            $result[] = $node->key;
            $this->inorderTraversal($node->right, $result);
        }
    }
}

?>