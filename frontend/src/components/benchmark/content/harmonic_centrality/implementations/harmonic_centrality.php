<?php

class HarmonicCentrality {
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

    private function bfsDistances(int $start): array {
        $distances = [];
        $queue = [];
        
        $distances[$start] = 0;
        $queue[] = $start;
        
        while (!empty($queue)) {
            $node = array_shift($queue);
            
            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($distances[$neighbor])) {
                    $distances[$neighbor] = $distances[$node] + 1;
                    $queue[] = $neighbor;
                }
            }
        }
        
        return $distances;
    }

    public function harmonicCentrality(int $node): float {
        if (!isset($this->adjacency[$node])) {
            return 0.0;
        }
        
        $distances = $this->bfsDistances($node);
        $sum = 0.0;
        
        foreach ($distances as $target => $dist) {
            if ($target !== $node && $dist > 0) {
                $sum += 1.0 / $dist;
            }
        }
        
        return $sum;
    }

    public function allHarmonicCentralities(): array {
        $result = [];
        
        foreach (array_keys($this->nodes) as $node) {
            $result[$node] = $this->harmonicCentrality($node);
        }
        
        return $result;
    }

    public function topKCentralNodes(int $k = 10): array {
        $centralities = $this->allHarmonicCentralities();
        arsort($centralities);
        return array_slice($centralities, 0, $k, true);
    }
}

?>