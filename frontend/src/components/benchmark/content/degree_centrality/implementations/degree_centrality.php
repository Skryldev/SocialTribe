<?php

class DegreeCentrality {
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

    public function degreeCentrality(int $node): int {
        if (!isset($this->adjacency[$node])) {
            return 0;
        }
        return count($this->adjacency[$node]);
    }

    public function allDegreeCentralities(): array {
        $result = [];
        foreach (array_keys($this->nodes) as $node) {
            $result[$node] = $this->degreeCentrality($node);
        }
        return $result;
    }

    public function topKCentralNodes(int $k = 10): array {
        $centralities = $this->allDegreeCentralities();
        arsort($centralities);
        return array_slice($centralities, 0, $k, true);
    }

    public function normalizedDegreeCentrality(int $node): float {
        if (!isset($this->adjacency[$node]) || count($this->nodes) <= 1) {
            return 0.0;
        }
        return $this->degreeCentrality($node) / (count($this->nodes) - 1);
    }

    public function allNormalizedDegreeCentralities(): array {
        $result = [];
        foreach (array_keys($this->nodes) as $node) {
            $result[$node] = $this->normalizedDegreeCentrality($node);
        }
        return $result;
    }
}

?>