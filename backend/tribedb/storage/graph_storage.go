package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"tribedb/logger"
)

// GraphStorage represents the main graph storage with segmentation
type GraphStorage struct {
	// Segment Managers
	NodeSegManager *SegManager
	EdgeSegManager *SegManager

	// Metadata
	Metadata *SegMetadataManager

	// WALs
	wal     *WAL
	nodeWAL *WAL
	edgeWAL *WAL

	// Configuration
	MaxNodes       uint64
	MaxEdges       uint64
	NodeRecordSize int
	EdgeRecordSize int
	FilePath       string

	// Locks
	Mu     sync.RWMutex
	closed bool

	// Recovery
	recoveryMode string

	// Statistics
	stats struct {
		walWrites   uint64
		walRecovery uint64
		walErrors   uint64
		walBatches  uint64
		segWrites   uint64
		segReads    uint64
	}

	// Flags
	useSegmentation bool

	// Edge Index for fast neighbor lookups
	edgeIndex *EdgeIndex

	// ✅ Sequential ID counters
	nextNodeID uint64
	nextEdgeID uint64
	idMu       sync.Mutex

	// ✅ Key Indexes (برای mapping key -> sequential ID)
	nodeKeyIndex *HashIndex
	edgeKeyIndex *HashIndex
}

// GraphConfig holds configuration for opening the graph
type GraphConfig struct {
	Path           string
	BucketCount    uint64
	ExpectedItems  uint64
	FalsePositive  float64

	MaxNodesPerSeg uint64
	MaxEdgesPerSeg uint64

	WALOptions     *Options
	RecoveryMode   string
	AutoRecover    bool
	UseSeparateWAL bool

	Logger interface{} // kept for backward compat, ignored
}

