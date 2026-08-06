package main

import (
	"sort"
)

type ClosenessCentrality struct {
	adjacencyList map[int]map[int]bool
}

func NewClosenessCentrality() *ClosenessCentrality {
	return &ClosenessCentrality{
		adjacencyList: make(map[int]map[int]bool),
	}
}

func (cc *ClosenessCentrality) AddEdge(u, v int) {
	if cc.adjacencyList[u] == nil {
		cc.adjacencyList[u] = make(map[int]bool)
	}
	if cc.adjacencyList[v] == nil {
		cc.adjacencyList[v] = make(map[int]bool)
	}
	cc.adjacencyList[u][v] = true
	cc.adjacencyList[v][u] = true
}

func (cc *ClosenessCentrality) BuildFromEdges(edges [][2]int) {
	for _, edge := range edges {
		cc.AddEdge(edge[0], edge[1])
	}
}

func (cc *ClosenessCentrality) BfsDistances(start int) map[int]int {
	distances := make(map[int]int)
	queue := []int{start}
	distances[start] = 0

	for len(queue) > 0 {
		node := queue[0]
		queue = queue[1:]

		for neighbor := range cc.adjacencyList[node] {
			if _, exists := distances[neighbor]; !exists {
				distances[neighbor] = distances[node] + 1
				queue = append(queue, neighbor)
			}
		}
	}

	return distances
}

func (cc *ClosenessCentrality) ClosenessCentrality(node int) float64 {
	if cc.adjacencyList[node] == nil {
		return 0.0
	}

	distances := cc.BfsDistances(node)
	reachableNodes := len(distances) - 1

	if reachableNodes == 0 {
		return 0.0
	}

	totalDistance := 0
	for _, dist := range distances {
		totalDistance += dist
	}

	return float64(reachableNodes) / float64(totalDistance)
}

func (cc *ClosenessCentrality) AllClosenessCentralities() [][2]interface{} {
	result := make([][2]interface{}, 0)

	for node := range cc.adjacencyList {
		score := cc.ClosenessCentrality(node)
		result = append(result, [2]interface{}{node, score})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i][1].(float64) > result[j][1].(float64)
	})

	return result
}

func (cc *ClosenessCentrality) TopKCentralNodes(k int) [][2]interface{} {
	centralities := cc.AllClosenessCentralities()
	if k > len(centralities) {
		k = len(centralities)
	}
	return centralities[:k]
}

func (cc *ClosenessCentrality) NormalizedClosenessCentrality(node int) float64 {
	if cc.adjacencyList[node] == nil {
		return 0.0
	}

	distances := cc.BfsDistances(node)
	reachableNodes := len(distances) - 1
	totalNodes := len(cc.adjacencyList)

	if reachableNodes == 0 || totalNodes <= 1 {
		return 0.0
	}

	totalDistance := 0
	for _, dist := range distances {
		totalDistance += dist
	}

	return (float64(reachableNodes) / float64(totalDistance)) * (float64(totalNodes-1) / float64(reachableNodes))
}