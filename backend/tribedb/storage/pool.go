package storage

import (
	"fmt"
	"runtime"
	"runtime/debug"
	"sync"
	"sync/atomic"
	"time"
	"unsafe"

	"tribedb/logger"
)

// ─── Constants ────────────────────────────────────────────────────────────────

const (
	cacheLineSize = 64

	// Canary values for corruption detection
	NodeCanary  uint64 = 0xDEADBEEFCAFEBABE
	EdgeCanary  uint64 = 0xBADC0FFEE0DDF00D
	EntryCanary uint64 = 0xFEEDFACEDEADC0DE
	BatchCanary uint64 = 0xF00DC0FFEE1E5EED

	// L1 per-CPU cache capacity before spilling to L2
	l1NodeCap  = 32
	l1EdgeCap  = 32
	l1EntryCap = 64
)

// ─── Metrics ──────────────────────────────────────────────────────────────────

// PoolMetrics tracks allocation, reuse, and GC pressure per pool.
type PoolMetrics struct {
	_          [cacheLineSize]byte
	Gets       atomic.Int64
	Puts       atomic.Int64
	Allocs     atomic.Int64
	Drains     atomic.Int64
	Corruption atomic.Int64
	_          [cacheLineSize]byte
}

func (m *PoolMetrics) HitRate() float64 {
	gets := m.Gets.Load()
	if gets == 0 {
		return 1.0
	}
	allocs := m.Allocs.Load()
	return float64(gets-allocs) / float64(gets)
}

// GlobalMetrics exposes pool-level metrics for external scraping.
var GlobalMetrics = struct {
	Node  PoolMetrics
	Edge  PoolMetrics
	Entry PoolMetrics
	Batch PoolMetrics
	Bytes PoolMetrics
}{}

// ─── L1 Per-CPU cache ─────────────────────────────────────────────────────────

type nodeCPUCache struct {
	_     [cacheLineSize]byte
	mu    sync.Mutex
	items [l1NodeCap]*Node
	count int
	_     [cacheLineSize]byte
}

type edgeCPUCache struct {
	_     [cacheLineSize]byte
	mu    sync.Mutex
	items [l1EdgeCap]*Edge
	count int
	_     [cacheLineSize]byte
}

type entryCPUCache struct {
	_     [cacheLineSize]byte
	mu    sync.Mutex
	items [l1EntryCap]*Entry
	count int
	_     [cacheLineSize]byte
}

var (
	nodeCaches  []nodeCPUCache
	edgeCaches  []edgeCPUCache
	entryCaches []entryCPUCache
)

func init() {
	n := runtime.GOMAXPROCS(0)
	nodeCaches = make([]nodeCPUCache, n)
	edgeCaches = make([]edgeCPUCache, n)
	entryCaches = make([]entryCPUCache, n)
}

func cpuSlot() int {
	var x [1]byte
	p := uintptr(unsafe.Pointer(&x[0]))
	return int((p>>12)^(p>>20)) % len(nodeCaches)
}

// ─── L2 Global pools (sync.Pool) ─────────────────────────────────────────────

var (
	nodePool = sync.Pool{New: func() interface{} {
		GlobalMetrics.Node.Allocs.Add(1)
		return &Node{_canary: NodeCanary}
	}}

	edgePool = sync.Pool{New: func() interface{} {
		GlobalMetrics.Edge.Allocs.Add(1)
		return &Edge{_canary: EdgeCanary}
	}}

	entryPool = sync.Pool{New: func() interface{} {
		GlobalMetrics.Entry.Allocs.Add(1)
		return &Entry{_canary: EntryCanary}
	}}

	batchPool = sync.Pool{New: func() interface{} {
		GlobalMetrics.Batch.Allocs.Add(1)
		b := NewBatch(DefaultBatchSize)
		b._canary = BatchCanary
		return b
	}}
)

// ─── Node Pool ────────────────────────────────────────────────────────────────

