package main

type CommonNeighbors struct {
    adjacencyList map[int]map[int]bool
}

func NewCommonNeighbors() *CommonNeighbors {
    return &CommonNeighbors{
        adjacencyList: make(map[int]map[int]bool),
    }
}

func (cn *CommonNeighbors) AddEdge(u, v int) {
    if cn.adjacencyList[u] == nil {
        cn.adjacencyList[u] = make(map[int]bool)
    }
    if cn.adjacencyList[v] == nil {
        cn.adjacencyList[v] = make(map[int]bool)
    }
    cn.adjacencyList[u][v] = true
    cn.adjacencyList[v][u] = true
}

func (cn *CommonNeighbors) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        cn.AddEdge(edge[0], edge[1])
    }
}

func (cn *CommonNeighbors) CommonNeighbors(u, v int) map[int]bool {
    result := make(map[int]bool)
    
    if cn.adjacencyList[u] == nil || cn.adjacencyList[v] == nil {
        return result
    }
    
    for node := range cn.adjacencyList[u] {
        if cn.adjacencyList[v][node] {
            result[node] = true
        }
    }
    return result
}

func (cn *CommonNeighbors) CommonNeighborsCount(u, v int) int {
    return len(cn.CommonNeighbors(u, v))
}

func (cn *CommonNeighbors) PredictLink(u, v, threshold int) bool {
    return cn.CommonNeighborsCount(u, v) >= threshold
}

func (cn *CommonNeighbors) ScoreAllPairs() [][3]int {
    var scores [][3]int
    nodes := make([]int, 0, len(cn.adjacencyList))
    
    for node := range cn.adjacencyList {
        nodes = append(nodes, node)
    }
    
    for i := 0; i < len(nodes); i++ {
        for j := i + 1; j < len(nodes); j++ {
            u := nodes[i]
            v := nodes[j]
            count := cn.CommonNeighborsCount(u, v)
            if count > 0 {
                scores = append(scores, [3]int{u, v, count})
            }
        }
    }
    
    for i := 0; i < len(scores); i++ {
        for j := i + 1; j < len(scores); j++ {
            if scores[i][2] < scores[j][2] {
                scores[i], scores[j] = scores[j], scores[i]
            }
        }
    }
    
    return scores
}

func (cn *CommonNeighbors) TopKPredictions(k int) [][3]int {
    scores := cn.ScoreAllPairs()
    if k > len(scores) {
        k = len(scores)
    }
    return scores[:k]
}