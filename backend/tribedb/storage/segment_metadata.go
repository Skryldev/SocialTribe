package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"tribedb/logger"
)

// ============================================================================
// Types
// ============================================================================

// SegGlobalMetadata represents the database-wide metadata
type SegGlobalMetadata struct {
	Version      string          `json:"version"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	NodeSegments []SegInfo       `json:"node_segments"`
	EdgeSegments []SegInfo       `json:"edge_segments"`
	Config       SegGlobalConfig `json:"config"`
	Status       string          `json:"status"`
	NextNodeID   uint64          `json:"next_node_id"`
	NextEdgeID   uint64          `json:"next_edge_id"`
}

// SegInfo holds metadata for a single segment
type SegInfo struct {
	ID        uint64    `json:"id"`
	Path      string    `json:"path"`
	ItemCount uint64    `json:"item_count"`
	MaxItems  uint64    `json:"max_items"`
	IsActive  bool      `json:"is_active"`
	IsSealed  bool      `json:"is_sealed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SegGlobalConfig holds global configuration
type SegGlobalConfig struct {
	MaxNodesPerSeg uint64 `json:"max_nodes_per_seg"`
	MaxEdgesPerSeg uint64 `json:"max_edges_per_seg"`
	NodeRecordSize int    `json:"node_record_size"`
	EdgeRecordSize int    `json:"edge_record_size"`
}

// SegMetadataManager manages metadata persistence
type SegMetadataManager struct {
	path        string
	segmentType string // "node" or "edge"
	mu          sync.RWMutex
	metadata    *SegGlobalMetadata
}

// ============================================================================
// Constructor
// ============================================================================

// NewSegMetadataManager creates a new metadata manager
func NewSegMetadataManager(basePath, segmentType string) (*SegMetadataManager, error) {
	m := &SegMetadataManager{
		path:        filepath.Join(basePath, "metadata.json"),
		segmentType: segmentType,
		metadata: &SegGlobalMetadata{
			Version:      "2.0.0",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
			NodeSegments: []SegInfo{},
			EdgeSegments: []SegInfo{},
			Status:       "healthy",
			// ✅ مقداردهی اولیه برای Sequential IDs
			NextNodeID:   1,
			NextEdgeID:   1,
		},
	}

	// Load existing metadata
	if err := m.Load(); err != nil && !os.IsNotExist(err) {
		logger.ErrorFields("seg_metadata", "Failed to load metadata",
			logger.Err(err),
			logger.String("path", m.path),
		)
		return nil, fmt.Errorf("failed to load metadata: %w", err)
	}

	// ✅ اگر بعد از Load، مقادیر صفر بودند، مقدار پیش‌فرض بده
	if m.metadata.NextNodeID == 0 {
		m.metadata.NextNodeID = 1
		logger.Info("seg_metadata", "NextNodeID was 0, set to 1 (default)")
	}
	if m.metadata.NextEdgeID == 0 {
		m.metadata.NextEdgeID = 1
		logger.Info("seg_metadata", "NextEdgeID was 0, set to 1 (default)")
	}

	logger.InfoFields("seg_metadata", "Metadata manager initialized",
		logger.String("segment_type", segmentType),
		logger.Uint64("next_node_id", m.metadata.NextNodeID),
		logger.Uint64("next_edge_id", m.metadata.NextEdgeID),
	)

	return m, nil
}

// ============================================================================
// Public Methods
// ============================================================================

// Load loads metadata from disk
func (m *SegMetadataManager) Load() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := os.ReadFile(m.path)
	if err != nil {
		return err
	}

	var meta SegGlobalMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		logger.ErrorFields("seg_metadata", "Failed to parse metadata JSON",
			logger.Err(err),
			logger.String("path", m.path),
		)
		return fmt.Errorf("failed to parse metadata: %w", err)
	}

	m.metadata = &meta

	// ✅ اطمینان از مقداردهی فیلدهای جدید (برای backward compatibility)
	if m.metadata.NextNodeID == 0 {
		m.metadata.NextNodeID = 1
	}
	if m.metadata.NextEdgeID == 0 {
		m.metadata.NextEdgeID = 1
	}

	logger.DebugFields("seg_metadata", "Metadata loaded",
		logger.String("path", m.path),
		logger.Int("node_segments", len(meta.NodeSegments)),
		logger.Int("edge_segments", len(meta.EdgeSegments)),
		logger.Uint64("next_node_id", m.metadata.NextNodeID),
		logger.Uint64("next_edge_id", m.metadata.NextEdgeID),
	)
	return nil
}

