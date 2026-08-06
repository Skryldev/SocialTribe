package main

import (
	"math"
	"sort"
)

type PageRank struct {
	adjacency map[int]map[int]bool
	nodes     map[int]bool
}

func NewPageRank() *PageRank {
	return &PageRank{
		adjacency: make(map[int]map[int]bool),
		nodes:     make(map[int]bool),
	}
}

func (pr *PageRank) AddEdge(u, v int) {
	if pr.adjacency[u] == nil {
		pr.adjacency[u] = make(map[int]bool)
	}
	pr.adjacency[u][v] = true
	pr.nodes[u] = true
	pr.nodes[v] = true
}

func (pr *PageRank) BuildFromEdges(edges [][2]int) {
	for _, edge := range edges {
		pr.AddEdge(edge[0], edge[1])
	}
}

func (pr *PageRank) PageRank(damping float64, maxIter int, tol float64) map[int]float64 {
	result := make(map[int]float64)
	n := len(pr.nodes)

	if n == 0 {
		return result
	}

	for node := range pr.nodes {
		result[node] = 1.0 / float64(n)
	}

	for iter := 0; iter < maxIter; iter++ {
		newResult := make(map[int]float64)
		diff := 0.0

		for node := range pr.nodes {
			rank := (1 - damping) / float64(n)

			for neighbor := range pr.nodes {
				if pr.adjacency[neighbor] != nil && pr.adjacency[neighbor][node] {
					outDegree := len(pr.adjacency[neighbor])
					if outDegree > 0 {
						rank += damping * (result[neighbor] / float64(outDegree))
					}
				}
			}

			newResult[node] = rank
			diff += math.Abs(newResult[node] - result[node])
		}

		result = newResult
		if diff < tol {
			break
		}
	}

	return result
}

func (pr *PageRank) TopKNodes(k int, damping float64) [][2]interface{} {
	ranks := pr.PageRank(damping, 100, 1e-6)

	type pair struct {
		node  int
		score float64
	}

	pairs := []pair{}
	for node, score := range ranks {
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