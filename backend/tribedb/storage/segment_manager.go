package storage

import (
	"fmt"
	"sync"

	"tribedb/logger"
)

// ============================================================================
// SegManager - Manages Multiple Segments
// ============================================================================

// SegManager manages all segments for either nodes or edges
type SegManager struct {
	segments    []*SegData
	activeIndex int
	mu          sync.RWMutex
	config      SegManagerConfig
	metadata    *SegMetadataManager
}

// SegManagerConfig configuration for segment manager
type SegManagerConfig struct {
	BasePath       string
	SegmentType    string // "node" or "edge"
	MaxItemsPerSeg uint64
	RecordSize     int
	BloomConfig    ConfigBloom
	IndexBuckets   uint64
}

// ============================================================================
// Constructor
// ============================================================================

// NewSegManager creates a new segment manager
func NewSegManager(cfg SegManagerConfig) (*SegManager, error) {
	logger.InfoFields("seg_manager", "Creating segment manager",
		logger.String("segment_type", cfg.SegmentType),
		logger.String("base_path", cfg.BasePath),
		logger.Uint64("max_items_per_seg", cfg.MaxItemsPerSeg),
	)

	m := &SegManager{
		segments:    make([]*SegData, 0),
		activeIndex: -1,
		config:      cfg,
	}

	// Create metadata manager
	meta, err := NewSegMetadataManager(cfg.BasePath, cfg.SegmentType)
	if err != nil {
		logger.ErrorFields("seg_manager", "Failed to create metadata manager",
			logger.Err(err),
			logger.String("segment_type", cfg.SegmentType),
		)
		return nil, fmt.Errorf("failed to create metadata manager: %w", err)
	}
	m.metadata = meta

	// Load existing segments
	if err := m.loadExistingSegments(); err != nil {
		logger.ErrorFields("seg_manager", "Failed to load existing segments",
			logger.Err(err),
		)
		return nil, fmt.Errorf("failed to load segments: %w", err)
	}

	// If no segments exist, create the first one
	if len(m.segments) == 0 {
		logger.InfoFields("seg_manager", "No existing segments found, creating initial segment",
			logger.String("segment_type", cfg.SegmentType),
		)
		if err := m.createNewSegment(); err != nil {
			return nil, fmt.Errorf("failed to create initial segment: %w", err)
		}
	}

	logger.InfoFields("seg_manager", "Segment manager initialized",
		logger.String("segment_type", cfg.SegmentType),
		logger.Int("total_segments", len(m.segments)),
	)

	return m, nil
}

// ============================================================================
// Public Methods
// ============================================================================

// WriteItem writes an item to the appropriate segment
func (m *SegManager) WriteItem(id uint64, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	segIdx := id / m.config.MaxItemsPerSeg
	localID := id % m.config.MaxItemsPerSeg

	// Ensure we have enough segments
	for uint64(len(m.segments)) <= segIdx {
		logger.InfoFields("seg_manager", "Creating new segment for write",
			logger.String("segment_type", m.config.SegmentType),
			logger.Uint64("required_seg_idx", segIdx),
			logger.Int("current_segments", len(m.segments)),
		)
		if err := m.createNewSegmentLocked(); err != nil {
			return fmt.Errorf("failed to create segment %d: %w", segIdx, err)
		}
	}

	seg := m.segments[segIdx]

	// If segment is sealed, create a new one and use it
	if seg.IsSealed {
		logger.WarnFields("seg_manager", "Target segment is sealed, creating new one",
			logger.Uint64("segment_id", seg.ID),
			logger.Uint64("global_id", id),
		)
		if err := m.createNewSegmentLocked(); err != nil {
			return err
		}
		seg = m.segments[len(m.segments)-1]
	}

	// Write to segment
	if err := seg.Write(localID, data); err != nil {
		return err
	}

	// Update metadata
	m.metadata.UpdateSegmentInfo(SegInfo{
		ID:        seg.ID,
		ItemCount: seg.CurrentCount,
		MaxItems:  seg.MaxItems,
		IsActive:  seg.IsActive,
		IsSealed:  seg.IsSealed,
	})

	// If segment is full, seal it and create a new one
	if seg.IsFull() {
		logger.InfoFields("seg_manager", "Segment is full, sealing and creating new",
			logger.Uint64("segment_id", seg.ID),
			logger.Uint64("current_count", seg.CurrentCount),
			logger.Uint64("max_items", seg.MaxItems),
		)

		if err := seg.Seal(); err != nil {
			return fmt.Errorf("failed to seal segment: %w", err)
		}

		m.metadata.UpdateSegmentInfo(SegInfo{
			ID:        seg.ID,
			ItemCount: seg.CurrentCount,
			MaxItems:  seg.MaxItems,
			IsActive:  false,
			IsSealed:  true,
		})

		if err := m.createNewSegmentLocked(); err != nil {
			return fmt.Errorf("failed to create new segment: %w", err)
		}
	}

	return m.metadata.Save()
}

// ReadItem reads an item from the appropriate segment
func (m *SegManager) ReadItem(id uint64) ([]byte, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	segIdx := id / m.config.MaxItemsPerSeg
	localID := id % m.config.MaxItemsPerSeg

	if uint64(len(m.segments)) <= segIdx {
		return nil, ErrNotFound
	}

	return m.segments[segIdx].Read(localID)
}

