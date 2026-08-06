package main

import (
    "sort"
)

type Edge struct {
    U, V int
}

type GirvanNewman struct {
    adjacency       map[int]map[int]bool
    nodes           map[int]bool
    edgeBetweenness map[Edge]float64
    communities     [][]int
}

func NewGirvanNewman() *GirvanNewman {
    return &GirvanNewman{
        adjacency:       make(map[int]map[int]bool),
        nodes:           make(map[int]bool),
        edgeBetweenness: make(map[Edge]float64),
        communities:     [][]int{},
    }
}

func (gn *GirvanNewman) AddEdge(u, v int) {
    if gn.adjacency[u] == nil {
        gn.adjacency[u] = make(map[int]bool)
    }
    if gn.adjacency[v] == nil {
        gn.adjacency[v] = make(map[int]bool)
    }
    gn.adjacency[u][v] = true
    gn.adjacency[v][u] = true
    gn.nodes[u] = true
    gn.nodes[v] = true
}

func (gn *GirvanNewman) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        gn.AddEdge(edge[0], edge[1])
    }
}

func (gn *GirvanNewman) bfsDistances(start int) (map[int]int, map[int][]int) {
    dist := make(map[int]int)
    predecessors := make(map[int][]int)
    queue := []int{start}

    dist[start] = 0

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]

        for neighbor := range gn.adjacency[node] {
            if _, exists := dist[neighbor]; !exists {
                dist[neighbor] = dist[node] + 1
                queue = append(queue, neighbor)
            }
            if dist[neighbor] == dist[node]+1 {
                predecessors[neighbor] = append(predecessors[neighbor], node)
            }
        }
    }

    return dist, predecessors
}

func (gn *GirvanNewman) computeEdgeBetweenness() {
    gn.edgeBetweenness = make(map[Edge]float64)

    for u := range gn.adjacency {
        for v := range gn.adjacency[u] {
            if u < v {
                gn.edgeBetweenness[Edge{u, v}] = 0.0
            }
        }
    }

    for source := range gn.nodes {
        dist, predecessors := gn.bfsDistances(source)

        dependency := make(map[int]float64)
        for node := range gn.nodes {
            dependency[node] = 0.0
        }

        var sortedNodes []int
        for node := range dist {
            sortedNodes = append(sortedNodes, node)
        }
        sort.Slice(sortedNodes, func(i, j int) bool {
            return dist[sortedNodes[i]] > dist[sortedNodes[j]]
        })

        for _, node := range sortedNodes {
            if preds, exists := predecessors[node]; exists {
                for _, pred := range preds {
                    contrib := (1.0 + dependency[node]) / float64(len(preds))
                    dependency[pred] += contrib
                }
            }
        }

        for _, node := range sortedNodes {
            if preds, exists := predecessors[node]; exists {
                for _, pred := range preds {
                    edge := Edge{pred, node}
                    if pred < node {
                        edge = Edge{pred, node}
                    } else {
                        edge = Edge{node, pred}
                    }
                    gn.edgeBetweenness[edge] += dependency[node] / float64(len(preds))
                }
            }
        }
    }

    for edge := range gn.edgeBetweenness {
        gn.edgeBetweenness[edge] /= 2.0
    }
}

func (gn *GirvanNewman) removeEdgeWithMaxBetweenness() {
    var maxEdge Edge
    maxBetweenness := -1.0

    for edge, betweenness := range gn.edgeBetweenness {
        if betweenness > maxBetweenness {
            maxBetweenness = betweenness
            maxEdge = edge
        }
    }

    delete(gn.adjacency[maxEdge.U], maxEdge.V)
    delete(gn.adjacency[maxEdge.V], maxEdge.U)
}

func (gn *GirvanNewman) findComponents() [][]int {
    var components [][]int
    visited := make(map[int]bool)

    for node := range gn.nodes {
        if visited[node] {
            continue
        }

        component := []int{}
        queue := []int{node}
        visited[node] = true

        for len(queue) > 0 {
            current := queue[0]
            queue = queue[1:]
            component = append(component, current)

            for neighbor := range gn.adjacency[current] {
                if !visited[neighbor] {
                    visited[neighbor] = true
                    queue = append(queue, neighbor)
                }
            }
        }

        if len(component) > 0 {
            components = append(components, component)
        }
    }

    return components
}

func (gn *GirvanNewman) modularity(communities [][]int) float64 {
    communityMap := make(map[int]int)
    for i, community := range communities {
        for _, node := range community {
            communityMap[node] = i
        }
    }

    m := 0.0
    for u := range gn.adjacency {
        m += float64(len(gn.adjacency[u]))
    }
    m /= 2.0

    degrees := make(map[int]float64)
    for node := range gn.nodes {
        degrees[node] = float64(len(gn.adjacency[node]))
    }

    Q := 0.0
    for u := range gn.adjacency {
        for v := range gn.adjacency[u] {
            if communityMap[u] == communityMap[v] {
                Q += 1.0 - (degrees[u] * degrees[v]) / (2.0 * m)
            }
        }
    }

    return Q / (2.0 * m)
}

func (gn *GirvanNewman) DetectCommunities(numCommunities int) [][]int {
    for {
        gn.computeEdgeBetweenness()
        gn.removeEdgeWithMaxBetweenness()

        currentComponents := gn.findComponents()
        if len(currentComponents) >= numCommunities {
            gn.communities = currentComponents
            break
        }

        if len(gn.adjacency) == 0 {
            break
        }
    }

    return gn.communities
}

func (gn *GirvanNewman) DetectCommunitiesByModularity() [][]int {
    var bestCommunities [][]int
    bestModularity := -1.0
    iterations := 0

    for {
        gn.computeEdgeBetweenness()
        gn.removeEdgeWithMaxBetweenness()

        currentComponents := gn.findComponents()
        currentModularity := gn.modularity(currentComponents)

        if currentModularity > bestModularity {
            bestModularity = currentModularity
            bestCommunities = currentComponents
        }

        if len(currentComponents) == 1 {
            break
        }

        iterations++
        if iterations > 1000 {
            break
        }
    }

    return bestCommunities
}