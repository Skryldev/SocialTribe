package main

import (
    "container/heap"
    "math"
)

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

type Dijkstra struct {
    adjacency map[int][][2]int
    nodes     map[int]bool
}

func NewDijkstra() *Dijkstra {
    return &Dijkstra{
        adjacency: make(map[int][][2]int),
        nodes:     make(map[int]bool),
    }
}

func (d *Dijkstra) AddEdge(u, v, weight int) {
    d.adjacency[u] = append(d.adjacency[u], [2]int{v, weight})
    d.adjacency[v] = append(d.adjacency[v], [2]int{u, weight})
    d.nodes[u] = true
    d.nodes[v] = true
}

func (d *Dijkstra) AddDirectedEdge(u, v, weight int) {
    d.adjacency[u] = append(d.adjacency[u], [2]int{v, weight})
    d.nodes[u] = true
    d.nodes[v] = true
}

func (d *Dijkstra) BuildFromEdges(edges [][3]int, directed bool) {
    for _, edge := range edges {
        if directed {
            d.AddDirectedEdge(edge[0], edge[1], edge[2])
        } else {
            d.AddEdge(edge[0], edge[1], edge[2])
        }
    }
}

func (d *Dijkstra) ShortestPath(source int) map[int]int {
    dist := make(map[int]int)
    for node := range d.nodes {
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

        for _, edge := range d.adjacency[u] {
            v := edge[0]
            w := edge[1]
            if dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
                heap.Push(pq, &Item{node: v, priority: dist[v]})
            }
        }
    }

    return dist
}

func (d *Dijkstra) ShortestPathWithPath(source, target int) []int {
    dist := make(map[int]int)
    parent := make(map[int]int)

    for node := range d.nodes {
        dist[node] = math.MaxInt32
    }
    dist[source] = 0
    parent[source] = -1

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

        if u == target {
            path := []int{}
            for u != -1 {
                path = append([]int{u}, path...)
                u = parent[u]
            }
            return path
        }

        for _, edge := range d.adjacency[u] {
            v := edge[0]
            w := edge[1]
            if dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
                parent[v] = u
                heap.Push(pq, &Item{node: v, priority: dist[v]})
            }
        }
    }

    return []int{}
}

func (d *Dijkstra) AllShortestPaths(source int) map[int][]int {
    paths := make(map[int][]int)
    dist := make(map[int]int)

    for node := range d.nodes {
        dist[node] = math.MaxInt32
    }
    dist[source] = 0
    paths[source] = []int{source}

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

        for _, edge := range d.adjacency[u] {
            v := edge[0]
            w := edge[1]
            if dist[u]+w < dist[v] {
                dist[v] = dist[u] + w
                paths[v] = append(paths[u], v)
                heap.Push(pq, &Item{node: v, priority: dist[v]})
            }
        }
    }

    return paths
}