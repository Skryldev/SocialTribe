<?php

class GirvanNewman {
    private array $adjacency = [];
    private array $nodes = [];
    private array $edgeBetweenness = [];
    private array $communities = [];

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
        $dist = [];
        $predecessors = [];
        $queue = [];

        $dist[$start] = 0;
        $queue[] = $start;

        while (!empty($queue)) {
            $node = array_shift($queue);

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                if (!isset($dist[$neighbor])) {
                    $dist[$neighbor] = $dist[$node] + 1;
                    $queue[] = $neighbor;
                }
                if ($dist[$neighbor] == $dist[$node] + 1) {
                    if (!isset($predecessors[$neighbor])) {
                        $predecessors[$neighbor] = [];
                    }
                    $predecessors[$neighbor][] = $node;
                }
            }
        }

        return ['dist' => $dist, 'predecessors' => $predecessors];
    }

    private function computeEdgeBetweenness(): void {
        $this->edgeBetweenness = [];

        foreach ($this->adjacency as $u => $neighbors) {
            foreach (array_keys($neighbors) as $v) {
                $edge = $u < $v ? "{$u},{$v}" : "{$v},{$u}";
                if (!isset($this->edgeBetweenness[$edge])) {
                    $this->edgeBetweenness[$edge] = 0.0;
                }
            }
        }

        foreach (array_keys($this->nodes) as $source) {
            $result = $this->bfsDistances($source);
            $dist = $result['dist'];
            $predecessors = $result['predecessors'];

            $dependency = [];
            foreach (array_keys($this->nodes) as $node) {
                $dependency[$node] = 0.0;
            }

            $sortedNodes = array_keys($dist);
            usort($sortedNodes, function($a, $b) use ($dist) {
                return $dist[$b] - $dist[$a];
            });

            foreach ($sortedNodes as $node) {
                if (!isset($predecessors[$node])) continue;

                $preds = $predecessors[$node];
                foreach ($preds as $pred) {
                    $contrib = (1.0 + $dependency[$node]) / count($preds);
                    $dependency[$pred] += $contrib;
                }
            }

            foreach ($sortedNodes as $node) {
                if (!isset($predecessors[$node])) continue;

                $preds = $predecessors[$node];
                foreach ($preds as $pred) {
                    $edge = $pred < $node ? "{$pred},{$node}" : "{$node},{$pred}";
                    $this->edgeBetweenness[$edge] += $dependency[$node] / count($preds);
                }
            }
        }

        foreach ($this->edgeBetweenness as $edge => $value) {
            $this->edgeBetweenness[$edge] = $value / 2.0;
        }
    }

    private function removeEdgeWithMaxBetweenness(): void {
        $maxEdge = null;
        $maxBetweenness = -1.0;

        foreach ($this->edgeBetweenness as $edge => $betweenness) {
            if ($betweenness > $maxBetweenness) {
                $maxBetweenness = $betweenness;
                $maxEdge = $edge;
            }
        }

        if ($maxEdge) {
            list($u, $v) = explode(',', $maxEdge);
            $u = (int)$u;
            $v = (int)$v;
            unset($this->adjacency[$u][$v]);
            unset($this->adjacency[$v][$u]);
        }
    }

    private function findComponents(): array {
        $components = [];
        $visited = [];

        foreach (array_keys($this->nodes) as $node) {
            if (isset($visited[$node])) continue;

            $component = [];
            $queue = [$node];
            $visited[$node] = true;

            while (!empty($queue)) {
                $current = array_shift($queue);
                $component[] = $current;

                foreach (array_keys($this->adjacency[$current]) as $neighbor) {
                    if (!isset($visited[$neighbor])) {
                        $visited[$neighbor] = true;
                        $queue[] = $neighbor;
                    }
                }
            }

            if (!empty($component)) {
                $components[] = $component;
            }
        }

        return $components;
    }

    private function modularity(array $communities): float {
        $communityMap = [];
        foreach ($communities as $i => $community) {
            foreach ($community as $node) {
                $communityMap[$node] = $i;
            }
        }

        $m = 0.0;
        foreach ($this->adjacency as $neighbors) {
            $m += count($neighbors);
        }
        $m /= 2.0;

        $degrees = [];
        foreach (array_keys($this->nodes) as $node) {
            $degrees[$node] = count($this->adjacency[$node]);
        }

        $Q = 0.0;
        foreach ($this->adjacency as $u => $neighbors) {
            foreach (array_keys($neighbors) as $v) {
                if ($communityMap[$u] == $communityMap[$v]) {
                    $Q += 1.0 - ($degrees[$u] * $degrees[$v]) / (2.0 * $m);
                }
            }
        }

        return $Q / (2.0 * $m);
    }

    public function detectCommunities(int $numCommunities = 2): array {
        while (true) {
            $this->computeEdgeBetweenness();
            $this->removeEdgeWithMaxBetweenness();

            $currentComponents = $this->findComponents();
            if (count($currentComponents) >= $numCommunities) {
                $this->communities = $currentComponents;
                break;
            }

            if (empty($this->adjacency)) {
                break;
            }
        }

        return $this->communities;
    }

    public function detectCommunitiesByModularity(): array {
        $bestCommunities = [];
        $bestModularity = -1.0;
        $iterations = 0;

        while (true) {
            $this->computeEdgeBetweenness();
            $this->removeEdgeWithMaxBetweenness();

            $currentComponents = $this->findComponents();
            $currentModularity = $this->modularity($currentComponents);

            if ($currentModularity > $bestModularity) {
                $bestModularity = $currentModularity;
                $bestCommunities = $currentComponents;
            }

            if (count($currentComponents) == 1) {
                break;
            }

            $iterations++;
            if ($iterations > 1000) break;
        }

        return $bestCommunities;
    }
}

?>