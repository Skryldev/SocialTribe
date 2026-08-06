package main

import (
	"math"
	"sort"
)

type AdamicAdar struct {
	adjacencyList map[int]map[int]bool
}

func NewAdamicAdar() *AdamicAdar {
	return &AdamicAdar{
		adjacencyList: make(map[int]map[int]bool),
	}
}

func (aa *AdamicAdar) AddEdge(u, v int) {
	if aa.adjacencyList[u] == nil {
		aa.adjacencyList[u] = make(map[int]bool)
	}
	if aa.adjacencyList[v] == nil {
		aa.adjacencyList[v] = make(map[int]bool)
	}
	aa.adjacencyList[u][v] = true
	aa.adjacencyList[v][u] = true
}

func (aa *AdamicAdar) BuildFromEdges(edges [][2]int) {
	for _, edge := range edges {
		aa.AddEdge(edge[0], edge[1])
	}
}

func (aa *AdamicAdar) AdamicAdarScore(u, v int) float64 {
	if aa.adjacencyList[u] == nil || aa.adjacencyList[v] == nil {
		return 0.0
	}

	score := 0.0
	for node := range aa.adjacencyList[u] {
		if aa.adjacencyList[v][node] {
			degree := len(aa.adjacencyList[node])
			if degree > 1 {
				score += 1.0 / math.Log(float64(degree))
			}
		}
	}
	return score
}

func (aa *AdamicAdar) ScoreAllPairs() [][3]interface{} {
	var scores [][3]interface{}
	nodes := make([]int, 0, len(aa.adjacencyList))

	for node := range aa.adjacencyList {
		nodes = append(nodes, node)
	}

	for i := 0; i < len(nodes); i++ {
		for j := i + 1; j < len(nodes); j++ {
			u := nodes[i]
			v := nodes[j]
			score := aa.AdamicAdarScore(u, v)
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

func (aa *AdamicAdar) TopKPredictions(k int) [][3]interface{} {
	scores := aa.ScoreAllPairs()
	if k > len(scores) {
		k = len(scores)
	}
	return scores[:k]
}