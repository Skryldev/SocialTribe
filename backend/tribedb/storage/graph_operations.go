// graph_operations.go
package storage

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"tribedb/logger"
)

// ============================================
// 1. Degree Operations
// ============================================

// GetDegree returns the number of neighbors for a given node
func (c *CachedStorage) GetDegree(key string) (uint64, error) {
	if key == "" {
		return 0, errors.New("key cannot be empty")
	}

	if !c.ContainsNode(key) {
		logger.DebugFields("graph_ops", "Degree query — node not found",
			logger.String("key", key),
		)
		return 0, fmt.Errorf("node %s does not exist", key)
	}

	neighbors := c.Storage.edgeIndex.GetNeighbors(key)
	degree := uint64(len(neighbors))

	logger.DebugFields("graph_ops", "Degree retrieved",
		logger.String("key", key),
		logger.Uint64("degree", degree),
	)
	return degree, nil
}

// GetDegreeBatch returns degrees for multiple nodes
func (c *CachedStorage) GetDegreeBatch(keys []string) (map[string]uint64, error) {
	if len(keys) == 0 {
		return make(map[string]uint64), nil
	}

	logger.DebugFields("graph_ops", "Batch degree query start",
		logger.Int("node_count", len(keys)),
	)

	results := make(map[string]uint64)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(keys))

	for _, key := range keys {
		wg.Add(1)
		go func(k string) {
			defer wg.Done()
			degree, err := c.GetDegree(k)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errChan <- fmt.Errorf("error getting degree for %s: %w", k, err)
				return
			}
			results[k] = degree
		}(key)
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		firstErr := <-errChan
		logger.WarnFields("graph_ops", "Batch degree query had errors",
			logger.Int("total_keys", len(keys)),
			logger.Int("results", len(results)),
			logger.Err(firstErr),
		)
		return results, firstErr
	}

	logger.DebugFields("graph_ops", "Batch degree query completed",
		logger.Int("total_keys", len(keys)),
		logger.Int("results", len(results)),
	)
	return results, nil
}

// ============================================
// 2. Edge Existence Operations
// ============================================

// HasEdge checks if an edge exists between two nodes
func (c *CachedStorage) HasEdge(srcKey string, dstKey string) (bool, error) {
	if srcKey == "" || dstKey == "" {
		return false, errors.New("source and destination keys cannot be empty")
	}

	if !c.ContainsNode(srcKey) {
		return false, fmt.Errorf("source node %s does not exist", srcKey)
	}

	if !c.ContainsNode(dstKey) {
		return false, fmt.Errorf("destination node %s does not exist", dstKey)
	}

	exists := c.Storage.edgeIndex.HasNeighbor(srcKey, dstKey)

	logger.DebugFields("graph_ops", "Edge existence checked",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
		logger.Bool("exists", exists),
	)
	return exists, nil
}

// HasEdgeBatch checks multiple edges from a single source to multiple destinations
func (c *CachedStorage) HasEdgeBatch(srcKey string, dstKeys []string) (map[string]bool, error) {
	if srcKey == "" {
		return nil, errors.New("source key cannot be empty")
	}
	if len(dstKeys) == 0 {
		return make(map[string]bool), nil
	}

	if !c.ContainsNode(srcKey) {
		return nil, fmt.Errorf("source node %s does not exist", srcKey)
	}

	logger.DebugFields("graph_ops", "Batch edge existence check",
		logger.String("source", srcKey),
		logger.Int("destination_count", len(dstKeys)),
	)

	results := make(map[string]bool)
	for _, dstKey := range dstKeys {
		if dstKey == "" {
			results[dstKey] = false
			continue
		}
		if !c.ContainsNode(dstKey) {
			results[dstKey] = false
			continue
		}
		results[dstKey] = c.Storage.edgeIndex.HasNeighbor(srcKey, dstKey)
	}

	return results, nil
}

// ============================================
// 3. Edge Weight Operations
// ============================================

// GetEdgeWeight returns the weight of an edge between two nodes
func (c *CachedStorage) GetEdgeWeight(srcKey string, dstKey string) (int, error) {
	if srcKey == "" || dstKey == "" {
		return 0, errors.New("source and destination keys cannot be empty")
	}

	if !c.Storage.edgeIndex.HasNeighbor(srcKey, dstKey) {
		logger.DebugFields("graph_ops", "Edge not found for weight query",
			logger.String("source", srcKey),
			logger.String("destination", dstKey),
		)
		return 0, fmt.Errorf("edge %s->%s does not exist", srcKey, dstKey)
	}

	edgeKey := generateEdgeKey(srcKey, dstKey)

	edge, err := c.ReadEdgeByKey(edgeKey)
	if err != nil {
		logger.ErrorFields("graph_ops", "Failed to read edge for weight",
			logger.Err(err),
			logger.String("edge_key", edgeKey),
		)
		return 0, fmt.Errorf("error reading edge: %w", err)
	}

	if edge.IsDeleted() {
		logger.DebugFields("graph_ops", "Edge is deleted for weight query",
			logger.String("edge_key", edgeKey),
		)
		return 0, fmt.Errorf("edge %s->%s is deleted", srcKey, dstKey)
	}

	return edge.Data.Weight, nil
}

