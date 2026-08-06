package storage

import (
	"context"
	"fmt"
	"sync"

	"tribedb/logger"
)

// ---- BulkReadResult برای Node ----
type BulkReadNodeResult struct {
	Found    map[string]*Node
	NotFound []string
	Errors   []string
}

// ---- BulkReadResult برای Edge ----
type BulkReadEdgeResult struct {
	Found    map[string]*Edge
	NotFound []string
	Errors   []string
}

// ============================================
// NODE OPERATIONS
// ============================================

func (c *CachedStorage) ReadNodeByKey(key string) (*Node, error) {
	hashedKey := hashKey(key)

	// 1. اول کش را چک کن
	if val, ok := c.Cache.Get(hashedKey); ok {
		c.Hits.Add(1)
		if node, ok := val.(*Node); ok {
			logger.DebugFields("cached_storage", "Cache hit for node",
				logger.String("key", key),
			)
			return node, nil
		}
		// اگر نوع داده اشتباه بود، از کش حذفش کن
		logger.WarnFields("cached_storage", "Invalid cache entry type, deleting",
			logger.String("key", key),
		)
		c.Cache.Delete(hashedKey)
	}

	c.Misses.Add(1)
	logger.DebugFields("cached_storage", "Cache miss for node - reading from disk",
		logger.String("key", key),
	)

	// 2. از دیسک بخوان (با API جدید)
	node, err := c.Storage.ReadNodeByKey(key)
	if err != nil {
		logger.DebugFields("cached_storage", "Node not found on disk",
			logger.String("key", key),
			logger.Err(err),
		)
		return nil, err
	}

	// 3. در کش ذخیره کن
	if c.DefaultTTL > 0 {
		c.Cache.SetWithTTL(hashedKey, node, c.DefaultTTL)
	} else {
		c.Cache.Set(hashedKey, node)
	}

	return node, nil
}

func (c *CachedStorage) ReadNodeByKeyBulk(keys []string) (*BulkReadNodeResult, error) {
	if len(keys) == 0 {
		return &BulkReadNodeResult{
			Found:    make(map[string]*Node),
			NotFound: []string{},
			Errors:   []string{},
		}, nil
	}

	logger.DebugFields("cached_storage", "Bulk reading nodes",
		logger.Int("total_keys", len(keys)),
	)

	result := &BulkReadNodeResult{
		Found:    make(map[string]*Node, len(keys)),
		NotFound: make([]string, 0),
		Errors:   make([]string, 0),
	}

	var missingKeys []string

	// 1. ابتدا از کش بخوان
	cacheHits := 0
	for _, key := range keys {
		hashedKey := hashKey(key)
		if val, ok := c.Cache.Get(hashedKey); ok {
			if node, ok := val.(*Node); ok {
				result.Found[key] = node
				c.Hits.Add(1)
				cacheHits++
				continue
			}
		}
		missingKeys = append(missingKeys, key)
		c.Misses.Add(1)
	}

	logger.DebugFields("cached_storage", "Bulk node read cache results",
		logger.Int("cache_hits", cacheHits),
		logger.Int("cache_misses", len(missingKeys)),
	)

	// 2. اگر کلیدهایی در کش نبودند، از دیسک بخوان
	if len(missingKeys) > 0 {
		for _, key := range missingKeys {
			node, err := c.Storage.ReadNodeByKey(key)
			if err != nil {
				result.NotFound = append(result.NotFound, key)
				result.Errors = append(result.Errors, fmt.Sprintf("key %s: %v", key, err))
				continue
			}
			result.Found[key] = node

			// ذخیره در کش
			hashedKey := hashKey(key)
			if c.DefaultTTL > 0 {
				c.Cache.SetWithTTL(hashedKey, node, c.DefaultTTL)
			} else {
				c.Cache.Set(hashedKey, node)
			}
		}
	}

	logger.DebugFields("cached_storage", "Bulk node read completed",
		logger.Int("found", len(result.Found)),
		logger.Int("not_found", len(result.NotFound)),
		logger.Int("errors", len(result.Errors)),
	)

	return result, nil
}

func (c *CachedStorage) PeekNode(key string) (*Node, bool) {
	hashedKey := hashKey(key)
	val, ok := c.Cache.Peek(hashedKey)
	if !ok {
		return nil, false
	}
	node, ok := val.(*Node)
	return node, ok
}

// ---- Write Node Operations (اصلاح شده) ----

