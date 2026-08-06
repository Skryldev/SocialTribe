<?php

class BetweennessCentrality {
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

    public function betweennessCentrality(): array {
        $centrality = [];
        foreach (array_keys($this->adjacencyList) as $node) {
            $centrality[$node] = 0.0;
        }

        foreach (array_keys($this->adjacencyList) as $s) {
            $stack = [];
            $pred = [];
            $dist = [];
            $sigma = [];

            foreach (array_keys($this->adjacencyList) as $node) {
                $pred[$node] = [];
                $dist[$node] = -1;
                $sigma[$node] = 0;
            }

            $dist[$s] = 0;
            $sigma[$s] = 1;
            $queue = [$s];

            while (!empty($queue)) {
                $v = array_shift($queue);
                $stack[] = $v;

                foreach (array_keys($this->adjacencyList[$v]) as $w) {
                    if ($dist[$w] < 0) {
                        $dist[$w] = $dist[$v] + 1;
                        $queue[] = $w;
                    }
                    if ($dist[$w] == $dist[$v] + 1) {
                        $sigma[$w] += $sigma[$v];
                        $pred[$w][] = $v;
                    }
                }
            }

            $delta = [];
            foreach (array_keys($this->adjacencyList) as $node) {
                $delta[$node] = 0.0;
            }

            while (!empty($stack)) {
                $w = array_pop($stack);

                foreach ($pred[$w] as $v) {
                    $delta[$v] += ($sigma[$v] / $sigma[$w]) * (1 + $delta[$w]);
                }

                if ($w != $s) {
                    $centrality[$w] += $delta[$w];
                }
            }
        }

        return $centrality;
    }

    public function topKCentralNodes(int $k = 10): array {
        $centrality = $this->betweennessCentrality();
        arsort($centrality);
        return array_slice($centrality, 0, $k, true);
    }
}

?>