// OpenGraph opens or creates a graph database with segmentation
func OpenGraph(cfg GraphConfig) (*GraphStorage, error) {
	if cfg.Path == "" {
		return nil, fmt.Errorf("path cannot be empty")
	}

	// Set defaults
	if cfg.MaxNodesPerSeg == 0 {
		cfg.MaxNodesPerSeg = 1000000
	}
	if cfg.MaxEdgesPerSeg == 0 {
		cfg.MaxEdgesPerSeg = 5000000
	}
	if cfg.BucketCount == 0 {
		cfg.BucketCount = DefaultBucketCount
	}
	if cfg.ExpectedItems == 0 {
		cfg.ExpectedItems = 10000
	}
	if cfg.FalsePositive == 0 {
		cfg.FalsePositive = 0.01
	}

	logger.InfoFields("graph_storage", "Opening graph storage",
		logger.String("path", cfg.Path),
		logger.Uint64("max_nodes_per_seg", cfg.MaxNodesPerSeg),
		logger.Uint64("max_edges_per_seg", cfg.MaxEdgesPerSeg),
		logger.Bool("use_separate_wal", cfg.UseSeparateWAL),
		logger.Bool("auto_recover", cfg.AutoRecover),
		logger.String("recovery_mode", cfg.RecoveryMode),
	)

	// Create base directory
	if err := os.MkdirAll(cfg.Path, 0755); err != nil {
		logger.ErrorFields("graph_storage", "Failed to create base directory",
			logger.Err(err),
			logger.String("path", cfg.Path),
		)
		return nil, fmt.Errorf("failed to create base dir: %w", err)
	}

	gs := &GraphStorage{
		FilePath:        cfg.Path,
		NodeRecordSize:  NodeRecordSize,
		EdgeRecordSize:  EdgeRecordSize,
		recoveryMode:    cfg.RecoveryMode,
		useSegmentation: true,
		edgeIndex:       NewEdgeIndex(),
		nextNodeID:      1,
		nextEdgeID:      1,
	}

	// ---- 1. Initialize Segmentation ----
	logger.Info("graph_storage", "Initializing segmentation...")
	if err := gs.initSegmentation(cfg); err != nil {
		logger.ErrorFields("graph_storage", "Failed to initialize segmentation",
			logger.Err(err),
		)
		return nil, fmt.Errorf("failed to initialize segmentation: %w", err)
	}
	logger.Info("graph_storage", "Segmentation initialized")

	// ---- 2. Initialize Key Indexes ----
	logger.Info("graph_storage", "Initializing key indexes...")
	if err := gs.initKeyIndexes(); err != nil {
		logger.ErrorFields("graph_storage", "Failed to initialize key indexes",
			logger.Err(err),
		)
		return nil, fmt.Errorf("failed to initialize key indexes: %w", err)
	}
	logger.Info("graph_storage", "Key indexes initialized")

	// ✅ ---- 2.5 Restore Sequential IDs from Metadata ----
	if gs.Metadata != nil {
		gs.nextNodeID = gs.Metadata.GetNextNodeID()
		gs.nextEdgeID = gs.Metadata.GetNextEdgeID()

		// اطمینان از مقادیر حداقلی
		if gs.nextNodeID == 0 {
			gs.nextNodeID = 1
		}
		if gs.nextEdgeID == 0 {
			gs.nextEdgeID = 1
		}

		logger.InfoFields("graph_storage", "Restored sequential IDs from metadata",
			logger.Uint64("next_node_id", gs.nextNodeID),
			logger.Uint64("next_edge_id", gs.nextEdgeID),
		)
	}

	// ---- 3. Initialize WALs ----
	logger.Info("graph_storage", "Initializing WALs...")
	walOpts := cfg.WALOptions
	if walOpts == nil {
		walOpts = &Options{
			Dir:           cfg.Path,
			MaxSize:       128 << 20,
			MaxRotated:    20,
			FlushInterval: 50 * time.Millisecond,
			OnError:       nil,
		}
	} else {
		walOpts.Dir = cfg.Path
	}

	wal, err := Open(*walOpts)
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to open main WAL",
			logger.Err(err),
		)
		gs.ShutdownGraph()
		return nil, fmt.Errorf("open wal: %w", err)
	}
	gs.wal = wal

	if cfg.UseSeparateWAL {
		walDir := filepath.Join(cfg.Path, "segments", "wal")
		if err := os.MkdirAll(walDir, 0755); err != nil {
			logger.ErrorFields("graph_storage", "Failed to create segment WAL directory",
				logger.Err(err),
				logger.String("path", walDir),
			)
			gs.ShutdownGraph()
			return nil, fmt.Errorf("failed to create segment WAL dir: %w", err)
		}

		nodeWAL, err := Open(Options{
			Dir:           walDir,
			MaxSize:       64 << 20,
			MaxRotated:    10,
			FlushInterval: 50 * time.Millisecond,
		})
		if err != nil {
			logger.ErrorFields("graph_storage", "Failed to create node segment WAL",
				logger.Err(err),
			)
			gs.ShutdownGraph()
			return nil, fmt.Errorf("failed to create node segment WAL: %w", err)
		}
		gs.nodeWAL = nodeWAL

		edgeWAL, err := Open(Options{
			Dir:           walDir,
			MaxSize:       64 << 20,
			MaxRotated:    10,
			FlushInterval: 50 * time.Millisecond,
		})
		if err != nil {
			logger.ErrorFields("graph_storage", "Failed to create edge segment WAL",
				logger.Err(err),
			)
			gs.nodeWAL.CloseWALFile()
			gs.ShutdownGraph()
			return nil, fmt.Errorf("failed to create edge segment WAL: %w", err)
		}
		gs.edgeWAL = edgeWAL
	}
	logger.Info("graph_storage", "WALs initialized")

	// ---- 4. Build Edge Index ----
	logger.Info("graph_storage", "Building edge index from persisted data...")
	if err := gs.buildEdgeIndex(); err != nil {
		logger.WarnFields("graph_storage", "Failed to build edge index",
			logger.Err(err),
		)
	}

	// ---- 5. Auto-Recovery ----
	if cfg.AutoRecover {
		logger.Info("graph_storage", "Starting auto-recovery from WAL...")
		if err := gs.RecoverFromWAL(); err != nil {
			if gs.recoveryMode == "strict" {
				logger.ErrorFields("graph_storage", "Auto-recovery failed (strict mode)",
					logger.Err(err),
				)
				gs.ShutdownGraph()
				return nil, fmt.Errorf("auto-recovery failed: %w", err)
			}
			logger.WarnFields("graph_storage", "Auto-recovery had errors (non-strict mode)",
				logger.Err(err),
			)
		} else {
			logger.Info("graph_storage", "Auto-recovery completed successfully")
		}
	}

	logger.InfoFields("graph_storage", "Graph storage opened successfully",
		logger.String("path", cfg.Path),
		logger.Uint64("max_nodes_per_seg", cfg.MaxNodesPerSeg),
		logger.Uint64("max_edges_per_seg", cfg.MaxEdgesPerSeg),
	)

	return gs, nil
}

