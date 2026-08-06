<?php

class ClusteringCoefficient {
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

    public function localClusteringCoefficient(int $node): float {
        if (!isset($this->adjacency[$node])) {
            return 0.0;
        }

        $neighbors = array_keys($this->adjacency[$node]);
        $degree = count($neighbors);

        if ($degree < 2) {
            return 0.0;
        }

        $triangles = 0;
        for ($i = 0; $i < count($neighbors); $i++) {
            for ($j = $i + 1; $j < count($neighbors); $j++) {
                $u = $neighbors[$i];
                $v = $neighbors[$j];
                if (isset($this->adjacency[$u][$v])) {
                    $triangles++;
                }
            }
        }

        $maxPossible = $degree * ($degree - 1) / 2;
        return $triangles / $maxPossible;
    }

    public function allLocalClusteringCoefficients(): array {
        $result = [];
        foreach (array_keys($this->nodes) as $node) {
            $result[$node] = $this->localClusteringCoefficient($node);
        }
        return $result;
    }

    public function averageClusteringCoefficient(): float {
        if (empty($this->nodes)) {
            return 0.0;
        }

        $total = 0.0;
        foreach (array_keys($this->nodes) as $node) {
            $total += $this->localClusteringCoefficient($node);
        }
        return $total / count($this->nodes);
    }

    public function globalClusteringCoefficient(): float {
        $triangles = 0;
        $triplets = 0;

        foreach (array_keys($this->nodes) as $node) {
            $degree = count($this->adjacency[$node]);
            if ($degree >= 2) {
                $triplets += $degree * ($degree - 1) / 2;
            }

            $neighbors = array_keys($this->adjacency[$node]);
            for ($i = 0; $i < count($neighbors); $i++) {
                for ($j = $i + 1; $j < count($neighbors); $j++) {
                    $u = $neighbors[$i];
                    $v = $neighbors[$j];
                    if (isset($this->adjacency[$u][$v])) {
                        $triangles++;
                    }
                }
            }
        }

        if ($triplets == 0) {
            return 0.0;
        }

        return $triangles / $triplets;
    }
}

?>