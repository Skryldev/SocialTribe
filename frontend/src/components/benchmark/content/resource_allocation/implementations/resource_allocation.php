<?php

class ResourceAllocation {
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

    public function resourceAllocationScore(int $u, int $v): float {
        if (!isset($this->adjacency[$u]) || !isset($this->adjacency[$v])) {
            return 0.0;
        }

        $score = 0.0;
        foreach (array_keys($this->adjacency[$u]) as $node) {
            if (isset($this->adjacency[$v][$node])) {
                $degree = count($this->adjacency[$node]);
                if ($degree > 0) {
                    $score += 1.0 / $degree;
                }
            }
        }
        return $score;
    }

    public function scoreAllPairs(): array {
        $scores = [];
        $nodeList = array_keys($this->nodes);

        for ($i = 0; $i < count($nodeList); $i++) {
            for ($j = $i + 1; $j < count($nodeList); $j++) {
                $u = $nodeList[$i];
                $v = $nodeList[$j];
                $score = $this->resourceAllocationScore($u, $v);
                if ($score > 0) {
                    $scores[] = [
                        'pair' => [$u, $v],
                        'score' => $score
                    ];
                }
            }
        }

        usort($scores, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        return $scores;
    }

    public function topKPredictions(int $k = 10): array {
        $scores = $this->scoreAllPairs();
        return array_slice($scores, 0, $k);
    }
}

?>