// GetEdgeWeightsBatch returns weights for multiple edges
func (c *CachedStorage) GetEdgeWeightsBatch(edges [][2]string) (map[[2]string]int, error) {
	if len(edges) == 0 {
		return make(map[[2]string]int), nil
	}

	logger.DebugFields("graph_ops", "Batch edge weight query",
		logger.Int("edge_count", len(edges)),
	)

	results := make(map[[2]string]int)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(edges))

	for _, edge := range edges {
		wg.Add(1)
		go func(src, dst string) {
			defer wg.Done()
			weight, err := c.GetEdgeWeight(src, dst)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				errChan <- fmt.Errorf("error getting weight for %s->%s: %w", src, dst, err)
				return
			}
			results[[2]string{src, dst}] = weight
		}(edge[0], edge[1])
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return results, <-errChan
	}
	return results, nil
}

// ============================================
// 4. Common Neighbors Operations
// ============================================

// GetCommonNeighbors returns nodes that are neighbors of both given nodes
func (c *CachedStorage) GetCommonNeighbors(srcKey string, dstKey string) ([]string, error) {
	if srcKey == "" || dstKey == "" {
		return nil, errors.New("source and destination keys cannot be empty")
	}

	if srcKey == dstKey {
		return nil, errors.New("source and destination keys cannot be the same")
	}

	if !c.ContainsNode(srcKey) {
		return nil, fmt.Errorf("source node %s does not exist", srcKey)
	}

	if !c.ContainsNode(dstKey) {
		return nil, fmt.Errorf("destination node %s does not exist", dstKey)
	}

	srcNeighbors := c.Storage.edgeIndex.GetNeighbors(srcKey)
	dstNeighbors := c.Storage.edgeIndex.GetNeighbors(dstKey)

	neighborMap := make(map[string]bool)
	for _, neighbor := range srcNeighbors {
		neighborMap[neighbor] = true
	}

	commonNeighbors := make([]string, 0)
	for _, neighbor := range dstNeighbors {
		if neighborMap[neighbor] {
			commonNeighbors = append(commonNeighbors, neighbor)
		}
	}

	sort.Strings(commonNeighbors)

	logger.DebugFields("graph_ops", "Common neighbors found",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
		logger.Int("common_count", len(commonNeighbors)),
	)
	return commonNeighbors, nil
}

// CountCommonNeighbors returns the number of common neighbors between two nodes
func (c *CachedStorage) CountCommonNeighbors(srcKey string, dstKey string) (uint64, error) {
	commonNeighbors, err := c.GetCommonNeighbors(srcKey, dstKey)
	if err != nil {
		return 0, err
	}
	return uint64(len(commonNeighbors)), nil
}

// ============================================
// 5. Neighbor Operations (✅ ENHANCED LOGGING)
// ============================================

// GetNeighbors returns all neighbors of a node
func (c *CachedStorage) GetNeighbors(key string) ([]string, error) {
	if key == "" {
		return nil, errors.New("key cannot be empty")
	}

	// ── Step 1: ContainsNode validation ───────────────────────────────
	containsStart := time.Now()
	if !c.ContainsNode(key) {
		logger.WarnFields("graph_ops", "GetNeighbors FAILED — ContainsNode returned false",
			logger.String("key", key),
			logger.Duration("contains_dur", time.Since(containsStart)),
		)
		return nil, fmt.Errorf("node %s does not exist", key)
	}
	containsDur := time.Since(containsStart)

	// ── Step 2: Cache lookup ──────────────────────────────────────────
	cacheKey := hashKey("neighbors_" + key)
	if val, ok := c.Cache.Peek(cacheKey); ok {
		if neighbors, ok := val.([]string); ok {
			c.Hits.Add(1)
			logger.DebugFields("graph_ops", "GetNeighbors CACHE HIT",
				logger.String("key", key),
				logger.Int("count", len(neighbors)),
			)
			return neighbors, nil
		}
	}
	c.Misses.Add(1)

	// ── Step 3: EdgeIndex lookup ──────────────────────────────────────
	edgeStart := time.Now()
	neighbors := c.Storage.edgeIndex.GetNeighbors(key)
	edgeDur := time.Since(edgeStart)
	sort.Strings(neighbors)

	// ── Step 4: Cache the result ──────────────────────────────────────
	c.Cache.Set(cacheKey, neighbors)

	logger.InfoFields("graph_ops", "GetNeighbors OK — retrieved from EdgeIndex",
		logger.String("key", key),
		logger.Int("neighbor_count", len(neighbors)),
		logger.Duration("contains_dur", containsDur),
		logger.Duration("edge_index_dur", edgeDur),
		logger.Strings("neighbors", truncateKeys(neighbors, 10)),
	)
	return neighbors, nil
}