// ---- initKeyIndexes ----
func (gs *GraphStorage) initKeyIndexes() error {
	// Node Key Index
	nodeIndexPath := filepath.Join(gs.FilePath, "segments", "nodes", NodeKeyIndexName)
	nodeKeyIndex, err := NewHashIndex(nodeIndexPath, 1024)
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to create node key index",
			logger.Err(err),
			logger.String("path", nodeIndexPath),
		)
		return fmt.Errorf("failed to create node key index: %w", err)
	}
	gs.nodeKeyIndex = nodeKeyIndex

	// Edge Key Index
	edgeIndexPath := filepath.Join(gs.FilePath, "segments", "edges", EdgeKeyIndexName)
	edgeKeyIndex, err := NewHashIndex(edgeIndexPath, 1024)
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to create edge key index",
			logger.Err(err),
			logger.String("path", edgeIndexPath),
		)
		return fmt.Errorf("failed to create edge key index: %w", err)
	}
	gs.edgeKeyIndex = edgeKeyIndex

	return nil
}

// ---- initSegmentation ----
func (gs *GraphStorage) initSegmentation(cfg GraphConfig) error {
	nodesSegPath := filepath.Join(cfg.Path, "segments", "nodes")
	edgesSegPath := filepath.Join(cfg.Path, "segments", "edges")

	if err := os.MkdirAll(nodesSegPath, 0755); err != nil {
		return fmt.Errorf("failed to create nodes segment dir: %w", err)
	}
	if err := os.MkdirAll(edgesSegPath, 0755); err != nil {
		return fmt.Errorf("failed to create edges segment dir: %w", err)
	}

	meta, err := NewSegMetadataManager(cfg.Path, "global")
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to create metadata manager",
			logger.Err(err),
		)
		return fmt.Errorf("failed to create metadata manager: %w", err)
	}
	gs.Metadata = meta

	nodeManager, err := NewSegManager(SegManagerConfig{
		BasePath:       nodesSegPath,
		SegmentType:    "node",
		MaxItemsPerSeg: cfg.MaxNodesPerSeg,
		RecordSize:     NodeRecordSize,
		BloomConfig: ConfigBloom{
			ExpectedItems: cfg.ExpectedItems,
			FalsePositive: cfg.FalsePositive,
		},
		IndexBuckets: cfg.BucketCount,
	})
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to create node segment manager",
			logger.Err(err),
		)
		return fmt.Errorf("failed to create node segment manager: %w", err)
	}
	gs.NodeSegManager = nodeManager

	edgeManager, err := NewSegManager(SegManagerConfig{
		BasePath:       edgesSegPath,
		SegmentType:    "edge",
		MaxItemsPerSeg: cfg.MaxEdgesPerSeg,
		RecordSize:     EdgeRecordSize,
		BloomConfig: ConfigBloom{
			ExpectedItems: cfg.ExpectedItems,
			FalsePositive: cfg.FalsePositive,
		},
		IndexBuckets: cfg.BucketCount,
	})
	if err != nil {
		logger.ErrorFields("graph_storage", "Failed to create edge segment manager",
			logger.Err(err),
		)
		return fmt.Errorf("failed to create edge segment manager: %w", err)
	}
	gs.EdgeSegManager = edgeManager

	return nil
}

// ---- Sequential ID Generators ----
func (gs *GraphStorage) nextNodeIDLocked() uint64 {
	id := gs.nextNodeID
	gs.nextNodeID++
	return id
}

