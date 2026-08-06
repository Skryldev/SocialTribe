<?php

class SegmentTree {
    private array $tree;
    private int $n;

    public function __construct(array $arr) {
        $this->n = count($arr);
        $this->tree = array_fill(0, 4 * $this->n, 0);
        $this->build($arr, 1, 0, $this->n - 1);
    }

    private function build(array $arr, int $node, int $start, int $end): void {
        if ($start === $end) {
            $this->tree[$node] = $arr[$start];
            return;
        }

        $mid = intdiv($start + $end, 2);
        $this->build($arr, $node * 2, $start, $mid);
        $this->build($arr, $node * 2 + 1, $mid + 1, $end);
        $this->tree[$node] = $this->tree[$node * 2] + $this->tree[$node * 2 + 1];
    }

    public function update(int $idx, int $val): void {
        $this->updateTree(1, 0, $this->n - 1, $idx, $val);
    }

    private function updateTree(int $node, int $start, int $end, int $idx, int $val): void {
        if ($start === $end) {
            $this->tree[$node] = $val;
            return;
        }

        $mid = intdiv($start + $end, 2);
        if ($idx <= $mid) {
            $this->updateTree($node * 2, $start, $mid, $idx, $val);
        } else {
            $this->updateTree($node * 2 + 1, $mid + 1, $end, $idx, $val);
        }

        $this->tree[$node] = $this->tree[$node * 2] + $this->tree[$node * 2 + 1];
    }

    public function query(int $l, int $r): int {
        return $this->queryTree(1, 0, $this->n - 1, $l, $r);
    }

    private function queryTree(int $node, int $start, int $end, int $l, int $r): int {
        if ($r < $start || $l > $end) {
            return 0;
        }

        if ($l <= $start && $end <= $r) {
            return $this->tree[$node];
        }

        $mid = intdiv($start + $end, 2);
        return $this->queryTree($node * 2, $start, $mid, $l, $r) +
               $this->queryTree($node * 2 + 1, $mid + 1, $end, $l, $r);
    }
}

?>