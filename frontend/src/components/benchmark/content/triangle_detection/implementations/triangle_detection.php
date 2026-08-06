<?php

class TriangleDetection {
    private array $adjacencyList = [];

    public function __construct() {
        $this->adjacencyList = [];
    }

    public function addEdge(int $u, int $v): void {
        if (!isset($this->adjacencyList[$u])) {
            $this->adjacencyList[$u] = [];
        }
        if (!isset($this->adjacencyList[$v])) {
            $this->adjacencyList[$v] = [];
        }
        $this->adjacencyList[$u][$v] = true;
        $this->adjacencyList[$v][$u] = true;
    }

    public function buildFromEdges(array $edges): void {
        foreach ($edges as $edge) {
            $this->addEdge($edge[0], $edge[1]);
        }
    }

    public function countTriangles(): int {
        $count = 0;
        foreach ($this->adjacencyList as $u => $neighbors) {
            foreach (array_keys($neighbors) as $v) {
                if ($v > $u) {
                    foreach (array_keys($neighbors) as $w) {
                        if ($w > $v && isset($this->adjacencyList[$v][$w])) {
                            $count++;
                        }
                    }
                }
            }
        }
        return $count;
    }

    public function findTriangles(): array {
        $triangles = [];
        foreach ($this->adjacencyList as $u => $neighbors) {
            foreach (array_keys($neighbors) as $v) {
                if ($v > $u) {
                    foreach (array_keys($neighbors) as $w) {
                        if ($w > $v && isset($this->adjacencyList[$v][$w])) {
                            $triangles[] = [$u, $v, $w];
                        }
                    }
                }
            }
        }
        return $triangles;
    }

    public function hasTriangle(): bool {
        foreach ($this->adjacencyList as $u => $neighbors) {
            foreach (array_keys($neighbors) as $v) {
                if ($v > $u) {
                    foreach (array_keys($neighbors) as $w) {
                        if ($w > $v && isset($this->adjacencyList[$v][$w])) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}

?>