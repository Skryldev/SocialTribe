package main

type DFS struct {
    adjacency map[int]map[int]bool
    nodes     map[int]bool
}

func NewDFS() *DFS {
    return &DFS{
        adjacency: make(map[int]map[int]bool),
        nodes:     make(map[int]bool),
    }
}

func (d *DFS) AddEdge(u, v int) {
    if d.adjacency[u] == nil {
        d.adjacency[u] = make(map[int]bool)
    }
    if d.adjacency[v] == nil {
        d.adjacency[v] = make(map[int]bool)
    }
    d.adjacency[u][v] = true
    d.adjacency[v][u] = true
    d.nodes[u] = true
    d.nodes[v] = true
}

func (d *DFS) AddDirectedEdge(u, v int) {
    if d.adjacency[u] == nil {
        d.adjacency[u] = make(map[int]bool)
    }
    if d.adjacency[v] == nil {
        d.adjacency[v] = make(map[int]bool)
    }
    d.adjacency[u][v] = true
    d.nodes[u] = true
    d.nodes[v] = true
}

func (d *DFS) BuildFromEdges(edges [][2]int, directed bool) {
    for _, edge := range edges {
        if directed {
            d.AddDirectedEdge(edge[0], edge[1])
        } else {
            d.AddEdge(edge[0], edge[1])
        }
    }
}

func (d *DFS) dfsRecursive(node int, visited map[int]bool, order *[]int) {
    visited[node] = true
    *order = append(*order, node)

    for neighbor := range d.adjacency[node] {
        if !visited[neighbor] {
            d.dfsRecursive(neighbor, visited, order)
        }
    }
}

func (d *DFS) DfsRecursive(start int) []int {
    order := []int{}
    visited := make(map[int]bool)
    d.dfsRecursive(start, visited, &order)
    return order
}

func (d *DFS) DfsIterative(start int) []int {
    order := []int{}
    visited := make(map[int]bool)
    stack := []int{start}

    for len(stack) > 0 {
        node := stack[len(stack)-1]
        stack = stack[:len(stack)-1]

        if visited[node] {
            continue
        }

        visited[node] = true
        order = append(order, node)

        for neighbor := range d.adjacency[node] {
            if !visited[neighbor] {
                stack = append(stack, neighbor)
            }
        }
    }

    return order
}

func (d *DFS) DfsPath(start, goal int) []int {
    parent := make(map[int]int)
    visited := make(map[int]bool)
    stack := []int{start}
    parent[start] = -1

    for len(stack) > 0 {
        node := stack[len(stack)-1]
        stack = stack[:len(stack)-1]

        if visited[node] {
            continue
        }
        visited[node] = true

        if node == goal {
            path := []int{}
            for node != -1 {
                path = append([]int{node}, path...)
                node = parent[node]
            }
            return path
        }

        for neighbor := range d.adjacency[node] {
            if !visited[neighbor] {
                parent[neighbor] = node
                stack = append(stack, neighbor)
            }
        }
    }

    return []int{}
}

func (d *DFS) FindComponents() [][]int {
    components := [][]int{}
    visited := make(map[int]bool)

    for node := range d.nodes {
        if !visited[node] {
            component := []int{}
            d.dfsRecursive(node, visited, &component)
            components = append(components, component)
        }
    }

    return components
}

func (d *DFS) IsConnected() bool {
    if len(d.nodes) == 0 {
        return true
    }

    var start int
    for node := range d.nodes {
        start = node
        break
    }

    visited := make(map[int]bool)
    order := []int{}
    d.dfsRecursive(start, visited, &order)

    return len(visited) == len(d.nodes)
}

func (d *DFS) HasCycle() bool {
    visited := make(map[int]bool)
    recStack := make(map[int]bool)

    for node := range d.nodes {
        if !visited[node] {
            if d.hasCycleUtil(node, visited, recStack, -1) {
                return true
            }
        }
    }
    return false
}

func (d *DFS) hasCycleUtil(node int, visited, recStack map[int]bool, parent int) bool {
    visited[node] = true
    recStack[node] = true

    for neighbor := range d.adjacency[node] {
        if recStack[neighbor] && neighbor != parent {
            return true
        }

        if !visited[neighbor] {
            if d.hasCycleUtil(neighbor, visited, recStack, node) {
                return true
            }
        }
    }

    recStack[node] = false
    return false
}