// GetNode returns a zeroed Node from the pool.
func GetNode() *Node {
	GlobalMetrics.Node.Gets.Add(1)
	slot := cpuSlot()
	c := &nodeCaches[slot]
	c.mu.Lock()
	if c.count > 0 {
		c.count--
		n := c.items[c.count]
		c.items[c.count] = nil
		c.mu.Unlock()

		if !validateNode(n) {
			GlobalMetrics.Node.Corruption.Add(1)
			logger.ErrorFields("pool", "CORRUPTION: Node from L1 cache",
				logger.String("expected_canary", fmt.Sprintf("%x", NodeCanary)),
				logger.String("actual_canary", fmt.Sprintf("%x", n._canary)),
				logger.String("stack", string(debug.Stack())),
			)
			return nodePool.Get().(*Node)
		}
		return n
	}
	c.mu.Unlock()

	n := nodePool.Get().(*Node)
	if !validateNode(n) {
		GlobalMetrics.Node.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Node from L2 pool",
			logger.String("expected_canary", fmt.Sprintf("%x", NodeCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", n._canary)),
		)
		return &Node{_canary: NodeCanary}
	}
	return n
}

func validateNode(n *Node) bool {
	if n == nil {
		return false
	}
	return n._canary == NodeCanary
}

// PutNode resets and returns a Node to the pool.
func PutNode(n *Node) {
	if n == nil {
		return
	}

	if !validateNode(n) {
		GlobalMetrics.Node.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Node in PutNode (use-after-free/double-free?)",
			logger.String("expected_canary", fmt.Sprintf("%x", NodeCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", n._canary)),
			logger.String("stack", string(debug.Stack())),
		)
		return
	}

	resetNode(n)
	GlobalMetrics.Node.Puts.Add(1)

	slot := cpuSlot()
	c := &nodeCaches[slot]
	c.mu.Lock()
	if c.count < l1NodeCap {
		c.items[c.count] = n
		c.count++
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()
	nodePool.Put(n)
}

func resetNode(n *Node) {
	n.ID = ""
	n.Type = ""
	n.Position.X = 0
	n.Position.Y = 0
	n.Data.ID = ""
	n.Data.Name = ""
	n.Data.NodeType = ""
	n.Data.Role = ""
	n.Data.FriendCount = 0
	n.Data.AvgDistance = 0
	n.Data.Centrality = 0
	n.Status = 0
	// ⚠️ n._canary را تغییر ندهید!
}

// ─── Edge Pool ────────────────────────────────────────────────────────────────

func GetEdge() *Edge {
	GlobalMetrics.Edge.Gets.Add(1)
	slot := cpuSlot()
	c := &edgeCaches[slot]
	c.mu.Lock()
	if c.count > 0 {
		c.count--
		e := c.items[c.count]
		c.items[c.count] = nil
		c.mu.Unlock()

		if !validateEdge(e) {
			GlobalMetrics.Edge.Corruption.Add(1)
			logger.ErrorFields("pool", "CORRUPTION: Edge from L1 cache",
				logger.String("expected_canary", fmt.Sprintf("%x", EdgeCanary)),
				logger.String("actual_canary", fmt.Sprintf("%x", e._canary)),
			)
			return edgePool.Get().(*Edge)
		}
		return e
	}
	c.mu.Unlock()

	e := edgePool.Get().(*Edge)
	if !validateEdge(e) {
		GlobalMetrics.Edge.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Edge from L2 pool",
			logger.String("expected_canary", fmt.Sprintf("%x", EdgeCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", e._canary)),
		)
		return &Edge{_canary: EdgeCanary}
	}
	return e
}

func validateEdge(e *Edge) bool {
	if e == nil {
		return false
	}
	return e._canary == EdgeCanary
}

func PutEdge(e *Edge) {
	if e == nil {
		return
	}

	if !validateEdge(e) {
		GlobalMetrics.Edge.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Edge in PutEdge",
			logger.String("expected_canary", fmt.Sprintf("%x", EdgeCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", e._canary)),
			logger.String("stack", string(debug.Stack())),
		)
		return
	}

	resetEdge(e)
	GlobalMetrics.Edge.Puts.Add(1)

	slot := cpuSlot()
	c := &edgeCaches[slot]
	c.mu.Lock()
	if c.count < l1EdgeCap {
		c.items[c.count] = e
		c.count++
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()
	edgePool.Put(e)
}

func resetEdge(e *Edge) {
	e.ID = ""
	e.Source = ""
	e.Target = ""
	e.Type = ""
	e.Data.Weight = 0
	e.Data.CreatedAt = time.Time{}
	e.Data.ID = ""
	e.Data.TargetID = ""
	e.Status = 0
	// ⚠️ e._canary را تغییر ندهید!
}

// ─── Entry Pool ───────────────────────────────────────────────────────────────

func GetEntry() *Entry {
	GlobalMetrics.Entry.Gets.Add(1)
	slot := cpuSlot()
	c := &entryCaches[slot]
	c.mu.Lock()
	if c.count > 0 {
		c.count--
		en := c.items[c.count]
		c.items[c.count] = nil
		c.mu.Unlock()

		if !validateEntry(en) {
			GlobalMetrics.Entry.Corruption.Add(1)
			logger.ErrorFields("pool", "CORRUPTION: Entry from L1 cache",
				logger.String("expected_canary", fmt.Sprintf("%x", EntryCanary)),
				logger.String("actual_canary", fmt.Sprintf("%x", en._canary)),
			)
			return entryPool.Get().(*Entry)
		}
		return en
	}
	c.mu.Unlock()

	en := entryPool.Get().(*Entry)
	if !validateEntry(en) {
		GlobalMetrics.Entry.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Entry from L2 pool",
			logger.String("expected_canary", fmt.Sprintf("%x", EntryCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", en._canary)),
		)
		return &Entry{_canary: EntryCanary}
	}
	return en
}

func validateEntry(e *Entry) bool {
	if e == nil {
		return false
	}
	return e._canary == EntryCanary
}

func PutEntry(e *Entry) {
	if e == nil {
		return
	}

	if !validateEntry(e) {
		GlobalMetrics.Entry.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Entry in PutEntry",
			logger.String("expected_canary", fmt.Sprintf("%x", EntryCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", e._canary)),
			logger.String("stack", string(debug.Stack())),
		)
		return
	}

	e.SegmentID = 0
	e.ItemID = 0
	e.Op = 0
	e.Data = e.Data[:0]
	e.Timestamp = 0

	GlobalMetrics.Entry.Puts.Add(1)

	slot := cpuSlot()
	c := &entryCaches[slot]
	c.mu.Lock()
	if c.count < l1EntryCap {
		c.items[c.count] = e
		c.count++
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()
	entryPool.Put(e)
}

// ─── Byte Buffer Pool ────────────────────────────────────────────────────────

type bufWrapper struct {
	_   [cacheLineSize]byte
	buf []byte
}

type ByteBufferPool struct {
	pool    sync.Pool
	size    int
	metrics *PoolMetrics
}

func NewByteBufferPool(size int) *ByteBufferPool {
	p := &ByteBufferPool{size: size, metrics: &GlobalMetrics.Bytes}
	p.pool = sync.Pool{
		New: func() interface{} {
			p.metrics.Allocs.Add(1)
			w := &bufWrapper{buf: make([]byte, size)}
			return w
		},
	}
	return p
}

func (p *ByteBufferPool) Get() []byte {
	p.metrics.Gets.Add(1)
	w := p.pool.Get().(*bufWrapper)
	return w.buf[:p.size]
}

func (p *ByteBufferPool) Put(buf []byte) {
	if cap(buf) < p.size {
		return
	}
	p.metrics.Puts.Add(1)
	p.pool.Put(&bufWrapper{buf: buf[:cap(buf)]})
}

var (
	NodeBufferPool = NewByteBufferPool(NodeRecordSize)
	EdgeBufferPool = NewByteBufferPool(EdgeRecordSize)
)

// ─── Batch Pool ───────────────────────────────────────────────────────────────

func GetBatch() *Batch {
	GlobalMetrics.Batch.Gets.Add(1)
	b := batchPool.Get().(*Batch)

	if b._canary != BatchCanary {
		GlobalMetrics.Batch.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Batch from pool",
			logger.String("expected_canary", fmt.Sprintf("%x", BatchCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", b._canary)),
		)
		return &Batch{_canary: BatchCanary}
	}
	return b
}

func PutBatch(b *Batch) {
	if b == nil {
		return
	}

	if b._canary != BatchCanary {
		GlobalMetrics.Batch.Corruption.Add(1)
		logger.ErrorFields("pool", "CORRUPTION: Batch in PutBatch",
			logger.String("expected_canary", fmt.Sprintf("%x", BatchCanary)),
			logger.String("actual_canary", fmt.Sprintf("%x", b._canary)),
		)
		return
	}

	b.Reset()
	GlobalMetrics.Batch.Puts.Add(1)
	batchPool.Put(b)
}

// ─── Drain ────────────────────────────────────────────────────────────────────

func DrainAll() {
	logger.Info("pool", "Draining all L1 CPU caches...")

	for i := range nodeCaches {
		c := &nodeCaches[i]
		c.mu.Lock()
		for j := 0; j < c.count; j++ {
			c.items[j] = nil
			GlobalMetrics.Node.Drains.Add(1)
		}
		c.count = 0
		c.mu.Unlock()
	}
	for i := range edgeCaches {
		c := &edgeCaches[i]
		c.mu.Lock()
		for j := 0; j < c.count; j++ {
			c.items[j] = nil
			GlobalMetrics.Edge.Drains.Add(1)
		}
		c.count = 0
		c.mu.Unlock()
	}
	for i := range entryCaches {
		c := &entryCaches[i]
		c.mu.Lock()
		for j := 0; j < c.count; j++ {
			c.items[j] = nil
			GlobalMetrics.Entry.Drains.Add(1)
		}
		c.count = 0
		c.mu.Unlock()
	}

	logger.Info("pool", "L1 CPU caches drained")
}

// ─── Adaptive pool sizing ─────────────────────────────────────────────────────

type PoolAdvisor struct {
	interval time.Duration
	stop     chan struct{}
}

func NewPoolAdvisor(interval time.Duration) *PoolAdvisor {
	return &PoolAdvisor{interval: interval, stop: make(chan struct{})}
}

func (a *PoolAdvisor) Start() {
	go func() {
		t := time.NewTicker(a.interval)
		defer t.Stop()
		for {
			select {
			case <-t.C:
				a.sample()
			case <-a.stop:
				return
			}
		}
	}()
}

func (a *PoolAdvisor) Stop() { close(a.stop) }

func (a *PoolAdvisor) sample() {
	pools := []struct {
		name string
		m    *PoolMetrics
	}{
		{"node", &GlobalMetrics.Node},
		{"edge", &GlobalMetrics.Edge},
		{"entry", &GlobalMetrics.Entry},
		{"batch", &GlobalMetrics.Batch},
		{"bytes", &GlobalMetrics.Bytes},
	}
	for _, p := range pools {
		hr := p.m.HitRate()
		logger.DebugFields("pool", "Pool advisor sample",
			logger.String("pool", p.name),
			logger.Float64("hit_rate", hr),
			logger.Int("gets", int(p.m.Gets.Load())),
			logger.Int("puts", int(p.m.Puts.Load())),
			logger.Int("allocs", int(p.m.Allocs.Load())),
			logger.Int("drains", int(p.m.Drains.Load())),
			logger.Int("corruption", int(p.m.Corruption.Load())),
		)
	}
}

// ─── Batch ────────────────────────────────────────────────────────────────────

type Batch struct {
	entries []*Entry
	size    int64
	mu      sync.Mutex
	_canary uint64
}

func NewBatch(capacity int) *Batch {
	if capacity <= 0 {
		capacity = DefaultBatchSize
	}
	return &Batch{
		entries: make([]*Entry, 0, capacity),
		size:    0,
		_canary: BatchCanary,
	}
}

func (b *Batch) Append(e *Entry) error {
	if len(e.Data) > MaxDataSize {
		return fmt.Errorf("%w: got %d bytes", ErrDataTooLarge, len(e.Data))
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	b.entries = append(b.entries, e)
	b.size += e.Size()
	return nil
}

func (b *Batch) Reset() {
	if b == nil {
		return
	}
	b.entries = b.entries[:0]
	b.size = 0
}

func (b *Batch) Add(entry *Entry) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.entries = append(b.entries, entry)
	b.size += int64(len(entry.Data))
}

func (b *Batch) Entries() []*Entry {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.entries
}

func (b *Batch) Size() int64 {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.size
}

func (b *Batch) Len() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.entries)
}

func (b *Batch) IsEmpty() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.entries) == 0
}

func (b *Batch) Capacity() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return cap(b.entries)
}

func (b *Batch) EnsureCapacity(capacity int) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if cap(b.entries) < capacity {
		newEntries := make([]*Entry, len(b.entries), capacity)
		copy(newEntries, b.entries)
		b.entries = newEntries
	}
}