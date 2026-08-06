package main

type KCoreDecomposition struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewKCoreDecomposition() *KCoreDecomposition {
    return &KCoreDecomposition{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (kc *KCoreDecomposition) AddEdge(u, v int) {
    if kc.adjacency[u] == nil {
        kc.adjacency[u] = make(map[int]bool)
    }
    if kc.adjacency[v] == nil {
        kc.adjacency[v] = make(map[int]bool)
    }
    kc.adjacency[u][v] = true
    kc.adjacency[v][u] = true
    kc.nodes[u] = true
    kc.nodes[v] = true
}

func (kc *KCoreDecomposition) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        kc.AddEdge(edge[0], edge[1])
    }
}

func (kc *KCoreDecomposition) KCoreDecomposition() map[int]int {
    core := make(map[int]int)
    degree := make(map[int]int)

    for node := range kc.nodes {
        degree[node] = len(kc.adjacency[node])
    }

    buckets := make([][]int, len(kc.nodes)+1)
    for i := range buckets {
        buckets[i] = []int{}
    }

    maxDegree := 0
    for node := range kc.nodes {
        buckets[degree[node]] = append(buckets[degree[node]], node)
        if degree[node] > maxDegree {
            maxDegree = degree[node]
        }
    }

    removed := make(map[int]bool)
    k := 0

    for i := 0; i <= maxDegree; i++ {
        for _, node := range buckets[i] {
            if removed[node] {
                continue
            }

            if i > k {
                k = i
            }
            core[node] = k
            removed[node] = true

            for neighbor := range kc.adjacency[node] {
                if !removed[neighbor] {
                    degree[neighbor]--
                    if degree[neighbor] <= i {
                        buckets[degree[neighbor]] = append(buckets[degree[neighbor]], neighbor)
                    }
                }
            }
        }
    }

    for node := range kc.nodes {
        if _, exists := core[node]; !exists {
            core[node] = 0
        }
    }

    return core
}

func (kc *KCoreDecomposition) GetKCore(k int) []int {
    core := kc.KCoreDecomposition()
    result := []int{}

    for node := range kc.nodes {
        if core[node] >= k {
            result = append(result, node)
        }
    }

    return result
}