func (gs *GraphStorage) nextEdgeIDLocked() uint64 {
	id := gs.nextEdgeID
	gs.nextEdgeID++
	return id
}

// ============================================================================
// ✅ Build Edge Index - بازنویسی کامل
// ============================================================================

// buildEdgeIndex rebuilds the in-memory edge index from persisted edge data.
// It iterates through all edges stored in segments and populates the edgeIndex.
//
// Strategy: Instead of using edgeKeyIndex.ScanAll() (which holds a read lock
// and would deadlock if we called Get/ReadEdgeByKey), we directly scan segment
// files using sequential IDs from 1 to nextEdgeID-1.
func (gs *GraphStorage) buildEdgeIndex() error {
	logger.Info("graph_storage", "Building edge index from persisted segments...")

	// Clear existing index
	gs.edgeIndex.Clear()

	edgeCount := uint64(0)
	deletedCount := uint64(0)
	errorCount := uint64(0)
	notFoundCount := uint64(0)

	// محاسبه محدوده اسکن
	// از آنجایی که Sequential IDها از ۱ شروع می‌شوند و nextEdgeID یکی بعد از آخرین است
	maxEdgeID := gs.nextEdgeID

	// اگر nextEdgeID بازسازی نشده باشد (مثلاً ۱ است)، سقف معقولی در نظر می‌گیریم
	// این حالت فقط در اولین اجرا با دیتای قدیمی رخ می‌دهد
	if maxEdgeID <= 1 {
		// تخمین از روی edgeKeyIndex entry count
		if gs.edgeKeyIndex != nil {
			stats := gs.edgeKeyIndex.Stats()
			if entryCount, ok := stats["entry_count"].(uint64); ok && entryCount > 0 {
				// نمی‌توانیم دقیق بدانیم، باید از ScanAll استفاده کنیم
				logger.WarnFields("graph_storage", "nextEdgeID is 1 but edgeKeyIndex has entries - using ScanAll",
					logger.Uint64("edge_key_index_entries", entryCount),
				)
				return gs.buildEdgeIndexFromKeyIndex()
			}
		}
		logger.Info("graph_storage", "No edges to rebuild (nextEdgeID=1, empty edgeKeyIndex)")
		return nil
	}

	logger.InfoFields("graph_storage", "Scanning edges by sequential ID range",
		logger.Uint64("start_id", 1),
		logger.Uint64("end_id", maxEdgeID-1),
		logger.Uint64("total_to_scan", maxEdgeID-1),
	)

	// پیمایش همه Sequential IDها از ۱ تا nextEdgeID-1
	for id := uint64(1); id < maxEdgeID; id++ {
		data, err := gs.ReadEdge(id)
		if err != nil {
			if err == ErrNotFound {
				notFoundCount++
				// این طبیعی است - ممکن است IDهایی وجود داشته باشند که delete شده‌اند
				// یا ساختار segment هنوز کاملاً پر نشده باشد
				continue
			}
			errorCount++
			logger.DebugFields("graph_storage", "Failed to read edge during index rebuild",
				logger.Uint64("edge_id", id),
				logger.Err(err),
			)
			continue
		}

		edge := GetEdge()
		if err := edge.UnmarshalBinary(data); err != nil {
			PutEdge(edge)
			errorCount++
			logger.DebugFields("graph_storage", "Failed to unmarshal edge during index rebuild",
				logger.Uint64("edge_id", id),
				logger.Err(err),
			)
			continue
		}

		if edge.IsDeleted() {
			PutEdge(edge)
			deletedCount++
			continue
		}

		// اضافه کردن به edgeIndex (گراف بدون جهت)
		gs.edgeIndex.AddEdge(edge.Source, edge.Target)
		edgeCount++
		PutEdge(edge)
	}

	logger.InfoFields("graph_storage", "Edge index rebuild completed",
		logger.Uint64("total_scanned", maxEdgeID-1),
		logger.Uint64("edges_added", edgeCount),
		logger.Uint64("deleted_edges", deletedCount),
		logger.Uint64("not_found", notFoundCount),
		logger.Uint64("errors", errorCount),
	)

	return nil
}

