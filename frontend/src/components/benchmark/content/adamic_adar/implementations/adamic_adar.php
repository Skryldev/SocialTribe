<?php

class AdamicAdar {
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

    public function adamicAdarScore(int $u, int $v): float {
        if (!isset($this->adjacencyList[$u]) || !isset($this->adjacencyList[$v])) {
            return 0.0;
        }

        $score = 0.0;
        foreach (array_keys($this->adjacencyList[$u]) as $node) {
            if (isset($this->adjacencyList[$v][$node])) {
                $degree = count($this->adjacencyList[$node]);
                if ($degree > 1) {
                    $score += 1.0 / log($degree);
                }
            }
        }
        return $score;
    }

    public function scoreAllPairs(): array {
        $scores = [];
        $nodes = array_keys($this->adjacencyList);

        for ($i = 0; $i < count($nodes); $i++) {
            for ($j = $i + 1; $j < count($nodes); $j++) {
                $u = $nodes[$i];
                $v = $nodes[$j];
                $score = $this->adamicAdarScore($u, $v);
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