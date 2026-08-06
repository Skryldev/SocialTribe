package storage

import (
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"tribedb/logger"
)

type CachedStorage struct {
	Storage *GraphStorage
	Cache   *ARCCache[any]

	Hits   atomic.Int64
	Misses atomic.Int64

	Mu sync.RWMutex

	DefaultTTL time.Duration
	CacheSize  int
}

type CachedStorageConfig struct {
	CacheSize  int
	DefaultTTL time.Duration
}

func NewCachedStorage(storage *GraphStorage, config CachedStorageConfig) (*CachedStorage, error) {
	if config.CacheSize <= 0 {
		config.CacheSize = 1000
	}

	cache, err := NewARCCache[any](config.CacheSize)
	if err != nil {
		logger.ErrorFields("cached_storage", "Failed to create ARC cache",
			logger.Err(err),
			logger.Int("cache_size", config.CacheSize),
		)
		return nil, fmt.Errorf("failed to create cache: %w", err)
	}

	logger.InfoFields("cached_storage", "CachedStorage initialized",
		logger.Int("cache_size", config.CacheSize),
		logger.String("default_ttl", config.DefaultTTL.String()),
	)

	return &CachedStorage{
		Storage:    storage,
		Cache:      cache,
		DefaultTTL: config.DefaultTTL,
		CacheSize:  config.CacheSize,
	}, nil
}

// ---- Statistics -------------------------------------------------------------

func (c *CachedStorage) GetCacheStats() (hits, misses int64, hitRatio float64) {
	h := c.Hits.Load()
	m := c.Misses.Load()
	total := h + m
	if total == 0 {
		return h, m, 0
	}
	return h, m, float64(h) / float64(total)
}

func (c *CachedStorage) GetCacheDetailedStats() map[string]interface{} {
	hits, misses, ratio := c.GetCacheStats()

	stats := map[string]interface{}{
		"hits":           hits,
		"misses":         misses,
		"hit_ratio":      ratio,
		"cache_size":     c.CacheSize,
		"live_entries":   c.Cache.Len(),
		"total_capacity": c.CacheSize,
	}

	shardStats := c.Cache.GetShardStats()
	stats["shards"] = shardStats

	return stats
}

func (c *CachedStorage) ClearCache() {
	logger.Info("cached_storage", "Clearing cache")
	c.Cache.Clear()
	c.Hits.Store(0)
	c.Misses.Store(0)
	logger.Info("cached_storage", "Cache cleared successfully")
}

// ---- Proxy Methods ----------------------------------------------------------

func (c *CachedStorage) GetStorage() *GraphStorage {
	return c.Storage
}

// ShutdownCached closes the cached storage gracefully
func (c *CachedStorage) ShutdownCached() error {
	logger.Info("cached_storage", "Shutting down CachedStorage...")

	var errs []error

	// ✅ 1. اول ARC Cache را ببند
	if c.Cache != nil {
		logger.Info("cached_storage", "Shutting down ARC Cache...")
		c.Cache.ShutdownARC()
		logger.Info("cached_storage", "ARC Cache shutdown completed")
	}

	// ✅ 2. سپس Graph Storage را ببند
	if c.Storage != nil {
		logger.Info("cached_storage", "Shutting down Graph Storage...")
		if err := c.Storage.ShutdownGraph(); err != nil {
			logger.ErrorFields("cached_storage", "Graph Storage shutdown failed",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("graph storage shutdown: %w", err))
		} else {
			logger.Info("cached_storage", "Graph Storage shutdown completed")
		}
	}

	if len(errs) > 0 {
		logger.ErrorFields("cached_storage", "Shutdown completed with errors",
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("shutdown errors: %v", errs)
	}

	logger.Info("cached_storage", "CachedStorage shutdown completed successfully")
	return nil
}

// ---- Utility Functions ------------------------------------------------------

func (c *CachedStorage) GetHitRatioString() string {
	_, _, ratio := c.GetCacheStats()
	return fmt.Sprintf("%.2f%%", ratio*100)
}