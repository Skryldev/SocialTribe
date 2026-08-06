<?php

class CommonNeighbors {
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

    public function commonNeighbors(int $u, int $v): array {
        if (!isset($this->adjacencyList[$u]) || !isset($this->adjacencyList[$v])) {
            return [];
        }

        $result = [];
        foreach (array_keys($this->adjacencyList[$u]) as $node) {
            if (isset($this->adjacencyList[$v][$node])) {
                $result[] = $node;
            }
        }
        return $result;
    }

    public function commonNeighborsCount(int $u, int $v): int {
        return count($this->commonNeighbors($u, $v));
    }

    public function predictLink(int $u, int $v, int $threshold = 1): bool {
        return $this->commonNeighborsCount($u, $v) >= $threshold;
    }

    public function scoreAllPairs(): array {
        $scores = [];
        $nodes = array_keys($this->adjacencyList);

        for ($i = 0; $i < count($nodes); $i++) {
            for ($j = $i + 1; $j < count($nodes); $j++) {
                $u = $nodes[$i];
                $v = $nodes[$j];
                $count = $this->commonNeighborsCount($u, $v);
                if ($count > 0) {
                    $scores[] = [
                        'pair' => [$u, $v],
                        'score' => $count
                    ];
                }
            }
        }

        usort($scores, function($a, $b) {
            return $b['score'] - $a['score'];
        });

        return $scores;
    }

    public function topKPredictions(int $k = 10): array {
        $scores = $this->scoreAllPairs();
        return array_slice($scores, 0, $k);
    }
}

?>