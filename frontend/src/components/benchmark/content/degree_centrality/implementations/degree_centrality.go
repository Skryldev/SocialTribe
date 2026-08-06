package main

import (
    "sort"
)

type DegreeCentrality struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewDegreeCentrality() *DegreeCentrality {
    return &DegreeCentrality{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (dc *DegreeCentrality) AddEdge(u, v int) {
    if dc.adjacency[u] == nil {
        dc.adjacency[u] = make(map[int]bool)
    }
    if dc.adjacency[v] == nil {
        dc.adjacency[v] = make(map[int]bool)
    }
    dc.adjacency[u][v] = true
    dc.adjacency[v][u] = true
    dc.nodes[u] = true
    dc.nodes[v] = true
}

func (dc *DegreeCentrality) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        dc.AddEdge(edge[0], edge[1])
    }
}

func (dc *DegreeCentrality) DegreeCentrality(node int) int {
    if dc.adjacency[node] == nil {
        return 0
    }
    return len(dc.adjacency[node])
}

func (dc *DegreeCentrality) AllDegreeCentralities() map[int]int {
    result := make(map[int]int)
    for node := range dc.nodes {
        result[node] = dc.DegreeCentrality(node)
    }
    return result
}

func (dc *DegreeCentrality) TopKCentralNodes(k int) [][2]int {
    centralities := dc.AllDegreeCentralities()

    type pair struct {
        node  int
        score int
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

    result := [][2]int{}
    for i := 0; i < k; i++ {
        result = append(result, [2]int{pairs[i].node, pairs[i].score})
    }

    return result
}

func (dc *DegreeCentrality) NormalizedDegreeCentrality(node int) float64 {
    if dc.adjacency[node] == nil || len(dc.nodes) <= 1 {
        return 0.0
    }
    return float64(dc.DegreeCentrality(node)) / float64(len(dc.nodes)-1)
}

func (dc *DegreeCentrality) AllNormalizedDegreeCentralities() map[int]float64 {
    result := make(map[int]float64)
    for node := range dc.nodes {
        result[node] = dc.NormalizedDegreeCentrality(node)
    }
    return result
}