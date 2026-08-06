<?php

class BFS {
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

    public function bfs(int $start): array {
        $distances = [];
        $queue = [];

        $distances[$start] = 0;
        $queue[] = $start;

        while (!empty($queue)) {
            $node = array_shift($queue);

            if (!isset($this->adjacency[$node])) continue;

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($distances[$neighbor])) {
                    $distances[$neighbor] = $distances[$node] + 1;
                    $queue[] = $neighbor;
                }
            }
        }

        return $distances;
    }

    public function bfsPath(int $start, int $goal): array {
        $parent = [];
        $queue = [];

        $parent[$start] = -1;
        $queue[] = $start;

        while (!empty($queue)) {
            $node = array_shift($queue);

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
                if (!isset($parent[$neighbor])) {
                    $parent[$neighbor] = $node;
                    $queue[] = $neighbor;
                }
            }
        }

        return [];
    }

    public function bfsOrder(int $start): array {
        $order = [];
        $visited = [];
        $queue = [];

        $visited[$start] = true;
        $queue[] = $start;

        while (!empty($queue)) {
            $node = array_shift($queue);
            $order[] = $node;

            if (!isset($this->adjacency[$node])) continue;

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($visited[$neighbor])) {
                    $visited[$neighbor] = true;
                    $queue[] = $neighbor;
                }
            }
        }

        return $order;
    }

    public function isConnected(): bool {
        if (empty($this->nodes)) return true;

        $nodes = array_keys($this->nodes);
        $start = $nodes[0];
        $distances = $this->bfs($start);
        return count($distances) === count($this->nodes);
    }
}

?>