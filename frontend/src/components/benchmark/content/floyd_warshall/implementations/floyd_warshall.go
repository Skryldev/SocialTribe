package main

import (
    "math"
)

type FloydWarshall struct {
    nodes    map[int]map[int]bool
    dist     map[int]map[int]int
    nextNode map[int]map[int]int
}

func NewFloydWarshall() *FloydWarshall {
    return &FloydWarshall{
        nodes:    make(map[int]map[int]bool),
        dist:     make(map[int]map[int]int),
        nextNode: make(map[int]map[int]int),
    }
}

func (fw *FloydWarshall) AddEdge(u, v, weight int) {
    if fw.nodes[u] == nil {
        fw.nodes[u] = make(map[int]bool)
    }
    if fw.nodes[v] == nil {
        fw.nodes[v] = make(map[int]bool)
    }
    fw.nodes[u][v] = true
    fw.nodes[v][u] = true

    if fw.dist[u] == nil {
        fw.dist[u] = make(map[int]int)
    }
    if fw.dist[v] == nil {
        fw.dist[v] = make(map[int]int)
    }
    fw.dist[u][v] = weight
    fw.dist[v][u] = weight

    if fw.nextNode[u] == nil {
        fw.nextNode[u] = make(map[int]int)
    }
    if fw.nextNode[v] == nil {
        fw.nextNode[v] = make(map[int]int)
    }
    fw.nextNode[u][v] = v
    fw.nextNode[v][u] = u
}

func (fw *FloydWarshall) AddDirectedEdge(u, v, weight int) {
    if fw.nodes[u] == nil {
        fw.nodes[u] = make(map[int]bool)
    }
    if fw.nodes[v] == nil {
        fw.nodes[v] = make(map[int]bool)
    }
    fw.nodes[u][v] = true

    if fw.dist[u] == nil {
        fw.dist[u] = make(map[int]int)
    }
    if fw.dist[v] == nil {
        fw.dist[v] = make(map[int]int)
    }
    fw.dist[u][v] = weight

    if fw.nextNode[u] == nil {
        fw.nextNode[u] = make(map[int]int)
    }
    if fw.nextNode[v] == nil {
        fw.nextNode[v] = make(map[int]int)
    }
    fw.nextNode[u][v] = v
}

func (fw *FloydWarshall) BuildFromEdges(edges [][3]int, directed bool) {
    for _, edge := range edges {
        if directed {
            fw.AddDirectedEdge(edge[0], edge[1], edge[2])
        } else {
            fw.AddEdge(edge[0], edge[1], edge[2])
        }
    }
}

func (fw *FloydWarshall) getAllNodes() []int {
    result := []int{}
    for node := range fw.nodes {
        result = append(result, node)
    }
    return result
}

func (fw *FloydWarshall) initialize() {
    allNodes := fw.getAllNodes()

    for _, u := range allNodes {
        if fw.dist[u] == nil {
            fw.dist[u] = make(map[int]int)
        }
        if fw.nextNode[u] == nil {
            fw.nextNode[u] = make(map[int]int)
        }

        for _, v := range allNodes {
            if u == v {
                fw.dist[u][v] = 0
            } else if _, exists := fw.dist[u][v]; !exists {
                fw.dist[u][v] = math.MaxInt32
            }
        }
    }
}

func (fw *FloydWarshall) AllPairsShortestPaths() {
    fw.initialize()
    allNodes := fw.getAllNodes()

    for _, k := range allNodes {
        for _, i := range allNodes {
            for _, j := range allNodes {
                if fw.dist[i][k] != math.MaxInt32 && fw.dist[k][j] != math.MaxInt32 &&
                    fw.dist[i][k]+fw.dist[k][j] < fw.dist[i][j] {
                    fw.dist[i][j] = fw.dist[i][k] + fw.dist[k][j]
                    fw.nextNode[i][j] = fw.nextNode[i][k]
                }
            }
        }
    }
}

func (fw *FloydWarshall) ShortestPath(u, v int) int {
    if fw.dist[u] == nil || fw.dist[u][v] == 0 {
        return math.MaxInt32
    }
    return fw.dist[u][v]
}

func (fw *FloydWarshall) GetPath(u, v int) []int {
    if fw.nextNode[u] == nil || fw.nextNode[u][v] == 0 {
        return []int{}
    }

    path := []int{u}

    for u != v {
        u = fw.nextNode[u][v]
        path = append(path, u)
    }

    return path
}

func (fw *FloydWarshall) GetAllDistances() map[int]map[int]int {
    return fw.dist
}

func (fw *FloydWarshall) HasNegativeCycle() bool {
    allNodes := fw.getAllNodes()

    for _, i := range allNodes {
        if fw.dist[i][i] < 0 {
            return true
        }
    }
    return false
}