// Save saves metadata to disk atomically
func (m *SegMetadataManager) Save() error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.metadata == nil {
		return nil
	}

	m.metadata.UpdatedAt = time.Now()

	data, err := json.MarshalIndent(m.metadata, "", "  ")
	if err != nil {
		logger.ErrorFields("seg_metadata", "Failed to marshal metadata",
			logger.Err(err),
		)
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	// Write to temp file first for atomicity
	tmpPath := m.path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		logger.ErrorFields("seg_metadata", "Failed to write temp metadata file",
			logger.Err(err),
			logger.String("tmp_path", tmpPath),
		)
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tmpPath, m.path); err != nil {
		logger.ErrorFields("seg_metadata", "Failed to rename metadata file",
			logger.Err(err),
			logger.String("tmp_path", tmpPath),
			logger.String("target_path", m.path),
		)
		return fmt.Errorf("failed to rename metadata file: %w", err)
	}

	logger.DebugFields("seg_metadata", "Metadata saved successfully",
		logger.String("path", m.path),
		logger.Uint64("next_node_id", m.metadata.NextNodeID),
		logger.Uint64("next_edge_id", m.metadata.NextEdgeID),
	)

	return nil
}

// ============================================================================
// Sequential ID Management (✅ NEW)
// ============================================================================

// GetNextNodeID returns the next available node ID
func (m *SegMetadataManager) GetNextNodeID() uint64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.metadata == nil {
		return 1
	}
	return m.metadata.NextNodeID
}

// SetNextNodeID updates the next available node ID
func (m *SegMetadataManager) SetNextNodeID(id uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.metadata == nil {
		return
	}

	oldID := m.metadata.NextNodeID
	m.metadata.NextNodeID = id
	m.metadata.UpdatedAt = time.Now()

	logger.DebugFields("seg_metadata", "NextNodeID updated",
		logger.Uint64("old_id", oldID),
		logger.Uint64("new_id", id),
	)
}

// GetNextEdgeID returns the next available edge ID
func (m *SegMetadataManager) GetNextEdgeID() uint64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.metadata == nil {
		return 1
	}
	return m.metadata.NextEdgeID
}

// SetNextEdgeID updates the next available edge ID
func (m *SegMetadataManager) SetNextEdgeID(id uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.metadata == nil {
		return
	}

	oldID := m.metadata.NextEdgeID
	m.metadata.NextEdgeID = id
	m.metadata.UpdatedAt = time.Now()

	logger.DebugFields("seg_metadata", "NextEdgeID updated",
		logger.Uint64("old_id", oldID),
		logger.Uint64("new_id", id),
	)
}

// GetNextIDs returns both next IDs atomically (for logging/debug)
func (m *SegMetadataManager) GetNextIDs() (uint64, uint64) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.metadata == nil {
		return 1, 1
	}
	return m.metadata.NextNodeID, m.metadata.NextEdgeID
}

// SetNextIDs updates both next IDs atomically
func (m *SegMetadataManager) SetNextIDs(nodeID, edgeID uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.metadata == nil {
		return
	}

	m.metadata.NextNodeID = nodeID
	m.metadata.NextEdgeID = edgeID
	m.metadata.UpdatedAt = time.Now()

	logger.DebugFields("seg_metadata", "NextIDs updated (batch)",
		logger.Uint64("next_node_id", nodeID),
		logger.Uint64("next_edge_id", edgeID),
	)
}

// ============================================================================
// Segment Management (Unchanged)
// ============================================================================

// AddSegment adds segment info to metadata
func (m *SegMetadataManager) AddSegment(info SegInfo) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.segmentType == "node" || m.segmentType == "global" {
		m.metadata.NodeSegments = append(m.metadata.NodeSegments, info)
	}
	if m.segmentType == "edge" || m.segmentType == "global" {
		m.metadata.EdgeSegments = append(m.metadata.EdgeSegments, info)
	}

	logger.DebugFields("seg_metadata", "Segment added to metadata",
		logger.Uint64("segment_id", info.ID),
		logger.String("segment_type", m.segmentType),
	)
	return nil
}