func (c *CachedStorage) WriteNode(index uint64, node *Node, key string) error {
	// ✅ استفاده از WriteNodeByKey که داده را در دیسک ذخیره می‌کند
	if err := c.Storage.WriteNodeByKey(key, node); err != nil {
		logger.ErrorFields("cached_storage", "Failed to write node to disk",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("index", index),
		)
		return err
	}

	// 2. کش را آپدیت کن
	hashedKey := hashKey(key)
	if c.DefaultTTL > 0 {
		c.Cache.SetWithTTL(hashedKey, node, c.DefaultTTL)
	} else {
		c.Cache.Set(hashedKey, node)
	}

	logger.DebugFields("cached_storage", "Node written and cached",
		logger.String("key", key),
		logger.Uint64("index", index),
	)
	return nil
}

func (c *CachedStorage) WriteNodeBulk(entries map[string]*Node) error {
	if len(entries) == 0 {
		return nil
	}

	logger.DebugFields("cached_storage", "Bulk writing nodes",
		logger.Int("count", len(entries)),
	)

	// 1. در دیسک بنویس (با WriteNodeByKey)
	for key, node := range entries {
		if err := c.Storage.WriteNodeByKey(key, node); err != nil {
			logger.ErrorFields("cached_storage", "Bulk write failed for node",
				logger.Err(err),
				logger.String("key", key),
			)
			return fmt.Errorf("failed to write node %s: %w", key, err)
		}
	}

	// 2. کش را آپدیت کن (با Bulk)
	cacheEntries := make(map[uint64]interface{}, len(entries))
	for key, node := range entries {
		hashedKey := hashKey(key)
		cacheEntries[hashedKey] = node
	}

	if c.DefaultTTL > 0 {
		c.Cache.SetBulkWithTTL(cacheEntries, c.DefaultTTL)
	} else {
		c.Cache.SetBulk(cacheEntries)
	}

	logger.DebugFields("cached_storage", "Bulk node write completed",
		logger.Int("count", len(entries)),
	)
	return nil
}

func (c *CachedStorage) DeleteNodeByKey(key string) error {
	hashedKey := hashKey(key)

	// ۱. حذف از کش (همیشه انجام بده)
	c.Cache.Delete(hashedKey)

	// ۲. حذف از دیسک (با API جدید)
	err := c.Storage.DeleteNodeByKey(key)
	if err != nil && err != ErrDeletedRecord && err != ErrNodeNotFound {
		logger.ErrorFields("cached_storage", "Failed to delete node from disk",
			logger.Err(err),
			logger.String("key", key),
		)
		return err
	}

	logger.DebugFields("cached_storage", "Node deleted",
		logger.String("key", key),
	)
	return nil
}

func (c *CachedStorage) DeleteNodeByKeyBulk(keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	logger.DebugFields("cached_storage", "Bulk deleting nodes",
		logger.Int("count", len(keys)),
	)

	var errors []string

	// 1. از دیسک حذف کن (با ادامه دادن)
	for _, key := range keys {
		err := c.Storage.DeleteNodeByKey(key)
		if err != nil && err != ErrDeletedRecord && err != ErrNodeNotFound {
			errors = append(errors, fmt.Sprintf("key %s: %v", key, err))
		}
	}

	// 2. از کش حذف کن (با Bulk)
	hashedKeys := make([]uint64, len(keys))
	for i, key := range keys {
		hashedKeys[i] = hashKey(key)
	}
	c.Cache.DeleteBulk(hashedKeys)

	if len(errors) > 0 {
		logger.WarnFields("cached_storage", "Bulk node delete completed with errors",
			logger.Int("error_count", len(errors)),
			logger.Int("total_keys", len(keys)),
		)
		return fmt.Errorf("delete errors: %v", errors)
	}

	logger.DebugFields("cached_storage", "Bulk node delete completed",
		logger.Int("count", len(keys)),
	)
	return nil
}

// ============================================
// EDGE OPERATIONS
// ============================================

func (c *CachedStorage) ReadEdgeByKey(key string) (*Edge, error) {
	hashedKey := hashKey(key)

	if val, ok := c.Cache.Get(hashedKey); ok {
		c.Hits.Add(1)
		if edge, ok := val.(*Edge); ok {
			logger.DebugFields("cached_storage", "Cache hit for edge",
				logger.String("key", key),
			)
			return edge, nil
		}
		logger.WarnFields("cached_storage", "Invalid cache entry type for edge, deleting",
			logger.String("key", key),
		)
		c.Cache.Delete(hashedKey)
	}

	c.Misses.Add(1)
	logger.DebugFields("cached_storage", "Cache miss for edge - reading from disk",
		logger.String("key", key),
	)

	edge, err := c.Storage.ReadEdgeByKey(key)
	if err != nil {
		logger.DebugFields("cached_storage", "Edge not found on disk",
			logger.String("key", key),
			logger.Err(err),
		)
		return nil, err
	}

	if c.DefaultTTL > 0 {
		c.Cache.SetWithTTL(hashedKey, edge, c.DefaultTTL)
	} else {
		c.Cache.Set(hashedKey, edge)
	}

	return edge, nil
}

