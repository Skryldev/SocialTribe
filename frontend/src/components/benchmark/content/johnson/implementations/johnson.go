package main

import (
    "container/heap"
    "math"
)

type Edge struct {
    U, V, Weight int
}

type Item struct {
    node     int
    priority int
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

type Johnson struct {
    edges      []Edge
    adjacency  map[int]map[int]bool
    nodes      map[int]bool
}

func NewJohnson() *Johnson {
    return &Johnson{
        edges:     []Edge{},
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (j *Johnson) AddEdge(u, v, weight int) {
    j.edges = append(j.edges, Edge{U: u, V: v, Weight: weight})
    if j.adjacency[u] == nil {
        j.adjacency[u] = make(map[int]bool)
    }
    j.adjacency[u][v] = true
    j.nodes[u] = true
    j.nodes[v] = true
}

func (j *Johnson) BuildFromEdges(edgeList [][3]int) {
    for _, edge := range edgeList {
        j.AddEdge(edge[0], edge[1], edge[2])
    }
}

func (j *Johnson) bellmanFord(source int) map[int]int {
    dist := make(map[int]int)
    for node := range j.nodes {
        dist[node] = math.MaxInt32
    }
    dist[source] = 0

    for i := 0; i < len(j.nodes)-1; i++ {
        updated := false
        for _, edge := range j.edges {
            if dist[edge.U] != math.MaxInt32 && dist[edge.U]+edge.Weight < dist[edge.V] {
                dist[edge.V] = dist[edge.U] + edge.Weight
                updated = true
            }
        }
        if !updated {
            break
        }
    }

    for _, edge := range j.edges {
        if dist[edge.U] != math.MaxInt32 && dist[edge.U]+edge.Weight < dist[edge.V] {
            return nil
        }
    }

    return dist
}

func (j *Johnson) dijkstra(source int, h map[int]int) map[int]int {
    dist := make(map[int]int)
    for node := range j.nodes {
        dist[node] = math.MaxInt32
    }
    dist[source] = 0

    pq := &PriorityQueue{}
    heap.Init(pq)
    heap.Push(pq, &Item{node: source, priority: 0})

    for pq.Len() > 0 {
        item := heap.Pop(pq).(*Item)
        u := item.node
        d := item.priority

        if d != dist[u] {
            continue
        }

        for v := range j.adjacency[u] {
            weight := 0
            for _, edge := range j.edges {
                if edge.U == u && edge.V == v {
                    weight = edge.Weight
                    break
                }
            }
            newDist := dist[u] + weight + h[u] - h[v]
            if newDist < dist[v] {
                dist[v] = newDist
                heap.Push(pq, &Item{node: v, priority: dist[v]})
            }
        }
    }

    result := make(map[int]int)
    for node := range j.nodes {
        result[node] = dist[node] - h[source] + h[node]
    }
    return result
}

func (j *Johnson) AllPairsShortestPaths() map[int]map[int]int {
    maxNode := 0
    for node := range j.nodes {
        if node > maxNode {
            maxNode = node
        }
    }
    newNode := maxNode + 1

    for node := range j.nodes {
        j.AddEdge(newNode, node, 0)
    }

    h := j.bellmanFord(newNode)
    if h == nil {
        return nil
    }

    result := make(map[int]map[int]int)
    for node := range j.nodes {
        if node == newNode {
            continue
        }
        result[node] = j.dijkstra(node, h)
    }

    return result
}