// UpdateSegmentInfo updates segment info in metadata
func (m *SegMetadataManager) UpdateSegmentInfo(info SegInfo) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.segmentType == "node" || m.segmentType == "global" {
		for i, seg := range m.metadata.NodeSegments {
			if seg.ID == info.ID {
				m.metadata.NodeSegments[i] = info
				break
			}
		}
	}
	if m.segmentType == "edge" || m.segmentType == "global" {
		for i, seg := range m.metadata.EdgeSegments {
			if seg.ID == info.ID {
				m.metadata.EdgeSegments[i] = info
				break
			}
		}
	}

	return nil
}

// LoadAll returns all segment infos for the configured type
func (m *SegMetadataManager) LoadAll() ([]SegInfo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if m.segmentType == "node" {
		return m.metadata.NodeSegments, nil
	}
	if m.segmentType == "edge" {
		return m.metadata.EdgeSegments, nil
	}
	// global: return both
	all := make([]SegInfo, 0, len(m.metadata.NodeSegments)+len(m.metadata.EdgeSegments))
	all = append(all, m.metadata.NodeSegments...)
	all = append(all, m.metadata.EdgeSegments...)
	return all, nil
}

// GetGlobalMetadata returns a copy of global metadata
func (m *SegMetadataManager) GetGlobalMetadata() *SegGlobalMetadata {
	m.mu.RLock()
	defer m.mu.RUnlock()

	meta := *m.metadata
	return &meta
}

// ============================================================================
// Stats & Debug (✅ Enhanced)
// ============================================================================

// Stats returns statistics about metadata
func (m *SegMetadataManager) Stats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]interface{}{
		"version":        m.metadata.Version,
		"status":         m.metadata.Status,
		"created_at":     m.metadata.CreatedAt,
		"updated_at":     m.metadata.UpdatedAt,
		"node_segments":  len(m.metadata.NodeSegments),
		"edge_segments":  len(m.metadata.EdgeSegments),
		"next_node_id":   m.metadata.NextNodeID,
		"next_edge_id":   m.metadata.NextEdgeID,
		"segment_type":   m.segmentType,
	}
}

// ============================================================================
// SegManager Method (Unchanged - moved here for completeness)
// ============================================================================

// ShutdownSegments closes all segments managed by SegManager
func (m *SegManager) ShutdownSegments() error {
	logger.InfoFields("seg_manager", "Shutting down segments",
		logger.String("segment_type", m.config.SegmentType),
	)

	m.mu.Lock()
	segments := make([]*SegData, len(m.segments))
	copy(segments, m.segments)
	m.mu.Unlock()

	var errs []error

	// ✅ 1. Save metadata
	if m.metadata != nil {
		logger.DebugFields("seg_manager", "Saving metadata before shutdown",
			logger.String("segment_type", m.config.SegmentType),
		)
		if err := m.metadata.Save(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to save metadata",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata save: %w", err))
		}
	}

	// ✅ 2. Close segments
	for _, seg := range segments {
		logger.DebugFields("seg_manager", "Closing segment",
			logger.Uint64("segment_id", seg.ID),
		)
		if err := seg.CloseSegmentData(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to close segment",
				logger.Err(err),
				logger.Uint64("segment_id", seg.ID),
			)
			errs = append(errs, fmt.Errorf("segment %d close: %w", seg.ID, err))
		}
	}

	// ✅ 3. Final metadata save
	if m.metadata != nil {
		logger.DebugFields("seg_manager", "Saving metadata (final)",
			logger.String("segment_type", m.config.SegmentType),
		)
		if err := m.metadata.Save(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to save metadata (final)",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata final save: %w", err))
		}
	}

	if len(errs) > 0 {
		logger.ErrorFields("seg_manager", "Shutdown completed with errors",
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("shutdown errors: %v", errs)
	}

	logger.InfoFields("seg_manager", "Segments shutdown complete",
		logger.String("segment_type", m.config.SegmentType),
	)
	return nil
}