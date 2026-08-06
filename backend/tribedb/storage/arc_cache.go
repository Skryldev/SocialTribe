package storage

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
	"unsafe"

	"tribedb/logger"
)

// ── arcNode ────────────────────────────────────────────────────────────────────

type arcNode[V any] struct {
	key       uint64
	value     V
	expiresAt int64
	prev      *arcNode[V]
	next      *arcNode[V]
	_         [8]byte
}

var _ unsafe.Pointer

// ── sync.Pool per generic instantiation ────────────────────────────────────────
type arcPool[V any] struct{ p sync.Pool }

func newNodePool[V any]() *arcPool[V] {
	np := &arcPool[V]{}
	np.p.New = func() any { return new(arcNode[V]) }
	return np
}

func (np *arcPool[V]) acquire() *arcNode[V] { return np.p.Get().(*arcNode[V]) }

func (np *arcPool[V]) release(n *arcNode[V]) {
	var zero V
	*n = arcNode[V]{value: zero}
	np.p.Put(n)
}

// ── arcList ────────────────────────────────────────────────────────────────────

type arcList[V any] struct {
	items map[uint64]*arcNode[V]
	head  *arcNode[V]
	tail  *arcNode[V]
	size  int
}

func newArcList[V any](pool *arcPool[V]) *arcList[V] {
	h, t := pool.acquire(), pool.acquire()
	h.next = t
	t.prev = h
	return &arcList[V]{items: make(map[uint64]*arcNode[V]), head: h, tail: t}
}

func (l *arcList[V]) pushFront(n *arcNode[V]) {
	n.prev = l.head
	n.next = l.head.next
	l.head.next.prev = n
	l.head.next = n
	l.items[n.key] = n
	l.size++
}

func (l *arcList[V]) remove(n *arcNode[V]) {
	n.prev.next = n.next
	n.next.prev = n.prev
	n.prev = nil
	n.next = nil
	delete(l.items, n.key)
	l.size--
}

func (l *arcList[V]) evictLRU() *arcNode[V] {
	n := l.tail.prev
	if n == l.head {
		return nil
	}
	l.remove(n)
	return n
}

func (l *arcList[V]) has(key uint64) (*arcNode[V], bool) {
	n, ok := l.items[key]
	return n, ok
}

func (l *arcList[V]) trimTo(limit int, pool *arcPool[V]) {
	for l.size > limit {
		if v := l.evictLRU(); v != nil {
			pool.release(v)
		}
	}
}

// ── shardMetrics ──────────────────────────────────────────────────────────────

type shardMetrics struct {
	hits      atomic.Int64
	misses    atomic.Int64
	ghostHits atomic.Int64
	deleted   atomic.Int64
	evictions atomic.Int64
}

// ── ratioTracker ──────────────────────────────────────────────────────────────

const ratioWindow = 20

type ratioTracker struct {
	buf   [ratioWindow]int32
	pos   atomic.Int64
	total atomic.Int64
	sum   atomic.Int64
}

func (r *ratioTracker) record(hit bool) {
	idx := r.pos.Add(1) % ratioWindow
	old := atomic.SwapInt32(&r.buf[idx], boolToInt32(hit))
	r.total.Add(1)
	if hit {
		r.sum.Add(1)
	}
	if old == 1 {
		r.sum.Add(-1)
	}
}

func (r *ratioTracker) ratio() float64 {
	s := r.sum.Load()
	t := r.total.Load()
	if t == 0 {
		return 0
	}
	if t < ratioWindow {
		return float64(s) / float64(t)
	}
	return float64(s) / ratioWindow
}

func boolToInt32(b bool) int32 {
	if b {
		return 1
	}
	return 0
}

// ── arcShard ──────────────────────────────────────────────────────────────────

type arcShard[V any] struct {
	mu       sync.Mutex
	t1, t2   *arcList[V]
	b1, b2   *arcList[V]
	p        int
	maxSize  int
	ghostCap int

	pool    *arcPool[V]
	metrics shardMetrics
	tracker ratioTracker

	_ [64]byte
}

func newShard[V any](maxSize int, pool *arcPool[V]) *arcShard[V] {
	gc := maxSize / 2
	if gc < 1 {
		gc = 1
	}
	return &arcShard[V]{
		t1:       newArcList[V](pool),
		t2:       newArcList[V](pool),
		b1:       newArcList[V](pool),
		b2:       newArcList[V](pool),
		maxSize:  maxSize,
		ghostCap: gc,
		pool:     pool,
	}
}

