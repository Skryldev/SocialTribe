package main

type ClusteringCoefficient struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewClusteringCoefficient() *ClusteringCoefficient {
    return &ClusteringCoefficient{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (cc *ClusteringCoefficient) AddEdge(u, v int) {
    if cc.adjacency[u] == nil {
        cc.adjacency[u] = make(map[int]bool)
    }
    if cc.adjacency[v] == nil {
        cc.adjacency[v] = make(map[int]bool)
    }
    cc.adjacency[u][v] = true
    cc.adjacency[v][u] = true
    cc.nodes[u] = true
    cc.nodes[v] = true
}

func (cc *ClusteringCoefficient) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        cc.AddEdge(edge[0], edge[1])
    }
}

func (cc *ClusteringCoefficient) LocalClusteringCoefficient(node int) float64 {
    if cc.adjacency[node] == nil {
        return 0.0
    }

    neighbors := cc.adjacency[node]
    degree := len(neighbors)

    if degree < 2 {
        return 0.0
    }

    triangles := 0
    neighborList := []int{}
    for neighbor := range neighbors {
        neighborList = append(neighborList, neighbor)
    }

    for i := 0; i < len(neighborList); i++ {
        for j := i + 1; j < len(neighborList); j++ {
            u := neighborList[i]
            v := neighborList[j]
            if cc.adjacency[u][v] {
                triangles++
            }
        }
    }

    maxPossible := degree * (degree - 1) / 2
    return float64(triangles) / float64(maxPossible)
}

func (cc *ClusteringCoefficient) AllLocalClusteringCoefficients() map[int]float64 {
    result := make(map[int]float64)
    for node := range cc.nodes {
        result[node] = cc.LocalClusteringCoefficient(node)
    }
    return result
}

func (cc *ClusteringCoefficient) AverageClusteringCoefficient() float64 {
    if len(cc.nodes) == 0 {
        return 0.0
    }

    total := 0.0
    for node := range cc.nodes {
        total += cc.LocalClusteringCoefficient(node)
    }
    return total / float64(len(cc.nodes))
}

func (cc *ClusteringCoefficient) GlobalClusteringCoefficient() float64 {
    triangles := 0
    triplets := 0

    for node := range cc.nodes {
        degree := len(cc.adjacency[node])
        if degree >= 2 {
            triplets += degree * (degree - 1) / 2
        }

        neighborList := []int{}
        for neighbor := range cc.adjacency[node] {
            neighborList = append(neighborList, neighbor)
        }

        for i := 0; i < len(neighborList); i++ {
            for j := i + 1; j < len(neighborList); j++ {
                u := neighborList[i]
                v := neighborList[j]
                if cc.adjacency[u][v] {
                    triangles++
                }
            }
        }
    }

    if triplets == 0 {
        return 0.0
    }

    return float64(triangles) / float64(triplets)
}