func (c *CachedStorage) ReadEdgeByKeyBulk(keys []string) (*BulkReadEdgeResult, error) {
	if len(keys) == 0 {
		return &BulkReadEdgeResult{
			Found:    make(map[string]*Edge),
			NotFound: []string{},
			Errors:   []string{},
		}, nil
	}

	logger.DebugFields("cached_storage", "Bulk reading edges",
		logger.Int("total_keys", len(keys)),
	)

	result := &BulkReadEdgeResult{
		Found:    make(map[string]*Edge, len(keys)),
		NotFound: make([]string, 0),
		Errors:   make([]string, 0),
	}

	var missingKeys []string

	cacheHits := 0
	for _, key := range keys {
		hashedKey := hashKey(key)
		if val, ok := c.Cache.Get(hashedKey); ok {
			if edge, ok := val.(*Edge); ok {
				result.Found[key] = edge
				c.Hits.Add(1)
				cacheHits++
				continue
			}
		}
		missingKeys = append(missingKeys, key)
		c.Misses.Add(1)
	}

	logger.DebugFields("cached_storage", "Bulk edge read cache results",
		logger.Int("cache_hits", cacheHits),
		logger.Int("cache_misses", len(missingKeys)),
	)

	if len(missingKeys) > 0 {
		for _, key := range missingKeys {
			edge, err := c.Storage.ReadEdgeByKey(key)
			if err != nil {
				result.NotFound = append(result.NotFound, key)
				result.Errors = append(result.Errors, fmt.Sprintf("key %s: %v", key, err))
				continue
			}
			result.Found[key] = edge

			hashedKey := hashKey(key)
			if c.DefaultTTL > 0 {
				c.Cache.SetWithTTL(hashedKey, edge, c.DefaultTTL)
			} else {
				c.Cache.Set(hashedKey, edge)
			}
		}
	}

	logger.DebugFields("cached_storage", "Bulk edge read completed",
		logger.Int("found", len(result.Found)),
		logger.Int("not_found", len(result.NotFound)),
		logger.Int("errors", len(result.Errors)),
	)

	return result, nil
}

func (c *CachedStorage) PeekEdge(key string) (*Edge, bool) {
	hashedKey := hashKey(key)
	val, ok := c.Cache.Peek(hashedKey)
	if !ok {
		return nil, false
	}
	edge, ok := val.(*Edge)
	return edge, ok
}

// ContainsNode checks if a node exists - cache first, then disk
func (c *CachedStorage) ContainsNode(key string) bool {
	hashedKey := hashKey(key)

	// 1. Fast path: check cache
	if c.Cache.Contains(hashedKey) {
		return true
	}

	// 2. ✅ Fallback: check persistent storage (nodeKeyIndex)
	return c.Storage.ContainsNode(key)
}

// ContainsEdge checks if an edge exists - cache first, then disk
func (c *CachedStorage) ContainsEdge(key string) bool {
	hashedKey := hashKey(key)

	// 1. Fast path: check cache
	if c.Cache.Contains(hashedKey) {
		return true
	}

	// 2. ✅ Fallback: check persistent storage (edgeKeyIndex)
	return c.Storage.ContainsEdge(key)
}

// ---- Write Edge Operations (اصلاح شده) ----

func (c *CachedStorage) WriteEdge(index uint64, edge *Edge, key string) error {
	// ✅ استفاده از WriteEdgeByKey که Edge Index را به‌روز می‌کند
	if err := c.Storage.WriteEdgeByKey(key, edge); err != nil {
		logger.ErrorFields("cached_storage", "Failed to write edge to disk",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("index", index),
		)
		return err
	}

	// به‌روزرسانی Cache
	hashedKey := hashKey(key)
	if c.DefaultTTL > 0 {
		c.Cache.SetWithTTL(hashedKey, edge, c.DefaultTTL)
	} else {
		c.Cache.Set(hashedKey, edge)
	}

	logger.DebugFields("cached_storage", "Edge written and cached",
		logger.String("key", key),
		logger.Uint64("index", index),
	)
	return nil
}

