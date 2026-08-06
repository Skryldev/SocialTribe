<?php

class Johnson {
    private array $edges = [];
    private array $adjacency = [];
    private array $nodes = [];

    public function addEdge(int $u, int $v, int $weight): void {
        $this->edges[] = ['u' => $u, 'v' => $v, 'weight' => $weight];
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        $this->adjacency[$u][$v] = true;
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function buildFromEdges(array $edgeList): void {
        foreach ($edgeList as $edge) {
            $this->addEdge($edge[0], $edge[1], $edge[2]);
        }
    }

    private function bellmanFord(int $source): ?array {
        $dist = [];
        foreach (array_keys($this->nodes) as $node) {
            $dist[$node] = INF;
        }
        $dist[$source] = 0;

        for ($i = 0; $i < count($this->nodes) - 1; $i++) {
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

    private function dijkstra(int $source, array $h): array {
        $dist = [];
        foreach (array_keys($this->nodes) as $node) {
            $dist[$node] = INF;
        }
        $dist[$source] = 0;

        $pq = [];
        $pq[] = [$source, 0];

        while (!empty($pq)) {
            usort($pq, function($a, $b) {
                return $a[1] - $b[1];
            });
            $current = array_shift($pq);
            $u = $current[0];
            $d = $current[1];

            if ($d !== $dist[$u]) continue;

            if (!isset($this->adjacency[$u])) continue;

            foreach (array_keys($this->adjacency[$u]) as $v) {
                $weight = 0;
                foreach ($this->edges as $edge) {
                    if ($edge['u'] === $u && $edge['v'] === $v) {
                        $weight = $edge['weight'];
                        break;
                    }
                }
                $newDist = $dist[$u] + $weight + $h[$u] - $h[$v];
                if ($newDist < $dist[$v]) {
                    $dist[$v] = $newDist;
                    $pq[] = [$v, $dist[$v]];
                }
            }
        }

        $result = [];
        foreach (array_keys($this->nodes) as $node) {
            $result[$node] = $dist[$node] - $h[$source] + $h[$node];
        }
        return $result;
    }

    public function allPairsShortestPaths(): ?array {
        $maxNode = max(array_keys($this->nodes));
        $newNode = $maxNode + 1;

        foreach (array_keys($this->nodes) as $node) {
            $this->addEdge($newNode, $node, 0);
        }

        $h = $this->bellmanFord($newNode);
        if ($h === null) {
            return null;
        }

        $result = [];
        foreach (array_keys($this->nodes) as $node) {
            if ($node === $newNode) continue;
            $result[$node] = $this->dijkstra($node, $h);
        }

        return $result;
    }
}

?>