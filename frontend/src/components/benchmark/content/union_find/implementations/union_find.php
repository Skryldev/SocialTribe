<?php

class UnionFind {
    private array $parent;
    private array $rank;
    private int $count;

    public function __construct(int $n) {
        $this->parent = range(0, $n - 1);
        $this->rank = array_fill(0, $n, 0);
        $this->count = $n;
    }

    public function find(int $x): int {
        if ($this->parent[$x] !== $x) {
            $this->parent[$x] = $this->find($this->parent[$x]);
        }
        return $this->parent[$x];
    }

    public function union(int $x, int $y): bool {
        $rootX = $this->find($x);
        $rootY = $this->find($y);

        if ($rootX === $rootY) {
            return false;
        }

        if ($this->rank[$rootX] < $this->rank[$rootY]) {
            $this->parent[$rootX] = $rootY;
        } else if ($this->rank[$rootX] > $this->rank[$rootY]) {
            $this->parent[$rootY] = $rootX;
        } else {
            $this->parent[$rootY] = $rootX;
            $this->rank[$rootX]++;
        }

        $this->count--;
        return true;
    }

    public function connected(int $x, int $y): bool {
        return $this->find($x) === $this->find($y);
    }

    public function count(): int {
        return $this->count;
    }
}

?>