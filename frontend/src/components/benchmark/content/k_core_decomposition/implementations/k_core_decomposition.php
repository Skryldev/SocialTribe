<?php

class KCoreDecomposition {
    private array $adjacency = [];
    private array $nodes = [];

    public function addEdge(int $u, int $v): void {
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        if (!isset($this->adjacency[$v])) {
            $this->adjacency[$v] = [];
        }
        $this->adjacency[$u][$v] = true;
        $this->adjacency[$v][$u] = true;
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function buildFromEdges(array $edges): void {
        foreach ($edges as $edge) {
            $this->addEdge($edge[0], $edge[1]);
        }
    }

    public function kCoreDecomposition(): array {
        $core = [];
        $degree = [];

        foreach (array_keys($this->nodes) as $node) {
            $degree[$node] = count($this->adjacency[$node]);
        }

        $buckets = array_fill(0, count($this->nodes) + 1, []);
        $maxDegree = 0;

        foreach (array_keys($this->nodes) as $node) {
            $buckets[$degree[$node]][] = $node;
            $maxDegree = max($maxDegree, $degree[$node]);
        }

        $removed = [];
        $k = 0;

        for ($i = 0; $i <= $maxDegree; $i++) {
            foreach ($buckets[$i] as $node) {
                if (isset($removed[$node])) continue;

                $k = max($k, $i);
                $core[$node] = $k;
                $removed[$node] = true;

                foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                    if (!isset($removed[$neighbor])) {
                        $degree[$neighbor]--;
                        if ($degree[$neighbor] <= $i) {
                            $buckets[$degree[$neighbor]][] = $neighbor;
                        }
                    }
                }
            }
        }

        foreach (array_keys($this->nodes) as $node) {
            if (!isset($core[$node])) {
                $core[$node] = 0;
            }
        }

        return $core;
    }

    public function getKCore(int $k): array {
        $core = $this->kCoreDecomposition();
        $result = [];

        foreach (array_keys($this->nodes) as $node) {
            if ($core[$node] >= $k) {
                $result[] = $node;
            }
        }

        return $result;
    }
}

?>