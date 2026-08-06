<?php

class FloydWarshall {
    private array $nodes = [];
    private array $dist = [];
    private array $nextNode = [];

    public function addEdge(int $u, int $v, int $weight): void {
        if (!isset($this->nodes[$u])) $this->nodes[$u] = [];
        if (!isset($this->nodes[$v])) $this->nodes[$v] = [];
        $this->nodes[$u][$v] = true;
        $this->nodes[$v][$u] = true;

        if (!isset($this->dist[$u])) $this->dist[$u] = [];
        if (!isset($this->dist[$v])) $this->dist[$v] = [];
        $this->dist[$u][$v] = $weight;
        $this->dist[$v][$u] = $weight;

        if (!isset($this->nextNode[$u])) $this->nextNode[$u] = [];
        if (!isset($this->nextNode[$v])) $this->nextNode[$v] = [];
        $this->nextNode[$u][$v] = $v;
        $this->nextNode[$v][$u] = $u;
    }

    public function addDirectedEdge(int $u, int $v, int $weight): void {
        if (!isset($this->nodes[$u])) $this->nodes[$u] = [];
        if (!isset($this->nodes[$v])) $this->nodes[$v] = [];
        $this->nodes[$u][$v] = true;

        if (!isset($this->dist[$u])) $this->dist[$u] = [];
        if (!isset($this->dist[$v])) $this->dist[$v] = [];
        $this->dist[$u][$v] = $weight;

        if (!isset($this->nextNode[$u])) $this->nextNode[$u] = [];
        if (!isset($this->nextNode[$v])) $this->nextNode[$v] = [];
        $this->nextNode[$u][$v] = $v;
    }

    public function buildFromEdges(array $edges, bool $directed = false): void {
        foreach ($edges as $edge) {
            if ($directed) {
                $this->addDirectedEdge($edge[0], $edge[1], $edge[2]);
            } else {
                $this->addEdge($edge[0], $edge[1], $edge[2]);
            }
        }
    }

    private function getAllNodes(): array {
        return array_keys($this->nodes);
    }

    private function initialize(): void {
        $allNodes = $this->getAllNodes();

        foreach ($allNodes as $u) {
            if (!isset($this->dist[$u])) $this->dist[$u] = [];
            if (!isset($this->nextNode[$u])) $this->nextNode[$u] = [];

            foreach ($allNodes as $v) {
                if ($u == $v) {
                    $this->dist[$u][$v] = 0;
                } else if (!isset($this->dist[$u][$v])) {
                    $this->dist[$u][$v] = INF;
                }
            }
        }
    }

    public function allPairsShortestPaths(): void {
        $this->initialize();
        $allNodes = $this->getAllNodes();

        foreach ($allNodes as $k) {
            foreach ($allNodes as $i) {
                foreach ($allNodes as $j) {
                    if ($this->dist[$i][$k] != INF && 
                        $this->dist[$k][$j] != INF &&
                        $this->dist[$i][$k] + $this->dist[$k][$j] < $this->dist[$i][$j]) {
                        $this->dist[$i][$j] = $this->dist[$i][$k] + $this->dist[$k][$j];
                        $this->nextNode[$i][$j] = $this->nextNode[$i][$k];
                    }
                }
            }
        }
    }

    public function shortestPath(int $u, int $v): int {
        if (!isset($this->dist[$u]) || !isset($this->dist[$u][$v])) {
            return INF;
        }
        return $this->dist[$u][$v];
    }

    public function getPath(int $u, int $v): array {
        if (!isset($this->nextNode[$u]) || !isset($this->nextNode[$u][$v])) {
            return [];
        }

        $path = [$u];

        while ($u != $v) {
            $u = $this->nextNode[$u][$v];
            $path[] = $u;
        }

        return $path;
    }

    public function getAllDistances(): array {
        return $this->dist;
    }

    public function hasNegativeCycle(): bool {
        $allNodes = $this->getAllNodes();

        foreach ($allNodes as $i) {
            if ($this->dist[$i][$i] < 0) {
                return true;
            }
        }
        return false;
    }
}

?>