func (c *CachedStorage) WriteEdgeBulk(entries map[string]*Edge) error {
	if len(entries) == 0 {
		return nil
	}

	logger.DebugFields("cached_storage", "Bulk writing edges",
		logger.Int("count", len(entries)),
	)

	// 1. در دیسک بنویس (با WriteEdgeByKey که Edge Index را به‌روز می‌کند)
	for key, edge := range entries {
		if err := c.Storage.WriteEdgeByKey(key, edge); err != nil {
			logger.ErrorFields("cached_storage", "Bulk write failed for edge",
				logger.Err(err),
				logger.String("key", key),
			)
			return fmt.Errorf("failed to write edge %s: %w", key, err)
		}
	}

	// 2. کش را آپدیت کن (با Bulk)
	cacheEntries := make(map[uint64]interface{}, len(entries))
	for key, edge := range entries {
		hashedKey := hashKey(key)
		cacheEntries[hashedKey] = edge
	}

	if c.DefaultTTL > 0 {
		c.Cache.SetBulkWithTTL(cacheEntries, c.DefaultTTL)
	} else {
		c.Cache.SetBulk(cacheEntries)
	}

	logger.DebugFields("cached_storage", "Bulk edge write completed",
		logger.Int("count", len(entries)),
	)
	return nil
}

// ---- Delete Edge Operations ----

func (c *CachedStorage) DeleteEdgeByKey(key string) error {
	hashedKey := hashKey(key)

	// ۱. حذف از کش (همیشه انجام بده)
	c.Cache.Delete(hashedKey)

	// ۲. حذف از دیسک (DeleteEdgeByKey خودش Edge Index را به‌روز می‌کند)
	err := c.Storage.DeleteEdgeByKey(key)
	if err != nil && err != ErrDeletedRecord && err != ErrEdgeNotFound {
		logger.ErrorFields("cached_storage", "Failed to delete edge from disk",
			logger.Err(err),
			logger.String("key", key),
		)
		return err
	}

	logger.DebugFields("cached_storage", "Edge deleted",
		logger.String("key", key),
	)
	return nil
}

func (c *CachedStorage) DeleteEdgeByKeyBulk(keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	logger.DebugFields("cached_storage", "Bulk deleting edges",
		logger.Int("count", len(keys)),
	)

	var errs []string

	// ۱. از کش حذف کن (Bulk)
	hashedKeys := make([]uint64, len(keys))
	for i, key := range keys {
		hashedKeys[i] = hashKey(key)
	}
	c.Cache.DeleteBulk(hashedKeys)

	// ۲. از دیسک حذف کن
	for _, key := range keys {
		err := c.Storage.DeleteEdgeByKey(key)
		if err != nil && err != ErrDeletedRecord && err != ErrEdgeNotFound {
			errs = append(errs, fmt.Sprintf("key %s: %v", key, err))
		}
	}

	if len(errs) > 0 {
		logger.WarnFields("cached_storage", "Bulk edge delete completed with errors",
			logger.Int("error_count", len(errs)),
			logger.Int("total_keys", len(keys)),
		)
		return fmt.Errorf("delete errors: %v", errs)
	}

	logger.DebugFields("cached_storage", "Bulk edge delete completed",
		logger.Int("count", len(keys)),
	)
	return nil
}

// PrefetchViewport با پشتیبانی از Context برای Graceful Shutdown
func (c *CachedStorage) PrefetchViewport(ctx context.Context, nodeIDs []string) {
	if len(nodeIDs) == 0 {
		return
	}

	logger.DebugFields("cached_storage", "Starting viewport prefetch",
		logger.Int("node_count", len(nodeIDs)),
	)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 10)

	prefetched := 0
	skipped := 0
	var mu sync.Mutex

	for _, id := range nodeIDs {
		if ctx.Err() != nil {
			skipped += len(nodeIDs) - (prefetched + skipped)
			break
		}

		hashed := hashKey(id)
		if c.Cache.Contains(hashed) {
			skipped++
			continue
		}

		wg.Add(1)
		go func(key string) {
			defer wg.Done()

			select {
			case <-ctx.Done():
				return
			case semaphore <- struct{}{}:
			}
			defer func() { <-semaphore }()

			if ctx.Err() != nil {
				return
			}

			node, err := c.Storage.ReadNodeByKey(key)
			if err == nil {
				hashedKey := hashKey(key)
				if c.DefaultTTL > 0 {
					c.Cache.SetWithTTL(hashedKey, node, c.DefaultTTL)
				} else {
					c.Cache.Set(hashedKey, node)
				}
				mu.Lock()
				prefetched++
				mu.Unlock()
			}
		}(id)
	}

	wg.Wait()

	logger.DebugFields("cached_storage", "Viewport prefetch completed",
		logger.Int("prefetched", prefetched),
		logger.Int("skipped", skipped),
	)
}