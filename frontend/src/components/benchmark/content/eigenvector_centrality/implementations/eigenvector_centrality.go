package main

import (
    "math"
    "sort"
)

type EigenvectorCentrality struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewEigenvectorCentrality() *EigenvectorCentrality {
    return &EigenvectorCentrality{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (ec *EigenvectorCentrality) AddEdge(u, v int) {
    if ec.adjacency[u] == nil {
        ec.adjacency[u] = make(map[int]bool)
    }
    if ec.adjacency[v] == nil {
        ec.adjacency[v] = make(map[int]bool)
    }
    ec.adjacency[u][v] = true
    ec.adjacency[v][u] = true
    ec.nodes[u] = true
    ec.nodes[v] = true
}

func (ec *EigenvectorCentrality) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        ec.AddEdge(edge[0], edge[1])
    }
}

func (ec *EigenvectorCentrality) EigenvectorCentrality(maxIter int, tol float64) map[int]float64 {
    centrality := make(map[int]float64)
    n := len(ec.nodes)

    for node := range ec.nodes {
        centrality[node] = 1.0 / float64(n)
    }

    for iter := 0; iter < maxIter; iter++ {
        newCentrality := make(map[int]float64)
        norm := 0.0

        for node := range ec.nodes {
            sum := 0.0
            for neighbor := range ec.adjacency[node] {
                sum += centrality[neighbor]
            }
            newCentrality[node] = sum
            norm += sum * sum
        }

        norm = math.Sqrt(norm)
        diff := 0.0

        for node := range ec.nodes {
            newCentrality[node] /= norm
            diff += math.Abs(newCentrality[node] - centrality[node])
        }

        centrality = newCentrality

        if diff < tol {
            break
        }
    }

    return centrality
}

func (ec *EigenvectorCentrality) TopKCentralNodes(k int, maxIter int, tol float64) [][2]interface{} {
    centrality := ec.EigenvectorCentrality(maxIter, tol)

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

func (ec *EigenvectorCentrality) NormalizedEigenvectorCentrality(maxIter int, tol float64) map[int]float64 {
    centrality := ec.EigenvectorCentrality(maxIter, tol)
    maxVal := 0.0

    for _, score := range centrality {
        if score > maxVal {
            maxVal = score
        }
    }

    if maxVal > 0 {
        for node := range centrality {
            centrality[node] /= maxVal
        }
    }

    return centrality
}