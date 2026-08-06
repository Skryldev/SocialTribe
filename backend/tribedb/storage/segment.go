package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"tribedb/logger"

	"github.com/edsrzf/mmap-go"
)

// ============================================================================
// Segment - Core Data Structure
// ============================================================================

// SegData represents a single data segment with its own mmap file
type SegData struct {
	// Identity
	ID          uint64
	Path        string
	SegmentType string // "node" or "edge"

	// Data files
	DataFile *os.File
	Data     mmap.MMap

	// Index structures
	Index *HashIndex
	Bloom *BloomFilter

	// State
	mu           sync.RWMutex
	MaxItems     uint64
	CurrentCount uint64
	RecordSize   int
	IsActive     bool
	IsSealed     bool
	closed       bool

	// Metadata
	Metadata *SegMetadata
}

// SegMetadata holds metadata for a single segment
type SegMetadata struct {
	ID        uint64
	CreatedAt time.Time
	UpdatedAt time.Time
	ItemCount uint64
	MaxItems  uint64
	IsSealed  bool
	SealedAt  *time.Time
}

// SegConfig holds configuration for opening a segment
type SegConfig struct {
	ID           uint64
	BasePath     string
	SegmentType  string // "node" or "edge"
	MaxItems     uint64
	RecordSize   int
	BloomConfig  ConfigBloom
	IndexBuckets uint64
}

// ============================================================================
// Constructor
// ============================================================================

// NewSegData creates a new segment instance (does not open files)
func NewSegData(cfg SegConfig) *SegData {
	return &SegData{
		ID:          cfg.ID,
		Path:        filepath.Join(cfg.BasePath, fmt.Sprintf("segment_%04d", cfg.ID)),
		SegmentType: cfg.SegmentType,
		MaxItems:    cfg.MaxItems,
		RecordSize:  cfg.RecordSize,
		IsActive:    false,
		IsSealed:    false,
		Metadata: &SegMetadata{
			ID:        cfg.ID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			MaxItems:  cfg.MaxItems,
			IsSealed:  false,
		},
	}
}

// ============================================================================
// Lifecycle Methods
// ============================================================================

// getBloomName returns the correct bloom filename based on segment type
func (s *SegData) getBloomName() string {
	switch s.SegmentType {
	case "node":
		return NodeBloomName
	case "edge":
		return EdgeBloomName
	default:
		return NodeBloomName
	}
}

// getIndexName returns the correct index filename based on segment type
func (s *SegData) getIndexName() string {
	switch s.SegmentType {
	case "node":
		return NodeIndexName
	case "edge":
		return EdgeIndexName
	default:
		return NodeIndexName
	}
}