// buildEdgeIndexFromKeyIndex is a fallback method that rebuilds edgeIndex
// by scanning the edgeKeyIndex. Used when nextEdgeID is not available.
//
// ⚠️ Important: This method does NOT use edgeKeyIndex.Get() to avoid deadlock
// with ScanAll's read lock. Instead, it tries to find edges by their key pattern.
func (gs *GraphStorage) buildEdgeIndexFromKeyIndex() error {
	logger.Info("graph_storage", "Building edge index from edgeKeyIndex ScanAll (fallback)...")

	gs.edgeIndex.Clear()

	edgeCount := uint64(0)
	errorCount := uint64(0)

	// جمع‌آوری همه کلیدها از ScanAll
	// ScanAll یک channel برمی‌گرداند که می‌توانیم safe بخوانیم
	keys := make([]string, 0)
	for key := range gs.edgeKeyIndex.ScanAll() {
		keys = append(keys, key)
	}

	logger.InfoFields("graph_storage", "Collected keys from edgeKeyIndex",
		logger.Int("total_keys", len(keys)),
	)

	// حالا که ScanAll تمام شده و channel بسته شده، می‌توانیم از Get استفاده کنیم
	for _, key := range keys {
		// استفاده از ReadEdgeByKey که داخلاً از edgeKeyIndex.Get() استفاده می‌کند
		edge, err := gs.ReadEdgeByKey(key)
		if err != nil {
			errorCount++
			logger.DebugFields("graph_storage", "Failed to read edge by key during rebuild",
				logger.String("key", key),
				logger.Err(err),
			)
			continue
		}

		if edge.IsDeleted() {
			continue
		}

		gs.edgeIndex.AddEdge(edge.Source, edge.Target)
		edgeCount++
	}

	logger.InfoFields("graph_storage", "Edge index rebuild from key index completed",
		logger.Uint64("edges_added", edgeCount),
		logger.Uint64("errors", errorCount),
	)

	return nil
}

// ---- Write Operations (Segmentation) ----

func (gs *GraphStorage) WriteNode(id uint64, data []byte) error {
	if gs.closed {
		return fmt.Errorf("storage is closed")
	}

	if len(data) != NodeRecordSize {
		logger.ErrorFields("graph_storage", "Invalid node data size",
			logger.Uint64("node_id", id),
			logger.Int("data_size", len(data)),
			logger.Int("expected_size", NodeRecordSize),
		)
		return fmt.Errorf("data size %d != record size %d", len(data), NodeRecordSize)
	}

	if gs.nodeWAL != nil {
		entry := &Entry{
			SegmentID: id / gs.NodeSegManager.Config().MaxItemsPerSeg,
			ItemID:    id,
			Op:        OpPut,
			Data:      data,
			Timestamp: time.Now().UnixNano(),
		}
		if err := gs.nodeWAL.Append(entry); err != nil {
			gs.stats.walErrors++
			logger.ErrorFields("graph_storage", "Failed to write node to WAL",
				logger.Err(err),
				logger.Uint64("node_id", id),
			)
			return fmt.Errorf("failed to write to WAL: %w", err)
		}
		gs.stats.walWrites++
	}

	if err := gs.NodeSegManager.WriteItem(id, data); err != nil {
		logger.ErrorFields("graph_storage", "Failed to write node to segment",
			logger.Err(err),
			logger.Uint64("node_id", id),
		)
		return fmt.Errorf("failed to write node: %w", err)
	}
	gs.stats.segWrites++

	return nil
}

func (gs *GraphStorage) ReadNode(id uint64) ([]byte, error) {
	if gs.closed {
		return nil, fmt.Errorf("storage is closed")
	}

	data, err := gs.NodeSegManager.ReadItem(id)
	if err != nil {
		return nil, err
	}
	gs.stats.segReads++
	return data, nil
}

