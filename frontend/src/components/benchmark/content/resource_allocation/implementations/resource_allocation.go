package main

import (
    "sort"
)

type ResourceAllocation struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewResourceAllocation() *ResourceAllocation {
    return &ResourceAllocation{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (ra *ResourceAllocation) AddEdge(u, v int) {
    if ra.adjacency[u] == nil {
        ra.adjacency[u] = make(map[int]bool)
    }
    if ra.adjacency[v] == nil {
        ra.adjacency[v] = make(map[int]bool)
    }
    ra.adjacency[u][v] = true
    ra.adjacency[v][u] = true
    ra.nodes[u] = true
    ra.nodes[v] = true
}

func (ra *ResourceAllocation) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        ra.AddEdge(edge[0], edge[1])
    }
}

func (ra *ResourceAllocation) ResourceAllocationScore(u, v int) float64 {
    if ra.adjacency[u] == nil || ra.adjacency[v] == nil {
        return 0.0
    }

    score := 0.0
    for node := range ra.adjacency[u] {
        if ra.adjacency[v][node] {
            degree := len(ra.adjacency[node])
            if degree > 0 {
                score += 1.0 / float64(degree)
            }
        }
    }
    return score
}

func (ra *ResourceAllocation) ScoreAllPairs() [][3]interface{} {
    var scores [][3]interface{}
    var nodeList []int
    for node := range ra.nodes {
        nodeList = append(nodeList, node)
    }

    for i := 0; i < len(nodeList); i++ {
        for j := i + 1; j < len(nodeList); j++ {
            u := nodeList[i]
            v := nodeList[j]
            score := ra.ResourceAllocationScore(u, v)
            if score > 0 {
                scores = append(scores, [3]interface{}{u, v, score})
            }
        }
    }

    sort.Slice(scores, func(i, j int) bool {
        return scores[i][2].(float64) > scores[j][2].(float64)
    })

    return scores
}

func (ra *ResourceAllocation) TopKPredictions(k int) [][3]interface{} {
    scores := ra.ScoreAllPairs()
    if k > len(scores) {
        k = len(scores)
    }
    return scores[:k]
}