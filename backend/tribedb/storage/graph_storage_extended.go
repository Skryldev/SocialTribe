// graph_storage_extended.go
package storage

import (
	"sync"

	"tribedb/logger"
)

// EdgeIndex keeps track of edges per node (undirected graph)
type EdgeIndex struct {
	mu        sync.RWMutex
	nodeEdges map[string]map[string]bool // node -> set of neighbor nodes
	dirty     bool
}

// NewEdgeIndex creates a new edge index
func NewEdgeIndex() *EdgeIndex {
	return &EdgeIndex{
		nodeEdges: make(map[string]map[string]bool),
		dirty:     false,
	}
}

// AddEdge adds an edge to the index (undirected)
func (ei *EdgeIndex) AddEdge(src, dst string) {
	if src == "" || dst == "" || src == dst {
		logger.WarnFields("edge_index", "AddEdge SKIPPED — invalid args",
			logger.String("src", src),
			logger.String("dst", dst),
			logger.Bool("src_empty", src == ""),
			logger.Bool("dst_empty", dst == ""),
			logger.Bool("src_eq_dst", src == dst),
		)
		return
	}

	ei.mu.Lock()
	defer ei.mu.Unlock()

	// Add to source's neighbors
	if _, ok := ei.nodeEdges[src]; !ok {
		ei.nodeEdges[src] = make(map[string]bool)
	}
	ei.nodeEdges[src][dst] = true

	// Add to target's neighbors (undirected)
	if _, ok := ei.nodeEdges[dst]; !ok {
		ei.nodeEdges[dst] = make(map[string]bool)
	}
	ei.nodeEdges[dst][src] = true

	ei.dirty = true

	logger.DebugFields("edge_index", "AddEdge OK",
		logger.String("src", src),
		logger.String("dst", dst),
		logger.Int("total_nodes_in_index", len(ei.nodeEdges)),
		logger.Int("total_refs_in_index", ei.totalRefsLocked()),
	)
}

// totalRefsLocked returns total neighbor references (caller must hold lock)
func (ei *EdgeIndex) totalRefsLocked() int {
	count := 0
	for _, neighbors := range ei.nodeEdges {
		count += len(neighbors)
	}
	return count
}

// RemoveEdge removes an edge from the index (undirected)
func (ei *EdgeIndex) RemoveEdge(src, dst string) {
	if src == "" || dst == "" || src == dst {
		return
	}

	ei.mu.Lock()
	defer ei.mu.Unlock()

	if neighbors, ok := ei.nodeEdges[src]; ok {
		delete(neighbors, dst)
		if len(neighbors) == 0 {
			delete(ei.nodeEdges, src)
		}
	}

	if neighbors, ok := ei.nodeEdges[dst]; ok {
		delete(neighbors, src)
		if len(neighbors) == 0 {
			delete(ei.nodeEdges, dst)
		}
	}

	ei.dirty = true
}

// GetNeighbors returns all neighbors of a node
func (ei *EdgeIndex) GetNeighbors(node string) []string {
	if node == "" {
		return []string{}
	}

	ei.mu.RLock()
	defer ei.mu.RUnlock()

	if neighbors, ok := ei.nodeEdges[node]; ok {
		result := make([]string, 0, len(neighbors))
		for neighbor := range neighbors {
			result = append(result, neighbor)
		}
		return result
	}
	return []string{}
}

// GetNeighborCount returns the number of neighbors of a node
func (ei *EdgeIndex) GetNeighborCount(node string) int {
	if node == "" {
		return 0
	}

	ei.mu.RLock()
	defer ei.mu.RUnlock()

	if neighbors, ok := ei.nodeEdges[node]; ok {
		return len(neighbors)
	}
	return 0
}

// HasNeighbor checks if two nodes are connected
func (ei *EdgeIndex) HasNeighbor(src, dst string) bool {
	if src == "" || dst == "" || src == dst {
		return false
	}

	ei.mu.RLock()
	defer ei.mu.RUnlock()

	if neighbors, ok := ei.nodeEdges[src]; ok {
		return neighbors[dst]
	}
	return false
}

// Clear rebuilds the index from scratch
func (ei *EdgeIndex) Clear() {
	ei.mu.Lock()
	defer ei.mu.Unlock()
	ei.nodeEdges = make(map[string]map[string]bool)
	ei.dirty = true
}

// GetNodeCount returns the number of nodes in the index
func (ei *EdgeIndex) GetNodeCount() int {
	ei.mu.RLock()
	defer ei.mu.RUnlock()
	return len(ei.nodeEdges)
}

// GetEdgeCount returns the total number of edges in the index
func (ei *EdgeIndex) GetEdgeCount() int {
	ei.mu.RLock()
	defer ei.mu.RUnlock()

	count := 0
	for _, neighbors := range ei.nodeEdges {
		count += len(neighbors)
	}
	return count / 2
}

// IsDirty returns true if the index has been modified
func (ei *EdgeIndex) IsDirty() bool {
	ei.mu.RLock()
	defer ei.mu.RUnlock()
	return ei.dirty
}

// MarkClean marks the index as clean
func (ei *EdgeIndex) MarkClean() {
	ei.mu.Lock()
	defer ei.mu.Unlock()
	ei.dirty = false
}

// DebugState returns the full state of the edge index for debugging
func (ei *EdgeIndex) DebugState() map[string]interface{} {
	ei.mu.RLock()
	defer ei.mu.RUnlock()

	totalRefs := 0
	nodeSample := make(map[string][]string)
	count := 0

	for node, neighbors := range ei.nodeEdges {
		n := len(neighbors)
		totalRefs += n
		if count < 10 {
			neighList := make([]string, 0, n)
			for neigh := range neighbors {
				neighList = append(neighList, neigh)
			}
			nodeSample[node] = neighList
			count++
		}
	}

	return map[string]interface{}{
		"total_nodes_in_index": len(ei.nodeEdges),
		"total_refs_in_index":  totalRefs,
		"undirected_edges":     totalRefs / 2,
		"sample_nodes":         nodeSample,
	}
}