func (s *arcShard[V]) enforceGhostBounds() {
	s.b1.trimTo(s.ghostCap, s.pool)
	s.b2.trimTo(s.ghostCap, s.pool)
}

func (s *arcShard[V]) replace(triggerKey uint64) {
	_, inB2 := s.b2.has(triggerKey)
	if s.t1.size > 0 && (s.t1.size > s.p || (inB2 && s.t1.size == s.p)) {
		if victim := s.t1.evictLRU(); victim != nil {
			ghost := s.pool.acquire()
			ghost.key = victim.key
			s.b1.pushFront(ghost)
			s.pool.release(victim)
			s.metrics.evictions.Add(1)
		}
	} else {
		if victim := s.t2.evictLRU(); victim != nil {
			ghost := s.pool.acquire()
			ghost.key = victim.key
			s.b2.pushFront(ghost)
			s.pool.release(victim)
			s.metrics.evictions.Add(1)
		}
	}
}

func isExpired[V any](n *arcNode[V]) bool {
	return n.expiresAt > 0 && n.expiresAt < time.Now().UnixNano()
}

// ── CRUD on shard ─────────────────────────────────────────────────────────────

func (s *arcShard[V]) get(key uint64) (V, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if n, ok := s.t1.has(key); ok {
		if isExpired(n) {
			s.t1.remove(n)
			s.pool.release(n)
			s.metrics.misses.Add(1)
			s.tracker.record(false)
			var zero V
			return zero, false
		}
		s.t1.remove(n)
		s.t2.pushFront(n)
		val := n.value
		s.metrics.hits.Add(1)
		s.tracker.record(true)
		return val, true
	}

	if n, ok := s.t2.has(key); ok {
		if isExpired(n) {
			s.t2.remove(n)
			s.pool.release(n)
			s.metrics.misses.Add(1)
			s.tracker.record(false)
			var zero V
			return zero, false
		}
		s.t2.remove(n)
		s.t2.pushFront(n)
		val := n.value
		s.metrics.hits.Add(1)
		s.tracker.record(true)
		return val, true
	}

	s.metrics.misses.Add(1)
	s.tracker.record(false)
	var zero V
	return zero, false
}

func (s *arcShard[V]) peek(key uint64) (V, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if n, ok := s.t1.has(key); ok {
		if isExpired(n) {
			var zero V
			return zero, false
		}
		return n.value, true
	}
	if n, ok := s.t2.has(key); ok {
		if isExpired(n) {
			var zero V
			return zero, false
		}
		return n.value, true
	}
	var zero V
	return zero, false
}

func (s *arcShard[V]) insertNode(key uint64, value V, exp int64) {
	totalLive := s.t1.size + s.t2.size
	totalAll := totalLive + s.b1.size + s.b2.size

	if totalLive >= s.maxSize {
		if s.t1.size < s.maxSize {
			s.replace(key)
		} else {
			if victim := s.t1.evictLRU(); victim != nil {
				ghost := s.pool.acquire()
				ghost.key = victim.key
				s.b1.pushFront(ghost)
				s.pool.release(victim)
				s.metrics.evictions.Add(1)
			}
		}
	} else if totalAll >= s.maxSize {
		if totalAll >= 2*s.maxSize {
			if g := s.b2.evictLRU(); g != nil {
				s.pool.release(g)
			} else if g = s.b1.evictLRU(); g != nil {
				s.pool.release(g)
			}
		} else if s.b1.size > 0 {
			if g := s.b1.evictLRU(); g != nil {
				s.pool.release(g)
			}
		} else {
			if g := s.b2.evictLRU(); g != nil {
				s.pool.release(g)
			}
		}
	}

	n := s.pool.acquire()
	n.key = key
	n.value = value
	n.expiresAt = exp
	s.t1.pushFront(n)
}

