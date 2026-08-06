<?php

class FenwickTree {
    private int $n;
    private array $tree;

    public function __construct(int $size) {
        $this->n = $size;
        $this->tree = array_fill(0, $size + 1, 0);
    }

    public function build(array $arr): void {
        for ($i = 0; $i < $this->n; $i++) {
            $this->tree[$i + 1] += $arr[$i];
            $j = ($i + 1) + (($i + 1) & -($i + 1));
            if ($j <= $this->n) {
                $this->tree[$j] += $this->tree[$i + 1];
            }
        }
    }

    public function update(int $idx, int $delta): void {
        $i = $idx + 1;
        while ($i <= $this->n) {
            $this->tree[$i] += $delta;
            $i += $i & -$i;
        }
    }

    public function query(int $idx): int {
        $result = 0;
        $i = $idx + 1;
        while ($i > 0) {
            $result += $this->tree[$i];
            $i -= $i & -$i;
        }
        return $result;
    }

    public function rangeQuery(int $left, int $right): int {
        return $this->query($right) - ($left > 0 ? $this->query($left - 1) : 0);
    }
}

?>