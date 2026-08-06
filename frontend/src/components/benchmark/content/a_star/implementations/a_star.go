package main

import (
	"container/heap"
	"math"
)

type Item struct {
	value    int
	priority float64
	index    int
}

type PriorityQueue []*Item

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
	return pq[i].priority < pq[j].priority
}

func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*Item)
	item.index = n
	*pq = append(*pq, item)
}

func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	*pq = old[0 : n-1]
	return item
}

type AStar struct {
	graph map[int]map[int]bool
}

func NewAStar() *AStar {
	return &AStar{
		graph: make(map[int]map[int]bool),
	}
}

func (as *AStar) AddEdge(u, v int) {
	if as.graph[u] == nil {
		as.graph[u] = make(map[int]bool)
	}
	if as.graph[v] == nil {
		as.graph[v] = make(map[int]bool)
	}
	as.graph[u][v] = true
	as.graph[v][u] = true
}

func (as *AStar) BuildFromEdges(edges [][2]int) {
	for _, edge := range edges {
		as.AddEdge(edge[0], edge[1])
	}
}

func (as *AStar) Heuristic(node, goal int) float64 {
	return math.Abs(float64(node - goal))
}

func (as *AStar) Search(start, goal int) []int {
	if as.graph[start] == nil || as.graph[goal] == nil {
		return nil
	}

	pq := &PriorityQueue{}
	heap.Init(pq)
	heap.Push(pq, &Item{value: start, priority: 0})

	cameFrom := make(map[int]int)
	gScore := make(map[int]float64)
	fScore := make(map[int]float64)

	cameFrom[start] = start
	gScore[start] = 0
	fScore[start] = as.Heuristic(start, goal)

	for pq.Len() > 0 {
		current := heap.Pop(pq).(*Item).value

		if current == goal {
			path := []int{}
			for current != start {
				path = append([]int{current}, path...)
				current = cameFrom[current]
			}
			path = append([]int{start}, path...)
			return path
		}

		for neighbor := range as.graph[current] {
			tentativeG := gScore[current] + 1

			if _, exists := gScore[neighbor]; !exists || tentativeG < gScore[neighbor] {
				cameFrom[neighbor] = current
				gScore[neighbor] = tentativeG
				fScore[neighbor] = tentativeG + as.Heuristic(neighbor, goal)
				heap.Push(pq, &Item{value: neighbor, priority: fScore[neighbor]})
			}
		}
	}

	return nil
}