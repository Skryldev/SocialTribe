package main

import (
	"sort"
)

type BetweennessCentrality struct {
	adjacencyList map[int]map[int]bool
}

func NewBetweennessCentrality() *BetweennessCentrality {
	return &BetweennessCentrality{
		adjacencyList: make(map[int]map[int]bool),
	}
}

func (bc *BetweennessCentrality) AddEdge(u, v int) {
	if bc.adjacencyList[u] == nil {
		bc.adjacencyList[u] = make(map[int]bool)
	}
	if bc.adjacencyList[v] == nil {
		bc.adjacencyList[v] = make(map[int]bool)
	}
	bc.adjacencyList[u][v] = true
	bc.adjacencyList[v][u] = true
}

func (bc *BetweennessCentrality) BuildFromEdges(edges [][2]int) {
	for _, edge := range edges {
		bc.AddEdge(edge[0], edge[1])
	}
}

func (bc *BetweennessCentrality) BetweennessCentrality() map[int]float64 {
	centrality := make(map[int]float64)
	for node := range bc.adjacencyList {
		centrality[node] = 0.0
	}

	for s := range bc.adjacencyList {
		stack := []int{}
		pred := make(map[int][]int)
		dist := make(map[int]int)
		sigma := make(map[int]int)

		for node := range bc.adjacencyList {
			pred[node] = []int{}
			dist[node] = -1
			sigma[node] = 0
		}

		dist[s] = 0
		sigma[s] = 1
		queue := []int{s}

		for len(queue) > 0 {
			v := queue[0]
			queue = queue[1:]
			stack = append(stack, v)

			for w := range bc.adjacencyList[v] {
				if dist[w] < 0 {
					dist[w] = dist[v] + 1
					queue = append(queue, w)
				}
				if dist[w] == dist[v]+1 {
					sigma[w] += sigma[v]
					pred[w] = append(pred[w], v)
				}
			}
		}

		delta := make(map[int]float64)
		for node := range bc.adjacencyList {
			delta[node] = 0.0
		}

		for len(stack) > 0 {
			w := stack[len(stack)-1]
			stack = stack[:len(stack)-1]

			for _, v := range pred[w] {
				delta[v] += (float64(sigma[v]) / float64(sigma[w])) * (1 + delta[w])
			}

			if w != s {
				centrality[w] += delta[w]
			}
		}
	}

	return centrality
}

func (bc *BetweennessCentrality) TopKCentralNodes(k int) [][2]interface{} {
	centrality := bc.BetweennessCentrality()

	type pair struct {
		node  int
		score float64
	}

	pairs := []pair{}
	for node, score := range centrality {
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