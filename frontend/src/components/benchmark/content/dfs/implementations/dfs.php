<?php

class DFS {
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

    public function addDirectedEdge(int $u, int $v): void {
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        if (!isset($this->adjacency[$v])) {
            $this->adjacency[$v] = [];
        }
        $this->adjacency[$u][$v] = true;
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function buildFromEdges(array $edges, bool $directed = false): void {
        foreach ($edges as $edge) {
            if ($directed) {
                $this->addDirectedEdge($edge[0], $edge[1]);
            } else {
                $this->addEdge($edge[0], $edge[1]);
            }
        }
    }

    private function dfsRecursiveUtil(int $node, array &$visited, array &$order): void {
        $visited[$node] = true;
        $order[] = $node;

        if (!isset($this->adjacency[$node])) return;

        foreach (array_keys($this->adjacency[$node]) as $neighbor) {
            if (!isset($visited[$neighbor])) {
                $this->dfsRecursiveUtil($neighbor, $visited, $order);
            }
        }
    }

    public function dfsRecursive(int $start): array {
        $order = [];
        $visited = [];
        $this->dfsRecursiveUtil($start, $visited, $order);
        return $order;
    }

    public function dfsIterative(int $start): array {
        $order = [];
        $visited = [];
        $stack = [$start];

        while (!empty($stack)) {
            $node = array_pop($stack);

            if (isset($visited[$node])) continue;

            $visited[$node] = true;
            $order[] = $node;

            if (!isset($this->adjacency[$node])) continue;

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($visited[$neighbor])) {
                    $stack[] = $neighbor;
                }
            }
        }

        return $order;
    }

    public function dfsPath(int $start, int $goal): array {
        $parent = [];
        $visited = [];
        $stack = [$start];

        $parent[$start] = -1;

        while (!empty($stack)) {
            $node = array_pop($stack);

            if (isset($visited[$node])) continue;
            $visited[$node] = true;

            if ($node === $goal) {
                $path = [];
                while ($node !== -1) {
                    $path[] = $node;
                    $node = $parent[$node];
                }
                return array_reverse($path);
            }

            if (!isset($this->adjacency[$node])) continue;

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($visited[$neighbor])) {
                    $parent[$neighbor] = $node;
                    $stack[] = $neighbor;
                }
            }
        }

        return [];
    }

    public function findComponents(): array {
        $components = [];
        $visited = [];

        foreach (array_keys($this->nodes) as $node) {
            if (!isset($visited[$node])) {
                $component = [];
                $this->dfsRecursiveUtil($node, $visited, $component);
                $components[] = $component;
            }
        }

        return $components;
    }

    public function isConnected(): bool {
        if (empty($this->nodes)) return true;

        $nodes = array_keys($this->nodes);
        $start = $nodes[0];
        $visited = [];
        $order = [];
        $this->dfsRecursiveUtil($start, $visited, $order);

        return count($visited) === count($this->nodes);
    }

    public function hasCycle(): bool {
        $visited = [];
        $recStack = [];

        foreach (array_keys($this->nodes) as $node) {
            if (!isset($visited[$node])) {
                if ($this->hasCycleUtil($node, $visited, $recStack, -1)) {
                    return true;
                }
            }
        }
        return false;
    }

    private function hasCycleUtil(int $node, array &$visited, array &$recStack, int $parent): bool {
        $visited[$node] = true;
        $recStack[$node] = true;

        if (!isset($this->adjacency[$node])) return false;

        foreach (array_keys($this->adjacency[$node]) as $neighbor) {
            if (isset($recStack[$neighbor]) && $neighbor !== $parent) {
                return true;
            }

            if (!isset($visited[$neighbor])) {
                if ($this->hasCycleUtil($neighbor, $visited, $recStack, $node)) {
                    return true;
                }
            }
        }

        unset($recStack[$node]);
        return false;
    }
}

?>