// Config returns the manager configuration
func (m *SegManager) Config() SegManagerConfig {
	return m.config
}

// GetSegments returns all segments (for stats/debug)
func (m *SegManager) GetSegments() []*SegData {
	m.mu.RLock()
	defer m.mu.RUnlock()

	segments := make([]*SegData, len(m.segments))
	copy(segments, m.segments)
	return segments
}

// Stats returns statistics for all segments
func (m *SegManager) Stats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := map[string]interface{}{
		"total_segments":    len(m.segments),
		"type":              m.config.SegmentType,
		"max_items_per_seg": m.config.MaxItemsPerSeg,
		"total_capacity":    uint64(len(m.segments)) * m.config.MaxItemsPerSeg,
	}

	segmentStats := make([]map[string]interface{}, len(m.segments))
	totalItems := uint64(0)
	for i, seg := range m.segments {
		segStats := seg.Stats()
		segmentStats[i] = segStats
		totalItems += segStats["current_count"].(uint64)
	}

	stats["segments"] = segmentStats
	stats["total_items"] = totalItems

	return stats
}

// Close closes all segments
func (m *SegManager) Close() error {
	logger.InfoFields("seg_manager", "Closing segment manager",
		logger.String("segment_type", m.config.SegmentType),
		logger.Int("total_segments", len(m.segments)),
	)

	m.mu.Lock()
	segments := make([]*SegData, len(m.segments))
	copy(segments, m.segments)
	m.mu.Unlock()

	var errs []error

	// ✅ 1. Save metadata before closing
	if m.metadata != nil {
		if err := m.metadata.Save(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to save metadata",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata save: %w", err))
		}
	}

	// ✅ 2. Close segments (without manager lock)
	for _, seg := range segments {
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
		if err := m.metadata.Save(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to save metadata (final)",
				logger.Err(err),
			)
			errs = append(errs, fmt.Errorf("metadata final save: %w", err))
		}
	}

	if len(errs) > 0 {
		logger.ErrorFields("seg_manager", "Close completed with errors",
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("close errors: %v", errs)
	}

	logger.InfoFields("seg_manager", "Segment manager closed successfully",
		logger.String("segment_type", m.config.SegmentType),
	)
	return nil
}

// ============================================================================
// Internal Methods
// ============================================================================

func (m *SegManager) loadExistingSegments() error {
	segmentsInfo, err := m.metadata.LoadAll()
	if err != nil {
		return nil
	}

	logger.InfoFields("seg_manager", "Loading existing segments",
		logger.String("segment_type", m.config.SegmentType),
		logger.Int("segment_count", len(segmentsInfo)),
	)

	for _, info := range segmentsInfo {
		seg := NewSegData(SegConfig{
			ID:           info.ID,
			BasePath:     m.config.BasePath,
			SegmentType:  m.config.SegmentType,
			MaxItems:     m.config.MaxItemsPerSeg,
			RecordSize:   m.config.RecordSize,
			BloomConfig:  m.config.BloomConfig,
			IndexBuckets: m.config.IndexBuckets,
		})

		if err := seg.Open(); err != nil {
			logger.ErrorFields("seg_manager", "Failed to open existing segment",
				logger.Err(err),
				logger.Uint64("segment_id", info.ID),
			)
			return fmt.Errorf("failed to open segment %d: %w", info.ID, err)
		}

		m.segments = append(m.segments, seg)

		if info.IsActive && !info.IsSealed {
			m.activeIndex = len(m.segments) - 1
		}
	}

	return nil
}

func (m *SegManager) createNewSegment() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.createNewSegmentLocked()
}

func (m *SegManager) createNewSegmentLocked() error {
	newID := uint64(len(m.segments))

	logger.InfoFields("seg_manager", "Creating new segment",
		logger.String("segment_type", m.config.SegmentType),
		logger.Uint64("new_segment_id", newID),
	)

	seg := NewSegData(SegConfig{
		ID:           newID,
		BasePath:     m.config.BasePath,
		SegmentType:  m.config.SegmentType,
		MaxItems:     m.config.MaxItemsPerSeg,
		RecordSize:   m.config.RecordSize,
		BloomConfig:  m.config.BloomConfig,
		IndexBuckets: m.config.IndexBuckets,
	})

	if err := seg.Open(); err != nil {
		return fmt.Errorf("failed to open new segment: %w", err)
	}

	// Make previous segment inactive
	if m.activeIndex >= 0 && m.activeIndex < len(m.segments) {
		m.segments[m.activeIndex].IsActive = false
	}

	m.segments = append(m.segments, seg)
	m.activeIndex = len(m.segments) - 1

	// Update metadata
	if err := m.metadata.AddSegment(SegInfo{
		ID:        seg.ID,
		Path:      seg.Path,
		ItemCount: seg.CurrentCount,
		MaxItems:  seg.MaxItems,
		IsActive:  true,
		IsSealed:  false,
	}); err != nil {
		return fmt.Errorf("failed to update metadata: %w", err)
	}

	logger.InfoFields("seg_manager", "New segment created and active",
		logger.String("segment_type", m.config.SegmentType),
		logger.Uint64("segment_id", newID),
		logger.Int("total_segments", len(m.segments)),
	)

	return nil
}