// GetNeighborsBatch returns neighbors for multiple nodes
func (c *CachedStorage) GetNeighborsBatch(keys []string) (map[string][]string, error) {
	if len(keys) == 0 {
		return make(map[string][]string), nil
	}

	batchStart := time.Now()

	logger.InfoFields("graph_ops", "GetNeighborsBatch START",
		logger.Int("node_count", len(keys)),
		logger.Strings("keys_sample", truncateKeys(keys, 5)),
	)

	results := make(map[string][]string)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(keys))

	var successCount, failCount int
	var countMu sync.Mutex

	for _, key := range keys {
		wg.Add(1)
		go func(k string) {
			defer wg.Done()

			neighbors, err := c.GetNeighbors(k)

			mu.Lock()
			if err != nil {
				countMu.Lock()
				failCount++
				countMu.Unlock()
				errChan <- fmt.Errorf("%s: %w", k, err)
				mu.Unlock()
				return
			}
			results[k] = neighbors
			countMu.Lock()
			successCount++
			countMu.Unlock()
			mu.Unlock()
		}(key)
	}

	wg.Wait()
	close(errChan)

	batchDur := time.Since(batchStart)

	// Collect all errors
	var allErrs []string
	for e := range errChan {
		allErrs = append(allErrs, e.Error())
	}

	// Calculate totals
	totalRefs := 0
	for _, v := range results {
		totalRefs += len(v)
	}

	if len(allErrs) > 0 {
		logger.WarnFields("graph_ops", "GetNeighborsBatch COMPLETED WITH ERRORS",
			logger.Int("total_keys", len(keys)),
			logger.Int("success_count", successCount),
			logger.Int("fail_count", failCount),
			logger.Int("results_count", len(results)),
			logger.Int("total_refs", totalRefs),
			logger.Duration("batch_dur", batchDur),
			logger.Strings("errors", truncateKeys(allErrs, 10)),
		)
		return results, fmt.Errorf("%s", allErrs[0])
	}

	logger.InfoFields("graph_ops", "GetNeighborsBatch COMPLETED SUCCESSFULLY",
		logger.Int("total_keys", len(keys)),
		logger.Int("results_count", len(results)),
		logger.Int("total_refs", totalRefs),
		logger.Int("undirected_edges", totalRefs/2),
		logger.Duration("batch_dur", batchDur),
	)

	return results, nil
}

// GetOutgoingNeighbors returns only outgoing neighbors of a node
func (c *CachedStorage) GetOutgoingNeighbors(key string) ([]string, error) {
	return c.GetNeighbors(key)
}

// GetIncomingNeighbors returns only incoming neighbors of a node
func (c *CachedStorage) GetIncomingNeighbors(key string) ([]string, error) {
	return c.GetNeighbors(key)
}

// ============================================
// 6. Shortest Path Operations
// ============================================

// ShortestPath finds the shortest path between two nodes using BFS
func (c *CachedStorage) ShortestPath(srcKey string, dstKey string) ([]string, error) {
	if srcKey == "" || dstKey == "" {
		return nil, errors.New("source and destination keys cannot be empty")
	}

	if srcKey == dstKey {
		return []string{srcKey}, nil
	}

	if !c.ContainsNode(srcKey) {
		return nil, fmt.Errorf("source node %s does not exist", srcKey)
	}

	if !c.ContainsNode(dstKey) {
		return nil, fmt.Errorf("destination node %s does not exist", dstKey)
	}

	logger.DebugFields("graph_ops", "Finding shortest path",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
	)

	visited := make(map[string]bool)
	parent := make(map[string]string)
	queue := []string{srcKey}
	visited[srcKey] = true

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		neighbors := c.Storage.edgeIndex.GetNeighbors(current)

		for _, neighbor := range neighbors {
			if !visited[neighbor] {
				visited[neighbor] = true
				parent[neighbor] = current
				queue = append(queue, neighbor)

				if neighbor == dstKey {
					path := make([]string, 0)
					curr := dstKey
					for curr != srcKey {
						path = append([]string{curr}, path...)
						curr = parent[curr]
					}
					path = append([]string{srcKey}, path...)

					logger.InfoFields("graph_ops", "Shortest path found",
						logger.String("source", srcKey),
						logger.String("destination", dstKey),
						logger.Int("path_length", len(path)),
					)
					return path, nil
				}
			}
		}
	}

	logger.InfoFields("graph_ops", "No path found between nodes",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
	)
	return nil, fmt.Errorf("no path found between %s and %s", srcKey, dstKey)
}

