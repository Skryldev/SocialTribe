<?php

class ClosenessCentrality {
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

    public function bfsDistances(int $start): array {
        $distances = [];
        $queue = [];
        
        $distances[$start] = 0;
        $queue[] = $start;
        
        while (!empty($queue)) {
            $node = array_shift($queue);
            foreach (array_keys($this->adjacencyList[$node] ?? []) as $neighbor) {
                if (!isset($distances[$neighbor])) {
                    $distances[$neighbor] = $distances[$node] + 1;
                    $queue[] = $neighbor;
                }
            }
        }
        
        return $distances;
    }

    public function closenessCentrality(int $node): float {
        if (!isset($this->adjacencyList[$node])) {
            return 0.0;
        }
        
        $distances = $this->bfsDistances($node);
        $reachableNodes = count($distances) - 1;
        
        if ($reachableNodes == 0) {
            return 0.0;
        }
        
        $totalDistance = array_sum($distances);
        return $reachableNodes / $totalDistance;
    }

    public function allClosenessCentralities(): array {
        $result = [];
        
        foreach (array_keys($this->adjacencyList) as $node) {
            $result[] = [
                'node' => $node,
                'score' => $this->closenessCentrality($node)
            ];
        }
        
        usort($result, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });
        
        return $result;
    }

    public function topKCentralNodes(int $k = 10): array {
        $centralities = $this->allClosenessCentralities();
        return array_slice($centralities, 0, $k);
    }

    public function normalizedClosenessCentrality(int $node): float {
        if (!isset($this->adjacencyList[$node])) {
            return 0.0;
        }
        
        $distances = $this->bfsDistances($node);
        $reachableNodes = count($distances) - 1;
        $totalNodes = count($this->adjacencyList);
        
        if ($reachableNodes == 0 || $totalNodes <= 1) {
            return 0.0;
        }
        
        $totalDistance = array_sum($distances);
        return ($reachableNodes / $totalDistance) * (($totalNodes - 1) / $reachableNodes);
    }
}

?>