func (s *arcShard[V]) handleGhostHit(key uint64, value V, exp int64) bool {
	if ghost, ok := s.b1.has(key); ok {
		delta := 1
		if s.b2.size > s.b1.size {
			delta = s.b2.size / s.b1.size
		}
		s.p = clamp(s.p+delta, 0, s.maxSize)
		s.replace(key)
		s.b1.remove(ghost)
		s.pool.release(ghost)
		n := s.pool.acquire()
		n.key = key
		n.value = value
		n.expiresAt = exp
		s.t2.pushFront(n)
		s.metrics.ghostHits.Add(1)
		s.enforceGhostBounds()
		return true
	}

	if ghost, ok := s.b2.has(key); ok {
		delta := 1
		if s.b1.size > s.b2.size {
			delta = s.b1.size / s.b2.size
		}
		s.p = clamp(s.p-delta, 0, s.maxSize)
		s.replace(key)
		s.b2.remove(ghost)
		s.pool.release(ghost)
		n := s.pool.acquire()
		n.key = key
		n.value = value
		n.expiresAt = exp
		s.t2.pushFront(n)
		s.metrics.ghostHits.Add(1)
		s.enforceGhostBounds()
		return true
	}

	return false
}

func (s *arcShard[V]) set(key uint64, value V, ttl time.Duration) {
	var exp int64
	if ttl > 0 {
		exp = time.Now().Add(ttl).UnixNano()
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.setLocked(key, value, exp)
}

func (s *arcShard[V]) setLocked(key uint64, value V, exp int64) {
	if n, ok := s.t1.has(key); ok {
		n.value = value
		n.expiresAt = exp
		s.t1.remove(n)
		s.t2.pushFront(n)
		return
	}
	if n, ok := s.t2.has(key); ok {
		n.value = value
		n.expiresAt = exp
		s.t2.remove(n)
		s.t2.pushFront(n)
		return
	}

	if s.handleGhostHit(key, value, exp) {
		return
	}

	s.insertNode(key, value, exp)
	s.enforceGhostBounds()
}

func (s *arcShard[V]) delete(key uint64) bool {
	found := false

	if n, ok := s.t1.has(key); ok {
		s.t1.remove(n)
		s.pool.release(n)
		found = true
	}
	if n, ok := s.t2.has(key); ok {
		s.t2.remove(n)
		s.pool.release(n)
		found = true
	}
	if n, ok := s.b1.has(key); ok {
		s.b1.remove(n)
		s.pool.release(n)
		found = true
	}
	if n, ok := s.b2.has(key); ok {
		s.b2.remove(n)
		s.pool.release(n)
		found = true
	}

	if found {
		if totalLive := s.t1.size + s.t2.size; s.p > totalLive {
			s.p = totalLive
		}
		s.metrics.deleted.Add(1)
	}
	return found
}

// ── Bulk shard operations ─────────────────────────────────────────────────────

func (s *arcShard[V]) setBulk(entries map[uint64]V, ttl time.Duration) int {
	if len(entries) == 0 {
		return 0
	}
	var exp int64
	if ttl > 0 {
		exp = time.Now().Add(ttl).UnixNano()
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	count := 0
	for key, value := range entries {
		s.setLocked(key, value, exp)
		count++
	}
	return count
}

func (s *arcShard[V]) getBulk(keys []uint64) map[uint64]V {
	if len(keys) == 0 {
		return nil
	}
	result := make(map[uint64]V, len(keys))

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, key := range keys {
		if n, ok := s.t1.has(key); ok && !isExpired(n) {
			result[key] = n.value
			s.t1.remove(n)
			s.t2.pushFront(n)
			s.metrics.hits.Add(1)
		} else if n, ok := s.t2.has(key); ok && !isExpired(n) {
			result[key] = n.value
			s.t2.remove(n)
			s.t2.pushFront(n)
			s.metrics.hits.Add(1)
		} else {
			s.metrics.misses.Add(1)
		}
	}
	return result
}

func (s *arcShard[V]) deleteBulk(keys []uint64) int {
	if len(keys) == 0 {
		return 0
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for _, key := range keys {
		if s.delete(key) {
			n++
		}
	}
	return n
}

// ── Maintenance ───────────────────────────────────────────────────────────────

func (s *arcShard[V]) expireEntries() {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UnixNano()
	expireList(s.t1, now, s.pool)
	expireList(s.t2, now, s.pool)
}

func expireList[V any](l *arcList[V], now int64, pool *arcPool[V]) {
	cur := l.tail.prev
	for cur != l.head {
		prev := cur.prev
		if cur.expiresAt > 0 && cur.expiresAt < now {
			l.remove(cur)
			pool.release(cur)
		}
		cur = prev
	}
}

func (s *arcShard[V]) resize(newSize int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.maxSize = newSize
	s.ghostCap = newSize / 2
	if s.ghostCap < 1 {
		s.ghostCap = 1
	}
	for s.t1.size+s.t2.size > newSize {
		s.replace(^uint64(0))
	}
	s.p = clamp(s.p, 0, newSize)
	s.enforceGhostBounds()
}

func (s *arcShard[V]) clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	clearList(s.t1, s.pool)
	clearList(s.t2, s.pool)
	clearList(s.b1, s.pool)
	clearList(s.b2, s.pool)
	s.p = 0
}

func clearList[V any](l *arcList[V], pool *arcPool[V]) {
	for k, n := range l.items {
		n.prev.next = n.next
		n.next.prev = n.prev
		n.prev = nil
		n.next = nil
		pool.release(n)
		delete(l.items, k)
	}
	l.size = 0
}

// ── Config ────────────────────────────────────────────────────────────────────

type Config struct {
	Capacity           int
	NumShards          int
	DefaultTTL         time.Duration
	GhostFactor        int
	EnableMetrics      bool
	EnableLogging      bool
	Logger             interface{} // kept for backward compat, ignored
	ExpireInterval     time.Duration
	GhostPruneInterval time.Duration
	AdaptInterval      time.Duration
}

func DefaultConfig() Config {
	return Config{
		NumShards:          64,
		GhostFactor:        2,
		EnableMetrics:      true,
		ExpireInterval:     time.Second,
		GhostPruneInterval: 5 * time.Second,
		AdaptInterval:      10 * time.Second,
	}
}

func (c *Config) Validate() error {
	var errs []error
	if c.Capacity <= 0 {
		errs = append(errs, fmt.Errorf("cache: Capacity must be positive, got %d", c.Capacity))
	}
	if c.NumShards <= 0 {
		errs = append(errs, fmt.Errorf("cache: NumShards must be positive, got %d", c.NumShards))
	} else if c.NumShards > 1024 {
		errs = append(errs, fmt.Errorf("cache: NumShards must be ≤ 1024, got %d", c.NumShards))
	}
	if c.GhostFactor < 1 {
		errs = append(errs, fmt.Errorf("cache: GhostFactor must be ≥ 1, got %d", c.GhostFactor))
	}
	return errors.Join(errs...)
}

// ── Metrics ───────────────────────────────────────────────────────────────────

type ShardMetrics struct {
	ShardID   int
	T1Size    int
	T2Size    int
	B1Size    int
	B2Size    int
	P         int
	Hits      int64
	Misses    int64
	GhostHits int64
	Deleted   int64
	Evictions int64
	HitRatio  float64
}

type ShardStats = ShardMetrics

type CacheMetrics struct {
	Hits       int64
	Misses     int64
	GhostHits  int64
	Deleted    int64
	Evictions  int64
	Size       int
	Capacity   int
	HitRatio   float64
	AvgP       float64
	ShardCount int
	PerShard   []ShardMetrics
}

// ── ARCCache ──────────────────────────────────────────────────────────────────

type ARCCache[V any] struct {
	shards    []*arcShard[V]
	numShards int
	totalCap  int
	cfg       Config

	hits    atomic.Int64
	misses  atomic.Int64
	deleted atomic.Int64

	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

func NewARCCache[V any](capacity int) (*ARCCache[V], error) {
	cfg := DefaultConfig()
	cfg.Capacity = capacity
	return NewARCCacheWithConfig[V](cfg)
}

func NewARCCacheWithConfig[V any](cfg Config) (*ARCCache[V], error) {
	if err := cfg.Validate(); err != nil {
		logger.ErrorFields("arc_cache", "Invalid ARC cache config",
			logger.Err(err),
			logger.Int("capacity", cfg.Capacity),
			logger.Int("num_shards", cfg.NumShards),
		)
		return nil, err
	}

	if cfg.NumShards == 0 {
		cfg.NumShards = 64
	}
	if cfg.GhostFactor == 0 {
		cfg.GhostFactor = 2
	}
	if cfg.ExpireInterval == 0 {
		cfg.ExpireInterval = time.Second
	}
	if cfg.GhostPruneInterval == 0 {
		cfg.GhostPruneInterval = 5 * time.Second
	}
	if cfg.AdaptInterval == 0 {
		cfg.AdaptInterval = 10 * time.Second
	}

	pool := newNodePool[V]()
	perShard := cfg.Capacity / cfg.NumShards
	if perShard < 1 {
		perShard = 1
	}

	ctx, cancel := context.WithCancel(context.Background())
	ac := &ARCCache[V]{
		shards:    make([]*arcShard[V], cfg.NumShards),
		numShards: cfg.NumShards,
		totalCap:  cfg.Capacity,
		cfg:       cfg,
		ctx:       ctx,
		cancel:    cancel,
	}
	for i := range ac.shards {
		ac.shards[i] = newShard[V](perShard, pool)
	}
	ac.startBackground()

	logger.InfoFields("arc_cache", "ARC cache initialized",
		logger.Int("capacity", cfg.Capacity),
		logger.Int("num_shards", cfg.NumShards),
		logger.Int("per_shard", perShard),
		logger.String("default_ttl", cfg.DefaultTTL.String()),
		logger.String("expire_interval", cfg.ExpireInterval.String()),
	)
	return ac, nil
}

func fibHash(key uint64, n int) int {
	const fibMul uint64 = 11400714819323198485
	shift := 64 - bits(n)
	return int((key * fibMul) >> shift)
}

func bits(n int) int {
	b := 0
	for n > 1 {
		n >>= 1
		b++
	}
	return b
}

func (c *ARCCache[V]) shard(key uint64) *arcShard[V] {
	return c.shards[fibHash(key, c.numShards)]
}

// ── Public CRUD API ───────────────────────────────────────────────────────────

func (c *ARCCache[V]) Get(key uint64) (V, bool) {
	v, ok := c.shard(key).get(key)
	if ok {
		c.hits.Add(1)
	} else {
		c.misses.Add(1)
	}
	return v, ok
}

func (c *ARCCache[V]) GetWithContext(ctx context.Context, key uint64) (V, bool, error) {
	if err := ctx.Err(); err != nil {
		var zero V
		return zero, false, err
	}
	v, ok := c.Get(key)
	if err := ctx.Err(); err != nil {
		var zero V
		return zero, false, err
	}
	return v, ok, nil
}

func (c *ARCCache[V]) Set(key uint64, value V) {
	c.shard(key).set(key, value, c.cfg.DefaultTTL)
}

func (c *ARCCache[V]) SetWithTTL(key uint64, value V, ttl time.Duration) {
	c.shard(key).set(key, value, ttl)
}

func (c *ARCCache[V]) SetWithContext(ctx context.Context, key uint64, value V, ttl time.Duration) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	c.SetWithTTL(key, value, ttl)
	return ctx.Err()
}

func (c *ARCCache[V]) Delete(key uint64) bool {
	s := c.shard(key)
	s.mu.Lock()
	ok := s.delete(key)
	s.mu.Unlock()
	if ok {
		c.deleted.Add(1)
	}
	return ok
}

func (c *ARCCache[V]) Peek(key uint64) (V, bool) {
	return c.shard(key).peek(key)
}

func (c *ARCCache[V]) Contains(key uint64) bool {
	s := c.shard(key)
	s.mu.Lock()
	defer s.mu.Unlock()
	_, inT1 := s.t1.has(key)
	_, inT2 := s.t2.has(key)
	return inT1 || inT2
}

func (c *ARCCache[V]) ContainsGhost(key uint64) bool {
	s := c.shard(key)
	s.mu.Lock()
	defer s.mu.Unlock()
	_, inB1 := s.b1.has(key)
	_, inB2 := s.b2.has(key)
	return inB1 || inB2
}

// ── Bulk operations ───────────────────────────────────────────────────────────

func (c *ARCCache[V]) SetBulk(entries map[uint64]V) int {
	return c.SetBulkWithTTL(entries, c.cfg.DefaultTTL)
}

func (c *ARCCache[V]) SetBulkWithTTL(entries map[uint64]V, ttl time.Duration) int {
	if len(entries) == 0 {
		return 0
	}
	shardEntries := make(map[int]map[uint64]V, c.numShards)
	for key, value := range entries {
		idx := fibHash(key, c.numShards)
		if shardEntries[idx] == nil {
			shardEntries[idx] = make(map[uint64]V)
		}
		shardEntries[idx][key] = value
	}
	total := 0
	for idx, e := range shardEntries {
		total += c.shards[idx].setBulk(e, ttl)
	}

	logger.DebugFields("arc_cache", "SetBulk completed",
		logger.Int("input_count", len(entries)),
		logger.Int("processed_count", total),
	)
	return total
}

func (c *ARCCache[V]) GetBulk(keys []uint64) map[uint64]V {
	if len(keys) == 0 {
		return nil
	}
	shardKeys := make(map[int][]uint64, c.numShards)
	for _, key := range keys {
		idx := fibHash(key, c.numShards)
		shardKeys[idx] = append(shardKeys[idx], key)
	}
	result := make(map[uint64]V, len(keys))
	for idx, ks := range shardKeys {
		for k, v := range c.shards[idx].getBulk(ks) {
			result[k] = v
		}
	}
	for _, key := range keys {
		if _, ok := result[key]; ok {
			c.hits.Add(1)
		} else {
			c.misses.Add(1)
		}
	}
	return result
}

func (c *ARCCache[V]) DeleteBulk(keys []uint64) int {
	if len(keys) == 0 {
		return 0
	}
	shardKeys := make(map[int][]uint64, c.numShards)
	for _, key := range keys {
		idx := fibHash(key, c.numShards)
		shardKeys[idx] = append(shardKeys[idx], key)
	}
	total := 0
	for idx, ks := range shardKeys {
		total += c.shards[idx].deleteBulk(ks)
	}
	c.deleted.Add(int64(total))

	logger.DebugFields("arc_cache", "DeleteBulk completed",
		logger.Int("input_count", len(keys)),
		logger.Int("deleted_count", total),
	)
	return total
}

// ── Statistics ────────────────────────────────────────────────────────────────

func (c *ARCCache[V]) Stats() (hits, misses int64) {
	return c.hits.Load(), c.misses.Load()
}

func (c *ARCCache[V]) DeletedStats() int64 { return c.deleted.Load() }

func (c *ARCCache[V]) Len() int {
	total := 0
	for _, s := range c.shards {
		s.mu.Lock()
		total += s.t1.size + s.t2.size
		s.mu.Unlock()
	}
	return total
}

func (c *ARCCache[V]) GetHitRatio() float64 {
	h, m := c.hits.Load(), c.misses.Load()
	if t := h + m; t > 0 {
		return float64(h) / float64(t)
	}
	return 0
}

func (c *ARCCache[V]) GetGhostHitRatio() float64 {
	var gh, total int64
	for _, s := range c.shards {
		gh += s.metrics.ghostHits.Load()
		total += s.metrics.hits.Load() + s.metrics.misses.Load()
	}
	if total == 0 {
		return 0
	}
	return float64(gh) / float64(total)
}

func (c *ARCCache[V]) GetParameterP() int {
	total := 0
	for _, s := range c.shards {
		s.mu.Lock()
		total += s.p
		s.mu.Unlock()
	}
	return total
}

func (c *ARCCache[V]) GetShardStats() []ShardStats {
	return c.Metrics().PerShard
}

func (c *ARCCache[V]) Metrics() CacheMetrics {
	perShard := make([]ShardMetrics, c.numShards)
	var totalHits, totalMisses, totalGhostHits, totalDeleted, totalEvictions int64
	var totalSize, totalP int

	for i, s := range c.shards {
		s.mu.Lock()
		h := s.metrics.hits.Load()
		m := s.metrics.misses.Load()
		gh := s.metrics.ghostHits.Load()
		del := s.metrics.deleted.Load()
		ev := s.metrics.evictions.Load()
		sz := s.t1.size + s.t2.size
		p := s.p
		sm := ShardMetrics{
			ShardID:   i,
			T1Size:    s.t1.size,
			T2Size:    s.t2.size,
			B1Size:    s.b1.size,
			B2Size:    s.b2.size,
			P:         p,
			Hits:      h,
			Misses:    m,
			GhostHits: gh,
			Deleted:   del,
			Evictions: ev,
		}
		if hm := h + m; hm > 0 {
			sm.HitRatio = float64(h) / float64(hm)
		}
		s.mu.Unlock()

		perShard[i] = sm
		totalHits += h
		totalMisses += m
		totalGhostHits += gh
		totalDeleted += del
		totalEvictions += ev
		totalSize += sz
		totalP += p
	}

	var hitRatio float64
	if t := totalHits + totalMisses; t > 0 {
		hitRatio = float64(totalHits) / float64(t)
	}
	avgP := float64(totalP) / float64(c.numShards)

	return CacheMetrics{
		Hits:       totalHits,
		Misses:     totalMisses,
		GhostHits:  totalGhostHits,
		Deleted:    totalDeleted,
		Evictions:  totalEvictions,
		Size:       totalSize,
		Capacity:   c.totalCap,
		HitRatio:   hitRatio,
		AvgP:       avgP,
		ShardCount: c.numShards,
		PerShard:   perShard,
	}
}

// ── Administration ────────────────────────────────────────────────────────────

func (c *ARCCache[V]) Replace(key uint64) {
	s := c.shard(key)
	s.mu.Lock()
	s.replace(key)
	s.mu.Unlock()
}

func (c *ARCCache[V]) Resize(newSize int) {
	if newSize <= 0 {
		return
	}
	perShard := newSize / c.numShards
	if perShard < 1 {
		perShard = 1
	}
	oldSize := c.totalCap
	c.totalCap = newSize
	for _, s := range c.shards {
		s.resize(perShard)
	}

	logger.InfoFields("arc_cache", "Cache resized",
		logger.Int("old_capacity", oldSize),
		logger.Int("new_capacity", newSize),
		logger.Int("per_shard", perShard),
	)
}

func (c *ARCCache[V]) Clear() {
	for _, s := range c.shards {
		s.clear()
	}
	c.hits.Store(0)
	c.misses.Store(0)
	c.deleted.Store(0)

	logger.Info("arc_cache", "Cache cleared - all entries removed")
}

func (c *ARCCache[V]) ShutdownARC() {
	logger.Info("arc_cache", "Shutting down ARC cache...")
	c.cancel()
	c.wg.Wait()
	logger.Info("arc_cache", "ARC cache shutdown complete")
}

// ── Background workers ────────────────────────────────────────────────────────

func (c *ARCCache[V]) startBackground() {
	c.wg.Add(3)
	go c.bgExpire()
	go c.bgGhostPrune()
	go c.bgAdaptP()
}

func (c *ARCCache[V]) bgExpire() {
	defer c.wg.Done()
	ticker := time.NewTicker(c.cfg.ExpireInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.expireAll()
		case <-c.ctx.Done():
			logger.Debug("arc_cache", "TTL expiration worker stopped")
			return
		}
	}
}

func (c *ARCCache[V]) expireAll() {
	for _, s := range c.shards {
		select {
		case <-c.ctx.Done():
			return
		default:
			s.expireEntries()
		}
	}
}

func (c *ARCCache[V]) bgGhostPrune() {
	defer c.wg.Done()
	ticker := time.NewTicker(c.cfg.GhostPruneInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.pruneGhosts()
		case <-c.ctx.Done():
			logger.Debug("arc_cache", "Ghost prune worker stopped")
			return
		}
	}
}