func (gs *GraphStorage) WriteEdge(id uint64, data []byte) error {
	if gs.closed {
		return fmt.Errorf("storage is closed")
	}

	if len(data) != EdgeRecordSize {
		logger.ErrorFields("graph_storage", "Invalid edge data size",
			logger.Uint64("edge_id", id),
			logger.Int("data_size", len(data)),
			logger.Int("expected_size", EdgeRecordSize),
		)
		return fmt.Errorf("data size %d != record size %d", len(data), EdgeRecordSize)
	}

	if gs.edgeWAL != nil {
		entry := &Entry{
			SegmentID: id / gs.EdgeSegManager.Config().MaxItemsPerSeg,
			ItemID:    id,
			Op:        OpPut,
			Data:      data,
			Timestamp: time.Now().UnixNano(),
		}
		if err := gs.edgeWAL.Append(entry); err != nil {
			gs.stats.walErrors++
			logger.ErrorFields("graph_storage", "Failed to write edge to WAL",
				logger.Err(err),
				logger.Uint64("edge_id", id),
			)
			return fmt.Errorf("failed to write to WAL: %w", err)
		}
		gs.stats.walWrites++
	}

	if err := gs.EdgeSegManager.WriteItem(id, data); err != nil {
		logger.ErrorFields("graph_storage", "Failed to write edge to segment",
			logger.Err(err),
			logger.Uint64("edge_id", id),
		)
		return fmt.Errorf("failed to write edge: %w", err)
	}
	gs.stats.segWrites++

	return nil
}

func (gs *GraphStorage) ReadEdge(id uint64) ([]byte, error) {
	if gs.closed {
		return nil, fmt.Errorf("storage is closed")
	}

	data, err := gs.EdgeSegManager.ReadItem(id)
	if err != nil {
		return nil, err
	}
	gs.stats.segReads++
	return data, nil
}

// ---- Edge Index Methods ----

func (gs *GraphStorage) GetEdgeIndex() *EdgeIndex {
	return gs.edgeIndex
}

func (gs *GraphStorage) GetNeighborsFromIndex(node string) ([]string, error) {
	if !gs.ContainsNode(node) {
		return nil, fmt.Errorf("node %s does not exist", node)
	}
	return gs.edgeIndex.GetNeighbors(node), nil
}

func (gs *GraphStorage) HasEdgeFromIndex(src, dst string) bool {
	return gs.edgeIndex.HasNeighbor(src, dst)
}

// ---- Helper Methods ----

func (gs *GraphStorage) UseSegmentation() bool {
	return gs.useSegmentation
}

func (gs *GraphStorage) WAL() *WAL {
	return gs.wal
}

func (gs *GraphStorage) GetNodeSegManager() *SegManager {
	return gs.NodeSegManager
}

func (gs *GraphStorage) GetEdgeSegManager() *SegManager {
	return gs.EdgeSegManager
}

// ---- Shutdown ----

