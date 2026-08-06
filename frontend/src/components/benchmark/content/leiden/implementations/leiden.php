<?php

class Leiden {
    private array $adjacency = [];
    private array $nodes = [];
    private array $communities = [];
    private array $weights = [];
    private float $m = 0.0;

    public function addEdge(int $u, int $v, float $weight = 1.0): void {
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

        $key = $u < $v ? "{$u},{$v}" : "{$v},{$u}";
        $this->weights[$key] = ($this->weights[$key] ?? 0) + $weight;
        $this->m += $weight;
    }

    public function buildFromEdges(array $edges): void {
        foreach ($edges as $edge) {
            $this->addEdge($edge[0], $edge[1]);
        }
    }

    private function degree(int $node): float {
        $deg = 0.0;
        foreach (array_keys($this->adjacency[$node]) as $neighbor) {
            $deg += $this->weight($node, $neighbor);
        }
        return $deg;
    }

    private function weight(int $u, int $v): float {
        $key = $u < $v ? "{$u},{$v}" : "{$v},{$u}";
        return $this->weights[$key] ?? 0.0;
    }

    private function communityDegree(int $node, int $community): float {
        $deg = 0.0;
        foreach (array_keys($this->adjacency[$node]) as $neighbor) {
            if ($this->communities[$neighbor] === $community) {
                $deg += $this->weight($node, $neighbor);
            }
        }
        return $deg;
    }

    private function totalDegree(int $community): float {
        $total = 0.0;
        foreach (array_keys($this->nodes) as $node) {
            if ($this->communities[$node] === $community) {
                $total += $this->degree($node);
            }
        }
        return $total;
    }

    private function modularityGain(int $node, int $community): float {
        $ki = $this->degree($node);
        $kic = $this->communityDegree($node, $community);
        $total = $this->totalDegree($community);
        return ($kic - ($total * $ki) / (2 * $this->m)) / $this->m;
    }

    private function initializeCommunities(): void {
        foreach (array_keys($this->nodes) as $node) {
            $this->communities[$node] = $node;
        }
    }

    private function refinePartition(): bool {
        $changed = false;
        $nodeList = array_keys($this->nodes);
        shuffle($nodeList);

        foreach ($nodeList as $node) {
            $currentCommunity = $this->communities[$node];
            $bestCommunity = $currentCommunity;
            $bestGain = 0.0;

            $communitiesSeen = [];
            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                $community = $this->communities[$neighbor];
                if (in_array($community, $communitiesSeen)) continue;
                $communitiesSeen[] = $community;

                if ($community === $currentCommunity) continue;

                $gain = $this->modularityGain($node, $community);
                if ($gain > $bestGain) {
                    $bestGain = $gain;
                    $bestCommunity = $community;
                }
            }

            if ($bestCommunity !== $currentCommunity) {
                $this->communities[$node] = $bestCommunity;
                $changed = true;
            }
        }

        return $changed;
    }

    private function aggregateNetwork(): void {
        $newAdjacency = [];
        $newNodes = [];
        $newWeights = [];
        $newM = 0.0;

        $communityMap = [];
        $nextId = 0;
        foreach (array_unique(array_values($this->communities)) as $community) {
            $communityMap[$community] = $nextId++;
        }

        foreach ($this->communities as $node => $community) {
            $newCommunity = $communityMap[$community];
            if (!isset($newAdjacency[$newCommunity])) {
                $newAdjacency[$newCommunity] = [];
            }
            $newNodes[$newCommunity] = true;
        }

        foreach ($this->weights as $key => $weight) {
            list($u, $v) = explode(',', $key);
            $u = (int)$u;
            $v = (int)$v;
            
            $cu = $communityMap[$this->communities[$u]];
            $cv = $communityMap[$this->communities[$v]];

            if ($cu === $cv) {
                $newM += $weight;
                continue;
            }

            $newKey = $cu < $cv ? "{$cu},{$cv}" : "{$cv},{$cu}";
            $newWeights[$newKey] = ($newWeights[$newKey] ?? 0) + $weight;
            
            if (!isset($newAdjacency[$cu])) {
                $newAdjacency[$cu] = [];
            }
            if (!isset($newAdjacency[$cv])) {
                $newAdjacency[$cv] = [];
            }
            
            $newAdjacency[$cu][$cv] = true;
            $newAdjacency[$cv][$cu] = true;
            $newM += $weight;
        }

        foreach (array_keys($newNodes) as $community) {
            if (!isset($newAdjacency[$community])) {
                $newAdjacency[$community] = [];
            }
        }

        $this->adjacency = $newAdjacency;
        $this->nodes = $newNodes;
        $this->weights = $newWeights;
        $this->m = $newM;

        $newCommunities = [];
        foreach ($this->communities as $node => $community) {
            $newCommunities[$node] = $communityMap[$community];
        }
        $this->communities = $newCommunities;
    }

    private function fastLocalMove(): bool {
        $changed = false;
        $nodeList = array_keys($this->nodes);
        shuffle($nodeList);

        foreach ($nodeList as $node) {
            $bestCommunity = $this->communities[$node];
            $bestGain = 0.0;

            foreach (array_keys($this->adjacency[$node]) as $neighbor) {
                $community = $this->communities[$neighbor];
                if ($community === $this->communities[$node]) continue;
                $gain = $this->modularityGain($node, $community);
                if ($gain > $bestGain) {
                    $bestGain = $gain;
                    $bestCommunity = $community;
                }
            }

            if ($bestCommunity !== $this->communities[$node]) {
                $this->communities[$node] = $bestCommunity;
                $changed = true;
            }
        }

        return $changed;
    }

    public function detectCommunities(): array {
        $this->initializeCommunities();

        while (true) {
            $improved = false;

            while ($this->refinePartition()) {
                $improved = true;
            }

            if (!$improved) break;

            while ($this->fastLocalMove()) {
                $improved = true;
            }

            if (!$improved) break;

            $this->aggregateNetwork();
        }

        return $this->communities;
    }
}

?>