<?php

class BellmanFord {
    private array $edges = [];
    private array $vertices = [];

    public function addEdge(int $u, int $v, int $weight): void {
        $this->edges[] = ['u' => $u, 'v' => $v, 'weight' => $weight];
        $this->vertices[$u] = true;
        $this->vertices[$v] = true;
    }

    public function buildFromEdges(array $edgeList): void {
        foreach ($edgeList as $edge) {
            $this->addEdge($edge[0], $edge[1], $edge[2]);
        }
    }

    public function shortestPath(int $source): ?array {
        if (!isset($this->vertices[$source])) {
            return null;
        }

        $dist = [];
        foreach (array_keys($this->vertices) as $v) {
            $dist[$v] = INF;
        }
        $dist[$source] = 0;

        for ($i = 0; $i < count($this->vertices) - 1; $i++) {
            $updated = false;
            foreach ($this->edges as $edge) {
                if ($dist[$edge['u']] !== INF && $dist[$edge['u']] + $edge['weight'] < $dist[$edge['v']]) {
                    $dist[$edge['v']] = $dist[$edge['u']] + $edge['weight'];
                    $updated = true;
                }
            }
            if (!$updated) break;
        }

        foreach ($this->edges as $edge) {
            if ($dist[$edge['u']] !== INF && $dist[$edge['u']] + $edge['weight'] < $dist[$edge['v']]) {
                return null;
            }
        }

        return $dist;
    }

    public function hasNegativeCycle(): bool {
        $vertices = array_keys($this->vertices);
        return $this->shortestPath($vertices[0]) === null;
    }
}

?>