<?php

class PageRank {
    private array $adjacency = [];
    private array $nodes = [];

    public function addEdge(int $u, int $v): void {
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        $this->adjacency[$u][$v] = true;
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function buildFromEdges(array $edges): void {
        foreach ($edges as $edge) {
            $this->addEdge($edge[0], $edge[1]);
        }
    }

    public function pagerank(float $damping = 0.85, int $maxIter = 100, float $tol = 1e-6): array {
        $pr = [];
        $n = count($this->nodes);

        if ($n === 0) return $pr;

        foreach (array_keys($this->nodes) as $node) {
            $pr[$node] = 1.0 / $n;
        }

        for ($iter = 0; $iter < $maxIter; $iter++) {
            $newPr = [];
            $diff = 0.0;

            foreach (array_keys($this->nodes) as $node) {
                $rank = (1 - $damping) / $n;

                foreach (array_keys($this->nodes) as $neighbor) {
                    if (isset($this->adjacency[$neighbor][$node])) {
                        $outDegree = count($this->adjacency[$neighbor]);
                        if ($outDegree > 0) {
                            $rank += $damping * ($pr[$neighbor] / $outDegree);
                        }
                    }
                }

                $newPr[$node] = $rank;
                $diff += abs($newPr[$node] - $pr[$node]);
            }

            $pr = $newPr;
            if ($diff < $tol) break;
        }

        return $pr;
    }

    public function topKNodes(int $k = 10, float $damping = 0.85): array {
        $pr = $this->pagerank($damping);
        arsort($pr);
        return array_slice($pr, 0, $k, true);
    }
}

?>