func (gs *GraphStorage) ShutdownGraph() error {
	logger.Info("graph_storage", "Shutting down GraphStorage...")

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	if gs.closed {
		logger.Warn("graph_storage", "GraphStorage already closed")
		return nil
	}
	gs.closed = true

	var errs []error

	// ✅ ذخیره Sequential IDها قبل از بستن Metadata
	if gs.Metadata != nil {
		gs.idMu.Lock()
		gs.Metadata.SetNextIDs(gs.nextNodeID, gs.nextEdgeID)
		gs.idMu.Unlock()

		logger.InfoFields("graph_storage", "Saved sequential IDs to metadata",
			logger.Uint64("next_node_id", gs.nextNodeID),
			logger.Uint64("next_edge_id", gs.nextEdgeID),
		)
	}

	// Close Key Indexes
	if gs.nodeKeyIndex != nil {
		logger.Info("graph_storage", "Closing Node Key Index...")
		if err := gs.nodeKeyIndex.CloseIndexFile(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to close Node Key Index",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("node key index: %w", err))
		}
	}

	if gs.edgeKeyIndex != nil {
		logger.Info("graph_storage", "Closing Edge Key Index...")
		if err := gs.edgeKeyIndex.CloseIndexFile(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to close Edge Key Index",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("edge key index: %w", err))
		}
	}

	// Close WALs
	if gs.nodeWAL != nil {
		logger.Info("graph_storage", "Closing Node WAL...")
		if err := gs.nodeWAL.CloseWALFile(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to close Node WAL",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("node WAL: %w", err))
		}
	}

	if gs.edgeWAL != nil {
		logger.Info("graph_storage", "Closing Edge WAL...")
		if err := gs.edgeWAL.CloseWALFile(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to close Edge WAL",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("edge WAL: %w", err))
		}
	}

	if gs.wal != nil {
		logger.Info("graph_storage", "Closing Main WAL...")
		if err := gs.wal.CloseWALFile(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to close Main WAL",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("main WAL: %w", err))
		}
	}

	// Save Metadata
	if gs.Metadata != nil {
		logger.Info("graph_storage", "Saving Metadata...")
		if err := gs.Metadata.Save(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to save Metadata",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata save: %w", err))
		}
	}

	// Close Segment Managers
	if gs.NodeSegManager != nil {
		logger.Info("graph_storage", "Shutting down Node SegManager...")
		if err := gs.NodeSegManager.ShutdownSegments(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to shutdown Node SegManager",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("node segment manager: %w", err))
		}
	}

	if gs.EdgeSegManager != nil {
		logger.Info("graph_storage", "Shutting down Edge SegManager...")
		if err := gs.EdgeSegManager.ShutdownSegments(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to shutdown Edge SegManager",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("edge segment manager: %w", err))
		}
	}

	// Final Metadata Save
	if gs.Metadata != nil {
		logger.Info("graph_storage", "Saving Metadata (final)...")
		if err := gs.Metadata.Save(); err != nil {
			logger.ErrorFields("graph_storage", "Failed to save Metadata (final)",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata final save: %w", err))
		}
	}

	if len(errs) > 0 {
		logger.ErrorFields("graph_storage", "Shutdown completed with errors",
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("shutdown errors: %v", errs)
	}

	logger.Info("graph_storage", "GraphStorage shutdown completed successfully")
	return nil
}

// ---- Stats ----
func (gs *GraphStorage) Stats() map[string]interface{} {
	gs.Mu.RLock()
	defer gs.Mu.RUnlock()

	stats := map[string]interface{}{
		"node_record_size":  gs.NodeRecordSize,
		"edge_record_size":  gs.EdgeRecordSize,
		"file_path":         gs.FilePath,
		"closed":            gs.closed,
		"use_segmentation":  gs.useSegmentation,
		"seg_writes":        gs.stats.segWrites,
		"seg_reads":         gs.stats.segReads,
		"wal_writes":        gs.stats.walWrites,
		"wal_recovery":      gs.stats.walRecovery,
		"wal_errors":        gs.stats.walErrors,
		"wal_batches":       gs.stats.walBatches,
		"next_node_id":      gs.nextNodeID,
		"next_edge_id":      gs.nextEdgeID,
	}

	if gs.NodeSegManager != nil {
		for k, v := range gs.NodeSegManager.Stats() {
			stats["node_seg_"+k] = v
		}
	}

	if gs.EdgeSegManager != nil {
		for k, v := range gs.EdgeSegManager.Stats() {
			stats["edge_seg_"+k] = v
		}
	}

	if gs.nodeWAL != nil {
		metrics := gs.nodeWAL.Metrics()
		stats["node_wal_writes"] = metrics.TotalWrites
		stats["node_wal_bytes"] = metrics.TotalBytes
	}

	if gs.edgeWAL != nil {
		metrics := gs.edgeWAL.Metrics()
		stats["edge_wal_writes"] = metrics.TotalWrites
		stats["edge_wal_bytes"] = metrics.TotalBytes
	}

	if gs.edgeIndex != nil {
		stats["edge_index_nodes"] = gs.edgeIndex.GetNodeCount()
		stats["edge_index_edges"] = gs.edgeIndex.GetEdgeCount()
	}

	if gs.nodeKeyIndex != nil {
		nodeStats := gs.nodeKeyIndex.Stats()
		stats["node_key_index_entries"] = nodeStats["entry_count"]
	}

	if gs.edgeKeyIndex != nil {
		edgeStats := gs.edgeKeyIndex.Stats()
		stats["edge_key_index_entries"] = edgeStats["entry_count"]
	}

	return stats
}