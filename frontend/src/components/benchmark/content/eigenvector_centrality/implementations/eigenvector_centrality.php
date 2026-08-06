<?php

class EigenvectorCentrality {
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

    public function eigenvectorCentrality(int $maxIter = 100, float $tol = 1e-6): array {
        $centrality = [];
        $n = count($this->nodes);

        foreach (array_keys($this->nodes) as $node) {
            $centrality[$node] = 1.0 / $n;
        }

        for ($iter = 0; $iter < $maxIter; $iter++) {
            $newCentrality = [];
            $norm = 0.0;

            foreach (array_keys($this->nodes) as $node) {
                $sum = 0.0;
                foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                    $sum += $centrality[$neighbor];
                }
                $newCentrality[$node] = $sum;
                $norm += $sum * $sum;
            }

            $norm = sqrt($norm);
            $diff = 0.0;

            foreach (array_keys($this->nodes) as $node) {
                $newCentrality[$node] /= $norm;
                $diff += abs($newCentrality[$node] - $centrality[$node]);
            }

            $centrality = $newCentrality;

            if ($diff < $tol) {
                break;
            }
        }

        return $centrality;
    }

    public function topKCentralNodes(int $k = 10, int $maxIter = 100, float $tol = 1e-6): array {
        $centrality = $this->eigenvectorCentrality($maxIter, $tol);
        arsort($centrality);
        return array_slice($centrality, 0, $k, true);
    }

    public function normalizedEigenvectorCentrality(int $maxIter = 100, float $tol = 1e-6): array {
        $centrality = $this->eigenvectorCentrality($maxIter, $tol);
        $maxVal = max($centrality);

        if ($maxVal > 0) {
            foreach (array_keys($centrality) as $node) {
                $centrality[$node] /= $maxVal;
            }
        }

        return $centrality;
    }
}

?>