func (c *ARCCache[V]) pruneGhosts() {
	for _, s := range c.shards {
		select {
		case <-c.ctx.Done():
			return
		default:
			s.mu.Lock()
			s.enforceGhostBounds()
			s.mu.Unlock()
		}
	}
}

func (c *ARCCache[V]) bgAdaptP() {
	defer c.wg.Done()
	ticker := time.NewTicker(c.cfg.AdaptInterval)
	defer ticker.Stop()
	var prevRatio float64
	for {
		select {
		case <-ticker.C:
			c.adaptP(&prevRatio)
		case <-c.ctx.Done():
			logger.Debug("arc_cache", "P-parameter adapt worker stopped")
			return
		}
	}
}

func (c *ARCCache[V]) adaptP(prevRatio *float64) {
	for _, s := range c.shards {
		select {
		case <-c.ctx.Done():
			return
		default:
			cur := s.tracker.ratio()
			if *prevRatio > 0 && cur < *prevRatio-0.05 {
				s.mu.Lock()
				mid := s.maxSize / 2
				if s.p < mid {
					s.p = clamp(s.p+1, 0, s.maxSize)
				} else {
					s.p = clamp(s.p-1, 0, s.maxSize)
				}
				s.mu.Unlock()
			}
			*prevRatio = cur
		}
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}