// ShortestPathWithContext finds shortest path with context for cancellation
func (c *CachedStorage) ShortestPathWithContext(ctx context.Context, srcKey string, dstKey string) ([]string, error) {
	if srcKey == "" || dstKey == "" {
		return nil, errors.New("source and destination keys cannot be empty")
	}

	if srcKey == dstKey {
		return []string{srcKey}, nil
	}

	if !c.ContainsNode(srcKey) {
		return nil, fmt.Errorf("source node %s does not exist", srcKey)
	}

	if !c.ContainsNode(dstKey) {
		return nil, fmt.Errorf("destination node %s does not exist", dstKey)
	}

	logger.DebugFields("graph_ops", "Finding shortest path with context",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
	)

	visited := make(map[string]bool)
	parent := make(map[string]string)
	queue := []string{srcKey}
	visited[srcKey] = true

	for len(queue) > 0 {
		select {
		case <-ctx.Done():
			logger.WarnFields("graph_ops", "Shortest path cancelled",
				logger.String("source", srcKey),
				logger.String("destination", dstKey),
				logger.Err(ctx.Err()),
			)
			return nil, ctx.Err()
		default:
		}

		current := queue[0]
		queue = queue[1:]

		neighbors := c.Storage.edgeIndex.GetNeighbors(current)

		for _, neighbor := range neighbors {
			if !visited[neighbor] {
				visited[neighbor] = true
				parent[neighbor] = current
				queue = append(queue, neighbor)

				if neighbor == dstKey {
					path := make([]string, 0)
					curr := dstKey
					for curr != srcKey {
						path = append([]string{curr}, path...)
						curr = parent[curr]
					}
					path = append([]string{srcKey}, path...)

					logger.InfoFields("graph_ops", "Shortest path found with context",
						logger.String("source", srcKey),
						logger.String("destination", dstKey),
						logger.Int("path_length", len(path)),
					)
					return path, nil
				}
			}
		}
	}

	logger.InfoFields("graph_ops", "No path found between nodes (with context)",
		logger.String("source", srcKey),
		logger.String("destination", dstKey),
	)
	return nil, fmt.Errorf("no path found between %s and %s", srcKey, dstKey)
}

// ============================================
// 7. Convenience Methods
// ============================================

// IsNeighbor checks if two nodes are neighbors
func (c *CachedStorage) IsNeighbor(srcKey string, dstKey string) (bool, error) {
	return c.HasEdge(srcKey, dstKey)
}

// GetNeighborsWithWeights returns neighbors with their edge weights
func (c *CachedStorage) GetNeighborsWithWeights(key string) (map[string]int, error) {
	if key == "" {
		return nil, errors.New("key cannot be empty")
	}

	if !c.ContainsNode(key) {
		return nil, fmt.Errorf("node %s does not exist", key)
	}

	neighborWeights := make(map[string]int)
	neighbors := c.Storage.edgeIndex.GetNeighbors(key)

	for _, neighbor := range neighbors {
		edgeKey := generateEdgeKey(key, neighbor)
		edge, err := c.ReadEdgeByKey(edgeKey)
		if err == nil && !edge.IsDeleted() {
			neighborWeights[neighbor] = edge.Data.Weight
		}
	}

	logger.DebugFields("graph_ops", "Neighbors with weights retrieved",
		logger.String("key", key),
		logger.Int("neighbor_count", len(neighborWeights)),
	)
	return neighborWeights, nil
}

// GetNeighborsCount returns the number of neighbors without fetching the list
func (c *CachedStorage) GetNeighborsCount(key string) (uint64, error) {
	if key == "" {
		return 0, errors.New("key cannot be empty")
	}

	if !c.ContainsNode(key) {
		return 0, fmt.Errorf("node %s does not exist", key)
	}

	count := uint64(c.Storage.edgeIndex.GetNeighborCount(key))

	logger.DebugFields("graph_ops", "Neighbor count retrieved",
		logger.String("key", key),
		logger.Uint64("count", count),
	)
	return count, nil
}

// ============================================
// Helper Functions
// ============================================

// generateEdgeKey generates a consistent key for an edge
func generateEdgeKey(srcKey, dstKey string) string {
	return fmt.Sprintf("%s-%s", srcKey, dstKey)
}

// truncateKeys returns a subset of keys for logging (avoid huge log lines)
func truncateKeys(keys []string, max int) []string {
	if len(keys) <= max {
		return keys
	}
	return keys[:max]
}