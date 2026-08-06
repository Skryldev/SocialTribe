package main

import (
    "sort"
)

type JaccardSimilarity struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewJaccardSimilarity() *JaccardSimilarity {
    return &JaccardSimilarity{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (js *JaccardSimilarity) AddEdge(u, v int) {
    if js.adjacency[u] == nil {
        js.adjacency[u] = make(map[int]bool)
    }
    if js.adjacency[v] == nil {
        js.adjacency[v] = make(map[int]bool)
    }
    js.adjacency[u][v] = true
    js.adjacency[v][u] = true
    js.nodes[u] = true
    js.nodes[v] = true
}

func (js *JaccardSimilarity) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        js.AddEdge(edge[0], edge[1])
    }
}

func (js *JaccardSimilarity) JaccardSimilarity(u, v int) float64 {
    if js.adjacency[u] == nil || js.adjacency[v] == nil {
        return 0.0
    }

    neighborsU := js.adjacency[u]
    neighborsV := js.adjacency[v]

    intersection := 0
    for node := range neighborsU {
        if neighborsV[node] {
            intersection++
        }
    }

    unionSize := len(neighborsU) + len(neighborsV) - intersection
    if unionSize == 0 {
        return 0.0
    }

    return float64(intersection) / float64(unionSize)
}

func (js *JaccardSimilarity) ScoreAllPairs() [][3]interface{} {
    var scores [][3]interface{}
    var nodeList []int
    for node := range js.nodes {
        nodeList = append(nodeList, node)
    }

    for i := 0; i < len(nodeList); i++ {
        for j := i + 1; j < len(nodeList); j++ {
            u := nodeList[i]
            v := nodeList[j]
            score := js.JaccardSimilarity(u, v)
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

func (js *JaccardSimilarity) TopKPredictions(k int) [][3]interface{} {
    scores := js.ScoreAllPairs()
    if k > len(scores) {
        k = len(scores)
    }
    return scores[:k]
}