<?php

class AStar {
    private array $graph = [];

    public function __construct() {
        $this->graph = [];
    }

    public function addEdge(int $u, int $v): void {
        if (!isset($this->graph[$u])) {
            $this->graph[$u] = [];
        }
        if (!isset($this->graph[$v])) {
            $this->graph[$v] = [];
        }
        $this->graph[$u][$v] = true;
        $this->graph[$v][$u] = true;
    }

    public function buildFromEdges(array $edges): void {
        foreach ($edges as $edge) {
            $this->addEdge($edge[0], $edge[1]);
        }
    }

    private function heuristic(int $node, int $goal): float {
        return abs($node - $goal);
    }

    public function search(int $start, int $goal): ?array {
        if (!isset($this->graph[$start]) || !isset($this->graph[$goal])) {
            return null;
        }

        $openSet = new SplPriorityQueue();
        $openSet->insert($start, 0);
        
        $cameFrom = [];
        $gScore = [];
        $fScore = [];

        $cameFrom[$start] = $start;
        $gScore[$start] = 0;
        $fScore[$start] = $this->heuristic($start, $goal);

        while (!$openSet->isEmpty()) {
            $current = $openSet->extract();

            if ($current === $goal) {
                $path = [];
                while ($current !== $start) {
                    $path[] = $current;
                    $current = $cameFrom[$current];
                }
                $path[] = $start;
                return array_reverse($path);
            }

            foreach (array_keys($this->graph[$current]) as $neighbor) {
                $tentativeG = $gScore[$current] + 1;

                if (!isset($gScore[$neighbor]) || $tentativeG < $gScore[$neighbor]) {
                    $cameFrom[$neighbor] = $current;
                    $gScore[$neighbor] = $tentativeG;
                    $fScore[$neighbor] = $tentativeG + $this->heuristic($neighbor, $goal);
                    $openSet->insert($neighbor, -$fScore[$neighbor]);
                }
            }
        }

        return null;
    }
}

?>