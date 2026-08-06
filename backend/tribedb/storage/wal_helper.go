package storage

import (
	"context"
	"fmt"
	"time"

	"tribedb/logger"
)

// ─── Recovery on Startup ─────────────────────────────────────────────
// RecoverFromWAL بازیابی داده‌ها از WAL در هنگام راه‌اندازی
func (gs *GraphStorage) RecoverFromWAL() error {
	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	logger.InfoFields("wal_helper", "Starting WAL recovery",
		logger.String("mode", gs.recoveryMode),
	)
	startTime := time.Now()

	var recoveredCount int
	var corruptEntries int

	err := gs.wal.Replay(context.Background(), func(e *Entry) error {
		switch e.Op {
		case OpPut:
			// ✅ استفاده از API جدید Segmentation
			if e.SegmentID == 1 {
				// Node recovery
				if err := gs.NodeSegManager.WriteItem(e.ItemID, e.Data); err != nil {
					corruptEntries++
					if gs.recoveryMode == "strict" {
						return fmt.Errorf("node recovery failed: %w", err)
					}
					logger.WarnFields("wal_helper", "Node recovery failed",
						logger.Uint64("item_id", e.ItemID),
						logger.Err(err),
					)
					return nil
				}
				recoveredCount++
			} else if e.SegmentID == 2 {
				// Edge recovery
				if err := gs.EdgeSegManager.WriteItem(e.ItemID, e.Data); err != nil {
					corruptEntries++
					if gs.recoveryMode == "strict" {
						return fmt.Errorf("edge recovery failed: %w", err)
					}
					logger.WarnFields("wal_helper", "Edge recovery failed",
						logger.Uint64("item_id", e.ItemID),
						logger.Err(err),
					)
					return nil
				}
				recoveredCount++
			}

		case OpDelete:
			// Delete operations - currently not implemented for segmentation
			logger.DebugFields("wal_helper", "Delete operation skipped during recovery",
				logger.Uint64("segment_id", e.SegmentID),
				logger.Uint64("item_id", e.ItemID),
			)
		}

		return nil
	})

	if err != nil {
		gs.stats.walErrors++
		if gs.recoveryMode == "strict" {
			logger.ErrorFields("wal_helper", "WAL recovery failed (strict mode)",
				logger.Err(err),
			)
			return fmt.Errorf("WAL recovery failed: %w", err)
		}
		logger.ErrorFields("wal_helper", "WAL recovery had errors (non-strict mode)",
			logger.Err(err),
		)
	}

	gs.stats.walRecovery = uint64(recoveredCount)

	logger.InfoFields("wal_helper", "WAL recovery completed",
		logger.Int("duration_ms", int(time.Since(startTime).Milliseconds())),
		logger.Int("recovered_items", recoveredCount),
		logger.Int("corrupt_entries", corruptEntries),
		logger.Uint64("wal_errors", gs.stats.walErrors),
	)

	return nil
}

// ─── Recovery from Segment WALs ─────────────────────────────────────

// RecoverFromSegmentWALs بازیابی از WALهای جداگانه Segment
func (gs *GraphStorage) RecoverFromSegmentWALs() error {
	if gs.nodeWAL == nil || gs.edgeWAL == nil {
		logger.Debug("wal_helper", "No separate segment WALs to recover")
		return nil
	}

	gs.Mu.Lock()
	defer gs.Mu.Unlock()

	logger.Info("wal_helper", "Starting segment WAL recovery")
	startTime := time.Now()

	var recoveredNodes, recoveredEdges int
	var corruptEntries int

	// Recovery Node WAL
	logger.Info("wal_helper", "Recovering Node WAL...")
	err := gs.nodeWAL.Replay(context.Background(), func(e *Entry) error {
		if e.Op == OpPut {
			if err := gs.NodeSegManager.WriteItem(e.ItemID, e.Data); err != nil {
				corruptEntries++
				if gs.recoveryMode == "strict" {
					return fmt.Errorf("node segment recovery failed: %w", err)
				}
				logger.WarnFields("wal_helper", "Node segment recovery failed",
					logger.Uint64("item_id", e.ItemID),
					logger.Err(err),
				)
				return nil
			}
			recoveredNodes++
		}
		return nil
	})

	if err != nil && gs.recoveryMode == "strict" {
		logger.ErrorFields("wal_helper", "Node segment WAL recovery failed (strict mode)",
			logger.Err(err),
		)
		return fmt.Errorf("node segment WAL recovery failed: %w", err)
	}

	// Recovery Edge WAL
	logger.Info("wal_helper", "Recovering Edge WAL...")
	err = gs.edgeWAL.Replay(context.Background(), func(e *Entry) error {
		if e.Op == OpPut {
			if err := gs.EdgeSegManager.WriteItem(e.ItemID, e.Data); err != nil {
				corruptEntries++
				if gs.recoveryMode == "strict" {
					return fmt.Errorf("edge segment recovery failed: %w", err)
				}
				logger.WarnFields("wal_helper", "Edge segment recovery failed",
					logger.Uint64("item_id", e.ItemID),
					logger.Err(err),
				)
				return nil
			}
			recoveredEdges++
		}
		return nil
	})

	if err != nil && gs.recoveryMode == "strict" {
		logger.ErrorFields("wal_helper", "Edge segment WAL recovery failed (strict mode)",
			logger.Err(err),
		)
		return fmt.Errorf("edge segment WAL recovery failed: %w", err)
	}

	gs.stats.walRecovery += uint64(recoveredNodes + recoveredEdges)

	logger.InfoFields("wal_helper", "Segment WAL recovery completed",
		logger.Int("duration_ms", int(time.Since(startTime).Milliseconds())),
		logger.Int("recovered_nodes", recoveredNodes),
		logger.Int("recovered_edges", recoveredEdges),
		logger.Int("corrupt_entries", corruptEntries),
	)

	return nil
}