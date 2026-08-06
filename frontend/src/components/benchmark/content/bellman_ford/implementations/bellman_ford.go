package main

import (
	"math"
)

type Edge struct {
	U, V, Weight int
}

type BellmanFord struct {
	edges    []Edge
	vertices map[int]bool
}

func NewBellmanFord() *BellmanFord {
	return &BellmanFord{
		edges:    []Edge{},
		vertices: make(map[int]bool),
	}
}

func (bf *BellmanFord) AddEdge(u, v, weight int) {
	bf.edges = append(bf.edges, Edge{U: u, V: v, Weight: weight})
	bf.vertices[u] = true
	bf.vertices[v] = true
}

func (bf *BellmanFord) BuildFromEdges(edgeList [][3]int) {
	for _, edge := range edgeList {
		bf.AddEdge(edge[0], edge[1], edge[2])
	}
}

func (bf *BellmanFord) ShortestPath(source int) map[int]int {
	if !bf.vertices[source] {
		return nil
	}

	dist := make(map[int]int)
	for v := range bf.vertices {
		dist[v] = math.MaxInt32
	}
	dist[source] = 0

	for i := 0; i < len(bf.vertices)-1; i++ {
		updated := false
		for _, edge := range bf.edges {
			if dist[edge.U] != math.MaxInt32 && dist[edge.U]+edge.Weight < dist[edge.V] {
				dist[edge.V] = dist[edge.U] + edge.Weight
				updated = true
			}
		}
		if !updated {
			break
		}
	}

	for _, edge := range bf.edges {
		if dist[edge.U] != math.MaxInt32 && dist[edge.U]+edge.Weight < dist[edge.V] {
			return nil
		}
	}

	return dist
}

func (bf *BellmanFord) HasNegativeCycle() bool {
	var start int
	for v := range bf.vertices {
		start = v
		break
	}
	return bf.ShortestPath(start) == nil
}