// Open opens an existing segment or creates a new one
func (s *SegData) Open() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return fmt.Errorf("segment %d is closed", s.ID)
	}

	logger.InfoFields("segment", "Opening segment",
		logger.Uint64("segment_id", s.ID),
		logger.String("segment_type", s.SegmentType),
		logger.String("path", s.Path),
	)

	// 1. Create directory
	if err := os.MkdirAll(s.Path, 0755); err != nil {
		logger.ErrorFields("segment", "Failed to create segment directory",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
			logger.String("path", s.Path),
		)
		return fmt.Errorf("failed to create segment dir: %w", err)
	}

	// 2. Open data file
	dataPath := filepath.Join(s.Path, MmapDataName)
	dataSize := int64(s.MaxItems) * int64(s.RecordSize)

	fd, err := os.OpenFile(dataPath, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		logger.ErrorFields("segment", "Failed to open data file",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
			logger.String("data_path", dataPath),
		)
		return fmt.Errorf("failed to open data file: %w", err)
	}

	// Ensure file is large enough
	info, err := fd.Stat()
	if err != nil {
		fd.Close()
		logger.ErrorFields("segment", "Failed to stat data file",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		return fmt.Errorf("failed to stat data file: %w", err)
	}

	if info.Size() < dataSize {
		if err := fd.Truncate(dataSize); err != nil {
			fd.Close()
			logger.ErrorFields("segment", "Failed to truncate data file",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
				logger.Int("required_size", int(dataSize)),
			)
			return fmt.Errorf("failed to truncate data file: %w", err)
		}
	}

	// 3. Memory map
	data, err := mmap.Map(fd, mmap.RDWR, 0)
	if err != nil {
		fd.Close()
		logger.ErrorFields("segment", "Failed to mmap data file",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		return fmt.Errorf("failed to mmap data file: %w", err)
	}
	s.DataFile = fd
	s.Data = data

	// 4. Open Bloom filter
	bloomName := s.getBloomName()
	bloomPath := filepath.Join(s.Path, bloomName)
	bloom, err := NewBloomFilter(ConfigBloom{
		FilePath:      bloomPath,
		ExpectedItems: s.MaxItems,
		FalsePositive: 0.01,
	})
	if err != nil {
		s.Data.Unmap()
		s.DataFile.Close()
		logger.ErrorFields("segment", "Failed to open bloom filter",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
			logger.String("bloom_path", bloomPath),
		)
		return fmt.Errorf("failed to open bloom filter at %s: %w", bloomPath, err)
	}
	s.Bloom = bloom

	// 5. Open Hash index
	indexName := s.getIndexName()
	indexPath := filepath.Join(s.Path, indexName)
	index, err := NewHashIndex(indexPath, 1024)
	if err != nil {
		s.Bloom.CloseBloomFile()
		s.Data.Unmap()
		s.DataFile.Close()
		logger.ErrorFields("segment", "Failed to open hash index",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
			logger.String("index_path", indexPath),
		)
		return fmt.Errorf("failed to open hash index at %s: %w", indexPath, err)
	}
	s.Index = index

	// 6. Load metadata
	if err := s.loadMetadata(); err != nil && !os.IsNotExist(err) {
		logger.ErrorFields("segment", "Failed to load metadata",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		return fmt.Errorf("failed to load metadata: %w", err)
	}

	// 7. Restore state from metadata
	if s.Metadata != nil {
		s.CurrentCount = s.Metadata.ItemCount
		s.IsSealed = s.Metadata.IsSealed
	}

	s.IsActive = !s.IsSealed && s.CurrentCount < s.MaxItems

	logger.InfoFields("segment", "Segment opened successfully",
		logger.Uint64("segment_id", s.ID),
		logger.Uint64("current_count", s.CurrentCount),
		logger.Uint64("max_items", s.MaxItems),
		logger.Bool("is_active", s.IsActive),
		logger.Bool("is_sealed", s.IsSealed),
	)

	return nil
}

// CloseSegmentData closes the segment and flushes all data
func (s *SegData) CloseSegmentData() error {
	logger.InfoFields("segment", "Closing segment",
		logger.Uint64("segment_id", s.ID),
		logger.String("segment_type", s.SegmentType),
	)

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		logger.DebugFields("segment", "Segment already closed",
			logger.Uint64("segment_id", s.ID),
		)
		return nil
	}
	s.closed = true

	var errs []error

	// ✅ 1. Save metadata
	if err := s.saveMetadata(); err != nil {
		logger.ErrorFields("segment", "Failed to save metadata",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		errs = append(errs, fmt.Errorf("failed to save metadata: %w", err))
	}

	// ✅ 2. Flush data BEFORE closing index and bloom
	if s.Data != nil {
		if err := s.Data.Flush(); err != nil {
			logger.ErrorFields("segment", "Failed to flush data",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
			)
			errs = append(errs, fmt.Errorf("failed to flush data: %w", err))
		}
	}

	// ✅ 3. Save and close Bloom filter
	if s.Bloom != nil {
		bloomName := s.getBloomName()
		bloomPath := filepath.Join(s.Path, bloomName)
		if err := s.Bloom.Save(bloomPath); err != nil {
			logger.ErrorFields("segment", "Failed to save bloom filter",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
				logger.String("bloom_path", bloomPath),
			)
			errs = append(errs, fmt.Errorf("failed to save bloom at %s: %w", bloomPath, err))
		}
		if err := s.Bloom.CloseBloomFile(); err != nil {
			logger.ErrorFields("segment", "Failed to close bloom filter",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
			)
			errs = append(errs, fmt.Errorf("failed to close bloom: %w", err))
		}
	}

	// ✅ 4. Close Index
	if s.Index != nil {
		if err := s.Index.CloseIndexFile(); err != nil {
			logger.ErrorFields("segment", "Failed to close index",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
			)
			errs = append(errs, fmt.Errorf("failed to close index: %w", err))
		}
	}

	// ✅ 5. Unmap data
	if s.Data != nil {
		if err := s.Data.Unmap(); err != nil {
			logger.ErrorFields("segment", "Failed to unmap data",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
			)
			errs = append(errs, fmt.Errorf("failed to unmap data: %w", err))
		}
	}

	// ✅ 6. Close data file
	if s.DataFile != nil {
		if err := s.DataFile.Close(); err != nil {
			logger.ErrorFields("segment", "Failed to close data file",
				logger.Err(err),
				logger.Uint64("segment_id", s.ID),
			)
			errs = append(errs, fmt.Errorf("failed to close data file: %w", err))
		}
	}

	if len(errs) > 0 {
		logger.ErrorFields("segment", "Segment closed with errors",
			logger.Uint64("segment_id", s.ID),
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("close errors: %v", errs)
	}

	logger.InfoFields("segment", "Segment closed successfully",
		logger.Uint64("segment_id", s.ID),
	)
	return nil
}

// ============================================================================
// CRUD Operations
// ============================================================================

// Write writes data to the segment at the given local ID
func (s *SegData) Write(localID uint64, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return fmt.Errorf("segment %d is closed", s.ID)
	}

	if s.IsSealed {
		logger.WarnFields("segment", "Attempted write to sealed segment",
			logger.Uint64("segment_id", s.ID),
			logger.Uint64("local_id", localID),
		)
		return fmt.Errorf("segment %d is sealed (read-only)", s.ID)
	}

	if localID >= s.MaxItems {
		logger.ErrorFields("segment", "Local ID exceeds max items",
			logger.Uint64("segment_id", s.ID),
			logger.Uint64("local_id", localID),
			logger.Uint64("max_items", s.MaxItems),
		)
		return fmt.Errorf("local ID %d exceeds max items %d", localID, s.MaxItems)
	}

	if len(data) != s.RecordSize {
		logger.ErrorFields("segment", "Data size mismatch",
			logger.Uint64("segment_id", s.ID),
			logger.Int("data_size", len(data)),
			logger.Int("record_size", s.RecordSize),
		)
		return fmt.Errorf("data size %d != record size %d", len(data), s.RecordSize)
	}

	// 1. Write to mmap
	offset := localID * uint64(s.RecordSize)
	copy(s.Data[offset:offset+uint64(s.RecordSize)], data)

	// 2. Update index
	key := fmt.Sprintf("%d", localID)
	if err := s.Index.Insert(key, offset); err != nil {
		return fmt.Errorf("failed to update index: %w", err)
	}

	// 3. Update bloom filter
	s.Bloom.Add(key)

	// 4. Update counters
	if localID >= s.CurrentCount {
		s.CurrentCount = localID + 1
	}
	s.Metadata.ItemCount = s.CurrentCount
	s.Metadata.UpdatedAt = time.Now()

	// 5. Check if segment is now full
	if s.CurrentCount >= s.MaxItems {
		s.IsActive = false
		logger.InfoFields("segment", "Segment is now full",
			logger.Uint64("segment_id", s.ID),
			logger.Uint64("current_count", s.CurrentCount),
			logger.Uint64("max_items", s.MaxItems),
		)
	}

	return nil
}

// Read reads data from the segment at the given local ID
func (s *SegData) Read(localID uint64) ([]byte, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.closed {
		return nil, fmt.Errorf("segment %d is closed", s.ID)
	}

	if localID >= s.MaxItems {
		return nil, fmt.Errorf("local ID %d exceeds max items", localID)
	}

	// 1. Check bloom filter (fast negative)
	key := fmt.Sprintf("%d", localID)
	if !s.Bloom.Contains(key) {
		return nil, ErrNotFound
	}

	// 2. Get offset from index
	offset, found := s.Index.Get(key)
	if !found {
		return nil, ErrNotFound
	}

	// 3. Read from mmap
	data := make([]byte, s.RecordSize)
	copy(data, s.Data[offset:offset+uint64(s.RecordSize)])

	return data, nil
}

// ============================================================================
// State Methods
// ============================================================================

// IsFull returns true if the segment has reached its capacity
func (s *SegData) IsFull() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.CurrentCount >= s.MaxItems
}

// Seal makes the segment read-only
func (s *SegData) Seal() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.IsSealed {
		return nil
	}

	logger.InfoFields("segment", "Sealing segment",
		logger.Uint64("segment_id", s.ID),
		logger.Uint64("current_count", s.CurrentCount),
	)

	s.IsSealed = true
	s.IsActive = false
	s.Metadata.IsSealed = true
	now := time.Now()
	s.Metadata.SealedAt = &now

	// Flush data to disk
	if err := s.Data.Flush(); err != nil {
		logger.ErrorFields("segment", "Failed to flush data during seal",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		return fmt.Errorf("failed to flush data: %w", err)
	}

	if err := s.saveMetadata(); err != nil {
		logger.ErrorFields("segment", "Failed to save metadata during seal",
			logger.Err(err),
			logger.Uint64("segment_id", s.ID),
		)
		return err
	}

	logger.InfoFields("segment", "Segment sealed successfully",
		logger.Uint64("segment_id", s.ID),
	)
	return nil
}

// Stats returns statistics for this segment
func (s *SegData) Stats() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return map[string]interface{}{
		"id":            s.ID,
		"path":          s.Path,
		"type":          s.SegmentType,
		"max_items":     s.MaxItems,
		"current_count": s.CurrentCount,
		"usage_percent": float64(s.CurrentCount) / float64(s.MaxItems) * 100,
		"is_active":     s.IsActive,
		"is_sealed":     s.IsSealed,
		"record_size":   s.RecordSize,
	}
}

// ============================================================================
// Internal Methods
// ============================================================================

func (s *SegData) saveMetadata() error {
	// TODO: Implement persistent metadata storage
	return nil
}

func (s *SegData) loadMetadata() error {
	// TODO: Implement persistent metadata loading
	return nil
}