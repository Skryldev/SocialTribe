package main

type TriangleDetection struct {
    adjacencyList map[int]map[int]bool
}

func NewTriangleDetection() *TriangleDetection {
    return &TriangleDetection{
        adjacencyList: make(map[int]map[int]bool),
    }
}

func (td *TriangleDetection) AddEdge(u, v int) {
    if td.adjacencyList[u] == nil {
        td.adjacencyList[u] = make(map[int]bool)
    }
    if td.adjacencyList[v] == nil {
        td.adjacencyList[v] = make(map[int]bool)
    }
    td.adjacencyList[u][v] = true
    td.adjacencyList[v][u] = true
}

func (td *TriangleDetection) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        td.AddEdge(edge[0], edge[1])
    }
}

func (td *TriangleDetection) CountTriangles() int {
    count := 0
    for u, neighbors := range td.adjacencyList {
        for v := range neighbors {
            if v > u {
                for w := range neighbors {
                    if w > v && td.adjacencyList[v][w] {
                        count++
                    }
                }
            }
        }
    }
    return count
}

func (td *TriangleDetection) FindTriangles() [][3]int {
    triangles := make([][3]int, 0)
    for u, neighbors := range td.adjacencyList {
        for v := range neighbors {
            if v > u {
                for w := range neighbors {
                    if w > v && td.adjacencyList[v][w] {
                        triangles = append(triangles, [3]int{u, v, w})
                    }
                }
            }
        }
    }
    return triangles
}

func (td *TriangleDetection) HasTriangle() bool {
    for u, neighbors := range td.adjacencyList {
        for v := range neighbors {
            if v > u {
                for w := range neighbors {
                    if w > v && td.adjacencyList[v][w] {
                        return true
                    }
                }
            }
        }
    }
    return false
}