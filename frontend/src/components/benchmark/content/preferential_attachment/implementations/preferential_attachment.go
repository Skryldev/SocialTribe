package main

import (
    "sort"
)

type PreferentialAttachment struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewPreferentialAttachment() *PreferentialAttachment {
    return &PreferentialAttachment{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (pa *PreferentialAttachment) AddEdge(u, v int) {
    if pa.adjacency[u] == nil {
        pa.adjacency[u] = make(map[int]bool)
    }
    if pa.adjacency[v] == nil {
        pa.adjacency[v] = make(map[int]bool)
    }
    pa.adjacency[u][v] = true
    pa.adjacency[v][u] = true
    pa.nodes[u] = true
    pa.nodes[v] = true
}

func (pa *PreferentialAttachment) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        pa.AddEdge(edge[0], edge[1])
    }
}

func (pa *PreferentialAttachment) PreferentialAttachmentScore(u, v int) float64 {
    if pa.adjacency[u] == nil || pa.adjacency[v] == nil {
        return 0.0
    }
    return float64(len(pa.adjacency[u]) * len(pa.adjacency[v]))
}

func (pa *PreferentialAttachment) ScoreAllPairs() [][3]interface{} {
    var scores [][3]interface{}
    var nodeList []int
    for node := range pa.nodes {
        nodeList = append(nodeList, node)
    }

    for i := 0; i < len(nodeList); i++ {
        for j := i + 1; j < len(nodeList); j++ {
            u := nodeList[i]
            v := nodeList[j]
            score := pa.PreferentialAttachmentScore(u, v)
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

func (pa *PreferentialAttachment) TopKPredictions(k int) [][3]interface{} {
    scores := pa.ScoreAllPairs()
    if k > len(scores) {
        k = len(scores)
    }
    return scores[:k]
}