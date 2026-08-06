package main

type BFS struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewBFS() *BFS {
    return &BFS{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (b *BFS) AddEdge(u, v int) {
    if b.adjacency[u] == nil {
        b.adjacency[u] = make(map[int]bool)
    }
    if b.adjacency[v] == nil {
        b.adjacency[v] = make(map[int]bool)
    }
    b.adjacency[u][v] = true
    b.adjacency[v][u] = true
    b.nodes[u] = true
    b.nodes[v] = true
}

func (b *BFS) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        b.AddEdge(edge[0], edge[1])
    }
}

func (b *BFS) Bfs(start int) map[int]int {
    distances := make(map[int]int)
    queue := []int{start}
    distances[start] = 0

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]

        for neighbor := range b.adjacency[node] {
            if _, exists := distances[neighbor]; !exists {
                distances[neighbor] = distances[node] + 1
                queue = append(queue, neighbor)
            }
        }
    }

    return distances
}

func (b *BFS) BfsPath(start, goal int) []int {
    parent := make(map[int]int)
    queue := []int{start}
    parent[start] = -1

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]

        if node == goal {
            path := []int{}
            for node != -1 {
                path = append([]int{node}, path...)
                node = parent[node]
            }
            return path
        }

        for neighbor := range b.adjacency[node] {
            if _, exists := parent[neighbor]; !exists {
                parent[neighbor] = node
                queue = append(queue, neighbor)
            }
        }
    }

    return []int{}
}

func (b *BFS) BfsOrder(start int) []int {
    order := []int{}
    visited := make(map[int]bool)
    queue := []int{start}
    visited[start] = true

    for len(queue) > 0 {
        node := queue[0]
        queue = queue[1:]
        order = append(order, node)

        for neighbor := range b.adjacency[node] {
            if !visited[neighbor] {
                visited[neighbor] = true
                queue = append(queue, neighbor)
            }
        }
    }

    return order
}

func (b *BFS) IsConnected() bool {
    if len(b.nodes) == 0 {
        return true
    }

    var start int
    for node := range b.nodes {
        start = node
        break
    }

    distances := b.Bfs(start)
    return len(distances) == len(b.nodes)
}