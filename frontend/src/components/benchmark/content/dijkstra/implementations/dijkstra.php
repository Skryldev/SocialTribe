<?php

class Dijkstra {
    private array $adjacency = [];
    private array $nodes = [];

    public function addEdge(int $u, int $v, int $weight): void {
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        if (!isset($this->adjacency[$v])) {
            $this->adjacency[$v] = [];
        }
        $this->adjacency[$u][] = [$v, $weight];
        $this->adjacency[$v][] = [$u, $weight];
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function addDirectedEdge(int $u, int $v, int $weight): void {
        if (!isset($this->adjacency[$u])) {
            $this->adjacency[$u] = [];
        }
        if (!isset($this->adjacency[$v])) {
            $this->adjacency[$v] = [];
        }
        $this->adjacency[$u][] = [$v, $weight];
        $this->nodes[$u] = true;
        $this->nodes[$v] = true;
    }

    public function buildFromEdges(array $edges, bool $directed = false): void {
        foreach ($edges as $edge) {
            if ($directed) {
                $this->addDirectedEdge($edge[0], $edge[1], $edge[2]);
            } else {
                $this->addEdge($edge[0], $edge[1], $edge[2]);
            }
        }
    }

    public function shortestPath(int $source): array {
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

            if ($d != $dist[$u]) continue;

            if (!isset($this->adjacency[$u])) continue;

            foreach ($this->adjacency[$u] as $edge) {
                $v = $edge[0];
                $w = $edge[1];
                if ($dist[$u] + $w < $dist[$v]) {
                    $dist[$v] = $dist[$u] + $w;
                    $pq[] = [$v, $dist[$v]];
                }
            }
        }

        return $dist;
    }

    public function shortestPathWithPath(int $source, int $target): array {
        $dist = [];
        $parent = [];

        foreach (array_keys($this->nodes) as $node) {
            $dist[$node] = INF;
        }
        $dist[$source] = 0;
        $parent[$source] = -1;

        $pq = [];
        $pq[] = [$source, 0];

        while (!empty($pq)) {
            usort($pq, function($a, $b) {
                return $a[1] - $b[1];
            });
            $current = array_shift($pq);
            $u = $current[0];
            $d = $current[1];

            if ($d != $dist[$u]) continue;

            if ($u == $target) {
                $path = [];
                while ($u != -1) {
                    $path[] = $u;
                    $u = $parent[$u];
                }
                return array_reverse($path);
            }

            if (!isset($this->adjacency[$u])) continue;

            foreach ($this->adjacency[$u] as $edge) {
                $v = $edge[0];
                $w = $edge[1];
                if ($dist[$u] + $w < $dist[$v]) {
                    $dist[$v] = $dist[$u] + $w;
                    $parent[$v] = $u;
                    $pq[] = [$v, $dist[$v]];
                }
            }
        }

        return [];
    }

    public function allShortestPaths(int $source): array {
        $paths = [];
        $dist = [];

        foreach (array_keys($this->nodes) as $node) {
            $dist[$node] = INF;
        }
        $dist[$source] = 0;
        $paths[$source] = [$source];

        $pq = [];
        $pq[] = [$source, 0];

        while (!empty($pq)) {
            usort($pq, function($a, $b) {
                return $a[1] - $b[1];
            });
            $current = array_shift($pq);
            $u = $current[0];
            $d = $current[1];

            if ($d != $dist[$u]) continue;

            if (!isset($this->adjacency[$u])) continue;

            foreach ($this->adjacency[$u] as $edge) {
                $v = $edge[0];
                $w = $edge[1];
                if ($dist[$u] + $w < $dist[$v]) {
                    $dist[$v] = $dist[$u] + $w;
                    $paths[$v] = array_merge($paths[$u], [$v]);
                    $pq[] = [$v, $dist[$v]];
                }
            }
        }

        return $paths;
    }
}

?>