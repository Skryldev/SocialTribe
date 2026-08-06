package main

import (
    "math/rand"
    "time"
)

type Leiden struct {
    adjacency  map[int]map[int]bool
    nodes      map[int]bool
    communities map[int]int
    weights    map[[2]int]float64
    m          float64
}

func NewLeiden() *Leiden {
    return &Leiden{
        adjacency:  make(map[int]map[int]bool),
        nodes:      make(map[int]bool),
        communities: make(map[int]int),
        weights:    make(map[[2]int]float64),
        m:          0.0,
    }
}

func (l *Leiden) AddEdge(u, v int, weight float64) {
    if l.adjacency[u] == nil {
        l.adjacency[u] = make(map[int]bool)
    }
    if l.adjacency[v] == nil {
        l.adjacency[v] = make(map[int]bool)
    }

    l.adjacency[u][v] = true
    l.adjacency[v][u] = true

    l.nodes[u] = true
    l.nodes[v] = true

    if u > v {
        u, v = v, u
    }
    l.weights[[2]int{u, v}] += weight
    l.m += weight
}

func (l *Leiden) BuildFromEdges(edges [][2]int) {
    for _, edge := range edges {
        l.AddEdge(edge[0], edge[1], 1.0)
    }
}

func (l *Leiden) degree(node int) float64 {
    deg := 0.0
    for neighbor := range l.adjacency[node] {
        u, v := node, neighbor
        if u > v {
            u, v = v, u
        }
        deg += l.weights[[2]int{u, v}]
    }
    return deg
}

func (l *Leiden) weight(u, v int) float64 {
    if u > v {
        u, v = v, u
    }
    return l.weights[[2]int{u, v}]
}

func (l *Leiden) communityDegree(node, community int) float64 {
    deg := 0.0
    for neighbor := range l.adjacency[node] {
        if l.communities[neighbor] == community {
            deg += l.weight(node, neighbor)
        }
    }
    return deg
}

func (l *Leiden) totalDegree(community int) float64 {
    total := 0.0
    for node := range l.nodes {
        if l.communities[node] == community {
            total += l.degree(node)
        }
    }
    return total
}

func (l *Leiden) modularityGain(node, community int) float64 {
    ki := l.degree(node)
    kic := l.communityDegree(node, community)
    total := l.totalDegree(community)
    return (kic - (total*ki)/(2*l.m)) / l.m
}

func (l *Leiden) initializeCommunities() {
    for node := range l.nodes {
        l.communities[node] = node
    }
}

func (l *Leiden) refinePartition() bool {
    changed := false
    nodeList := make([]int, 0, len(l.nodes))
    for node := range l.nodes {
        nodeList = append(nodeList, node)
    }

    rand.Seed(time.Now().UnixNano())
    rand.Shuffle(len(nodeList), func(i, j int) {
        nodeList[i], nodeList[j] = nodeList[j], nodeList[i]
    })

    for _, node := range nodeList {
        currentCommunity := l.communities[node]
        bestCommunity := currentCommunity
        bestGain := 0.0

        communitiesSeen := make(map[int]bool)
        for neighbor := range l.adjacency[node] {
            community := l.communities[neighbor]
            if communitiesSeen[community] {
                continue
            }
            communitiesSeen[community] = true

            if community == currentCommunity {
                continue
            }

            gain := l.modularityGain(node, community)
            if gain > bestGain {
                bestGain = gain
                bestCommunity = community
            }
        }

        if bestCommunity != currentCommunity {
            l.communities[node] = bestCommunity
            changed = true
        }
    }

    return changed
}

func (l *Leiden) aggregateNetwork() {
    newAdjacency := make(map[int]map[int]bool)
    newNodes := make(map[int]bool)
    newWeights := make(map[[2]int]float64)
    newM := 0.0

    communityMap := make(map[int]int)
    nextId := 0
    communitySet := make(map[int]bool)
    for _, community := range l.communities {
        if !communitySet[community] {
            communitySet[community] = true
            communityMap[community] = nextId
            nextId++
        }
    }

    for node, community := range l.communities {
        newCommunity := communityMap[community]
        if newAdjacency[newCommunity] == nil {
            newAdjacency[newCommunity] = make(map[int]bool)
        }
        newNodes[newCommunity] = true
    }

    for edge, weight := range l.weights {
        u := edge[0]
        v := edge[1]
        cu := communityMap[l.communities[u]]
        cv := communityMap[l.communities[v]]

        if cu == cv {
            newM += weight
            continue
        }

        if cu > cv {
            cu, cv = cv, cu
        }
        newWeights[[2]int{cu, cv}] += weight
        if newAdjacency[cu] == nil {
            newAdjacency[cu] = make(map[int]bool)
        }
        if newAdjacency[cv] == nil {
            newAdjacency[cv] = make(map[int]bool)
        }
        newAdjacency[cu][cv] = true
        newAdjacency[cv][cu] = true
        newM += weight
    }

    for community := range newNodes {
        if newAdjacency[community] == nil {
            newAdjacency[community] = make(map[int]bool)
        }
    }

    l.adjacency = newAdjacency
    l.nodes = newNodes
    l.weights = newWeights
    l.m = newM

    newCommunities := make(map[int]int)
    for node, community := range l.communities {
        newCommunities[node] = communityMap[community]
    }
    l.communities = newCommunities
}

func (l *Leiden) fastLocalMove() bool {
    changed := false
    nodeList := make([]int, 0, len(l.nodes))
    for node := range l.nodes {
        nodeList = append(nodeList, node)
    }

    rand.Seed(time.Now().UnixNano())
    rand.Shuffle(len(nodeList), func(i, j int) {
        nodeList[i], nodeList[j] = nodeList[j], nodeList[i]
    })

    for _, node := range nodeList {
        bestCommunity := l.communities[node]
        bestGain := 0.0

        for neighbor := range l.adjacency[node] {
            community := l.communities[neighbor]
            if community == l.communities[node] {
                continue
            }
            gain := l.modularityGain(node, community)
            if gain > bestGain {
                bestGain = gain
                bestCommunity = community
            }
        }

        if bestCommunity != l.communities[node] {
            l.communities[node] = bestCommunity
            changed = true
        }
    }

    return changed
}

func (l *Leiden) DetectCommunities() map[int]int {
    l.initializeCommunities()

    for {
        improved := false

        for l.refinePartition() {
            improved = true
        }

        if !improved {
            break
        }

        for l.fastLocalMove() {
            improved = true
        }

        if !improved {
            break
        }

        l.aggregateNetwork()
    }

    return l.communities
}