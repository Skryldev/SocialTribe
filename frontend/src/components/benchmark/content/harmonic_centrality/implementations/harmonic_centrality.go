package main

import (
    "sort"
)

type HarmonicCentrality struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewHarmonicCentrality() *HarmonicCentrality {
    return &HarmonicCentrality{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (hc *HarmonicCentrality) AddEdge(u, v int) {
    if hc.adjacency[u] == nil {
        hc.adjacency[u] = make(map[int]bool)
    }
    if hc.adjacency[v] == nil {
        hc.adjacency[v] = make(map[int]bool)
    }
    hc.adjacency[u][v] = true
    hc.adjacency[v][u] = true
    hc.nodes[u] = true
    hc.nodes[v] = true
}

func (hc *HarmonicCentrality) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        hc.AddEdge(edge[0], edge[1])
    }
}

func (hc *HarmonicCentrality) bfsDistances(start int) map[int]int {
    distances := make(map[int]int)
    queue := []int{start}
    distances[start] = 0

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]

        for neighbor := range hc.adjacency[node] {
            if _, exists := distances[neighbor]; !exists {
                distances[neighbor] = distances[node] + 1
                queue = append(queue, neighbor)
            }
        }
    }

    return distances
}

func (hc *HarmonicCentrality) HarmonicCentrality(node int) float64 {
    if hc.adjacency[node] == nil {
        return 0.0
    }

    distances := hc.bfsDistances(node)
    sum := 0.0

    for target, dist := range distances {
        if target != node && dist > 0 {
            sum += 1.0 / float64(dist)
        }
    }

    return sum
}

func (hc *HarmonicCentrality) AllHarmonicCentralities() map[int]float64 {
    result := make(map[int]float64)

    for node := range hc.nodes {
        result[node] = hc.HarmonicCentrality(node)
    }

    return result
}

func (hc *HarmonicCentrality) TopKCentralNodes(k int) [][2]interface{} {
    centralities := hc.AllHarmonicCentralities()

    type pair struct {
        node  int
        score float64
    }

    pairs := []pair{}
    for node, score := range centralities {
        pairs = append(pairs, pair{node, score})
    }

    sort.Slice(pairs, func(i, j int) bool {
        return pairs[i].score > pairs[j].score
    })

    if k > len(pairs) {
        k = len(pairs)
    }

    result := [][2]interface{}{}
    for i := 0; i < k; i++ {
        result = append(result, [2]interface{}{pairs[i].node, pairs[i].score})
    }

    return result
}