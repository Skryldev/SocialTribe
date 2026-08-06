package storage

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"hash/crc32"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"tribedb/logger"
)

// ─── constants ────────────────────────────────────────────────────────────────

const (
	HeaderSize           = 33
	MaxDataSize          = 1 << 20
	DefaultMaxSize       = 64 << 20
	DefaultMaxRotated    = 10
	DefaultBufSize       = 64 << 10
	DefaultBatchSize     = 1000
	DefaultFlushInterval = 100 * time.Millisecond
	baseFilename         = "node_wal.log"
)

// ─── operations ───────────────────────────────────────────────────────────────

type Op uint8

const (
	OpPut    Op = 1
	OpDelete Op = 2
)

// ─── entry ────────────────────────────────────────────────────────────────────

type Entry struct {
	SegmentID uint64
	ItemID    uint64
	Op        Op
	Data      []byte
	Timestamp int64
	_canary   uint64 // 🔒 Canary for corruption detection
}

func (e *Entry) Clone() *Entry {
	if e == nil {
		return nil
	}
	data := make([]byte, len(e.Data))
	copy(data, e.Data)
	return &Entry{
		SegmentID: e.SegmentID,
		ItemID:    e.ItemID,
		Op:        e.Op,
		Data:      data,
		Timestamp: e.Timestamp,
	}
}

func (e *Entry) Size() int64 {
	return int64(HeaderSize + len(e.Data))
}

// ─── errors ───────────────────────────────────────────────────────────────────

var (
	ErrChecksumMismatch = errors.New("wal: checksum mismatch")
	ErrDataTooLarge     = errors.New("wal: data payload exceeds limit")
	ErrClosed           = errors.New("wal: log is closed")
	ErrEmptyBatch       = errors.New("wal: empty batch")
	ErrBatchTooLarge    = errors.New("wal: batch too large")
)

// ─── options ──────────────────────────────────────────────────────────────────

type Options struct {
	Dir            string
	MaxSize        int64
	MaxRotated     int
	BufSize        int
	NoSync         bool
	BatchSize      int
	FlushInterval  time.Duration
	Logger         interface{} // kept for backward compat, ignored
	OnError        func(error)
}

func (o *Options) withDefaults() Options {
	out := *o
	if out.MaxSize <= 0 {
		out.MaxSize = DefaultMaxSize
	}
	if out.MaxRotated <= 0 {
		out.MaxRotated = DefaultMaxRotated
	}
	if out.BufSize <= 0 {
		out.BufSize = DefaultBufSize
	}
	if out.BatchSize <= 0 {
		out.BatchSize = DefaultBatchSize
	}
	if out.FlushInterval <= 0 {
		out.FlushInterval = DefaultFlushInterval
	}
	return out
}

// ─── metrics ──────────────────────────────────────────────────────────────────

type Metrics struct {
	TotalWrites     int64
	TotalBatches    int64
	TotalBytes      int64
	TotalRotation   int64
	TotalErrors     int64
	TotalCorrupt    int64
	ReplayDuration  int64
	LastFlushTime   int64
	CurrentFileSize int64
}

type atomicMetrics struct {
	TotalWrites     atomic.Int64
	TotalBatches    atomic.Int64
	TotalBytes      atomic.Int64
	TotalRotation   atomic.Int64
	TotalErrors     atomic.Int64
	TotalCorrupt    atomic.Int64
	ReplayDuration  atomic.Int64
	LastFlushTime   atomic.Int64
	CurrentFileSize atomic.Int64
}

// ─── WAL ──────────────────────────────────────────────────────────────────────

type WAL struct {
	opts    Options
	mu      sync.Mutex
	file    *os.File
	buf     *bufio.Writer
	size    int64
	closed  bool
	metrics atomicMetrics

	flushTicker *time.Ticker
	flushDone   chan struct{}
	flushWg     sync.WaitGroup

	replayMu    sync.Mutex
	isReplaying bool
}

// Open creates or opens the WAL with the given options.
func Open(opts Options) (*WAL, error) {
	opts = opts.withDefaults()

	if err := os.MkdirAll(opts.Dir, 0o755); err != nil {
		logger.ErrorFields("wal", "Failed to create WAL directory",
			logger.Err(err),
			logger.String("dir", opts.Dir),
		)
		return nil, fmt.Errorf("wal: create directory %q: %w", opts.Dir, err)
	}

	path := filepath.Join(opts.Dir, baseFilename)
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_RDWR, 0o644)
	if err != nil {
		logger.ErrorFields("wal", "Failed to open WAL file",
			logger.Err(err),
			logger.String("path", path),
		)
		return nil, fmt.Errorf("wal: open %q: %w", path, err)
	}

	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		logger.ErrorFields("wal", "Failed to stat WAL file",
			logger.Err(err),
			logger.String("path", path),
		)
		return nil, fmt.Errorf("wal: stat %q: %w", path, err)
	}

	w := &WAL{
		opts:      opts,
		file:      f,
		size:      info.Size(),
		flushDone: make(chan struct{}),
	}
	w.buf = bufio.NewWriterSize(f, opts.BufSize)
	w.metrics.CurrentFileSize.Store(info.Size())

	if opts.FlushInterval > 0 {
		w.flushTicker = time.NewTicker(opts.FlushInterval)
		w.flushWg.Add(1)
		go w.backgroundFlusher()
	}

	logger.InfoFields("wal", "WAL opened",
		logger.String("dir", opts.Dir),
		logger.Int("size", int(info.Size())),
		logger.Int("max_size", int(opts.MaxSize)),
		logger.Int("max_rotated", opts.MaxRotated),
		logger.Bool("sync_enabled", !opts.NoSync),
	)

	return w, nil
}

// ─── public API ──────────────────────────────────────────────────────────────

func (w *WAL) Append(e *Entry) error {
	if len(e.Data) > MaxDataSize {
		return fmt.Errorf("%w: got %d bytes", ErrDataTooLarge, len(e.Data))
	}

	entrySize := e.Size()

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return ErrClosed
	}

	if err := w.ensureSpaceLocked(entrySize); err != nil {
		w.metrics.TotalErrors.Add(1)
		return fmt.Errorf("wal: ensure space: %w", err)
	}

	hdr := w.marshalHeader(e)
	if err := w.writeEntryLocked(hdr, e.Data, entrySize); err != nil {
		return err
	}

	w.metrics.TotalWrites.Add(1)
	w.metrics.TotalBytes.Add(entrySize)
	return nil
}

func (w *WAL) AppendBatch(batch *Batch) error {
	if batch == nil || batch.Len() == 0 {
		return ErrEmptyBatch
	}

	batch.mu.Lock()
	defer batch.mu.Unlock()

	totalSize := batch.size
	if totalSize > w.opts.MaxSize {
		return fmt.Errorf("%w: batch size %d exceeds max size %d",
			ErrBatchTooLarge, totalSize, w.opts.MaxSize)
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return ErrClosed
	}

	if err := w.ensureSpaceLocked(totalSize); err != nil {
		w.metrics.TotalErrors.Add(1)
		return fmt.Errorf("wal: ensure space for batch: %w", err)
	}

	for _, e := range batch.entries {
		hdr := w.marshalHeader(e)
		if err := w.writeEntryLocked(hdr, e.Data, e.Size()); err != nil {
			w.metrics.TotalErrors.Add(1)
			return fmt.Errorf("wal: write batch entry: %w", err)
		}
	}

	w.metrics.TotalBatches.Add(1)
	w.metrics.TotalWrites.Add(int64(len(batch.entries)))
	w.metrics.TotalBytes.Add(totalSize)

	batch.Reset()
	return nil
}

func (w *WAL) Replay(ctx context.Context, fn func(*Entry) error) error {
	startTime := time.Now()
	defer func() {
		w.metrics.ReplayDuration.Add(time.Since(startTime).Nanoseconds())
	}()

	w.replayMu.Lock()
	defer w.replayMu.Unlock()

	w.mu.Lock()
	w.isReplaying = true
	w.mu.Unlock()

	defer func() {
		w.mu.Lock()
		w.isReplaying = false
		w.mu.Unlock()
	}()

	w.mu.Lock()
	if err := w.buf.Flush(); err != nil {
		w.mu.Unlock()
		return fmt.Errorf("wal: flush before replay: %w", err)
	}
	w.mu.Unlock()

	files, err := w.rotatedFiles()
	if err != nil {
		return fmt.Errorf("wal: list rotated files: %w", err)
	}

	allFiles := make([]string, 0, len(files)+1)
	allFiles = append(allFiles, files...)
	allFiles = append(allFiles, filepath.Join(w.opts.Dir, baseFilename))

	logger.InfoFields("wal", "Starting WAL replay",
		logger.Int("file_count", len(allFiles)),
	)

	for _, path := range allFiles {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := w.replayFile(ctx, path, fn); err != nil {
			return err
		}
	}

	logger.InfoFields("wal", "WAL replay completed",
		logger.Int("duration_ms", int(time.Since(startTime).Milliseconds())),
		logger.Int("files_processed", len(allFiles)),
	)

	return nil
}

func (w *WAL) Truncate() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return ErrClosed
	}

	if err := w.buf.Flush(); err != nil {
		return fmt.Errorf("wal: flush before truncate: %w", err)
	}

	files, err := w.rotatedFiles()
	if err != nil {
		return fmt.Errorf("wal: list rotated files: %w", err)
	}

	var deleteErrors []error
	for _, f := range files {
		if err := os.Remove(f); err != nil && !errors.Is(err, os.ErrNotExist) {
			deleteErrors = append(deleteErrors, fmt.Errorf("remove %q: %w", f, err))
		} else {
			logger.DebugFields("wal", "Deleted rotated file",
				logger.String("path", f),
			)
		}
	}

	if len(deleteErrors) > 0 {
		return fmt.Errorf("wal: delete errors: %v", deleteErrors)
	}

	if err := w.file.Truncate(0); err != nil {
		return fmt.Errorf("wal: truncate active log: %w", err)
	}
	if _, err := w.file.Seek(0, io.SeekStart); err != nil {
		return fmt.Errorf("wal: seek active log: %w", err)
	}
	w.buf.Reset(w.file)
	w.size = 0
	w.metrics.CurrentFileSize.Store(0)

	logger.Info("wal", "WAL truncated")
	return nil
}

func (w *WAL) Sync() error {
	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return ErrClosed
	}

	if err := w.buf.Flush(); err != nil {
		return fmt.Errorf("wal: flush: %w", err)
	}

	if !w.opts.NoSync {
		if err := w.file.Sync(); err != nil {
			return fmt.Errorf("wal: fsync: %w", err)
		}
	}

	w.metrics.LastFlushTime.Store(time.Now().UnixNano())
	return nil
}

// CloseWALFile closes the WAL gracefully
func (w *WAL) CloseWALFile() error {
	logger.Info("wal", "Closing WAL...")

	if w.flushTicker != nil {
		w.flushTicker.Stop()
		close(w.flushDone)
		w.flushWg.Wait()
	}

	w.mu.Lock()
	defer w.mu.Unlock()

	if w.closed {
		return ErrClosed
	}
	w.closed = true

	if err := w.buf.Flush(); err != nil {
		_ = w.file.Close()
		logger.ErrorFields("wal", "Failed to flush on close",
			logger.Err(err),
		)
		return fmt.Errorf("wal: flush on close: %w", err)
	}

	if !w.opts.NoSync {
		if err := w.file.Sync(); err != nil {
			_ = w.file.Close()
			logger.ErrorFields("wal", "Failed to fsync on close",
				logger.Err(err),
			)
			return fmt.Errorf("wal: fsync on close: %w", err)
		}
	}

	if err := w.file.Close(); err != nil {
		logger.ErrorFields("wal", "Failed to close file",
			logger.Err(err),
		)
		return fmt.Errorf("wal: close file: %w", err)
	}

	logger.InfoFields("wal", "WAL closed",
		logger.Int("final_size", int(w.size)),
		logger.Int("total_writes", int(w.metrics.TotalWrites.Load())),
		logger.Int("total_bytes", int(w.metrics.TotalBytes.Load())),
	)
	return nil
}

// Metrics returns a snapshot of the current metrics.
func (w *WAL) Metrics() Metrics {
	return Metrics{
		TotalWrites:     w.metrics.TotalWrites.Load(),
		TotalBatches:    w.metrics.TotalBatches.Load(),
		TotalBytes:      w.metrics.TotalBytes.Load(),
		TotalRotation:   w.metrics.TotalRotation.Load(),
		TotalErrors:     w.metrics.TotalErrors.Load(),
		TotalCorrupt:    w.metrics.TotalCorrupt.Load(),
		ReplayDuration:  w.metrics.ReplayDuration.Load(),
		LastFlushTime:   w.metrics.LastFlushTime.Load(),
		CurrentFileSize: w.metrics.CurrentFileSize.Load(),
	}
}

// ─── internal methods ──────────────────────────────────────────────────────

func (w *WAL) backgroundFlusher() {
	defer w.flushWg.Done()

	for {
		select {
		case <-w.flushTicker.C:
			w.mu.Lock()
			if !w.closed && w.buf.Buffered() > 0 {
				if err := w.buf.Flush(); err != nil {
					w.metrics.TotalErrors.Add(1)
					logger.ErrorFields("wal", "Background flush failed",
						logger.Err(err),
					)
				} else {
					w.metrics.LastFlushTime.Store(time.Now().UnixNano())
				}
			}
			w.mu.Unlock()
		case <-w.flushDone:
			return
		}
	}
}

func (w *WAL) ensureSpaceLocked(need int64) error {
	if w.size+need <= w.opts.MaxSize {
		return nil
	}

	logger.InfoFields("wal", "Rotating WAL",
		logger.Int("current_size", int(w.size)),
		logger.Int("need", int(need)),
		logger.Int("max_size", int(w.opts.MaxSize)),
	)

	if err := w.rotateLocked(); err != nil {
		return err
	}
	return nil
}

func (w *WAL) writeEntryLocked(hdr [HeaderSize]byte, data []byte, size int64) error {
	if _, err := w.buf.Write(hdr[:]); err != nil {
		w.metrics.TotalErrors.Add(1)
		return fmt.Errorf("wal: write header: %w", err)
	}

	if len(data) > 0 {
		if _, err := w.buf.Write(data); err != nil {
			w.metrics.TotalErrors.Add(1)
			return fmt.Errorf("wal: write data: %w", err)
		}
	}

	if w.buf.Available() < HeaderSize*2 {
		if err := w.buf.Flush(); err != nil {
			w.metrics.TotalErrors.Add(1)
			return fmt.Errorf("wal: flush: %w", err)
		}
		w.metrics.LastFlushTime.Store(time.Now().UnixNano())
	}

	if !w.opts.NoSync {
		if err := w.file.Sync(); err != nil {
			w.metrics.TotalErrors.Add(1)
			return fmt.Errorf("wal: fsync: %w", err)
		}
	}

	w.size += size
	w.metrics.CurrentFileSize.Store(w.size)
	return nil
}

func (w *WAL) rotateLocked() error {
	if err := w.buf.Flush(); err != nil {
		return fmt.Errorf("flush: %w", err)
	}

	if !w.opts.NoSync {
		if err := w.file.Sync(); err != nil {
			return fmt.Errorf("fsync: %w", err)
		}
	}

	if err := w.file.Close(); err != nil {
		return fmt.Errorf("close active: %w", err)
	}

	activePath := filepath.Join(w.opts.Dir, baseFilename)
	rotated := fmt.Sprintf("%s.%d", activePath, time.Now().UnixNano())

	if err := os.Rename(activePath, rotated); err != nil {
		return fmt.Errorf("rename: %w", err)
	}

	f, err := os.OpenFile(activePath, os.O_CREATE|os.O_APPEND|os.O_RDWR, 0o644)
	if err != nil {
		return fmt.Errorf("open new active: %w", err)
	}

	w.file = f
	w.buf = bufio.NewWriterSize(f, w.opts.BufSize)
	w.size = 0
	w.metrics.CurrentFileSize.Store(0)
	w.metrics.TotalRotation.Add(1)

	go func() {
		if err := w.pruneRotated(); err != nil {
			if w.opts.OnError != nil {
				w.opts.OnError(fmt.Errorf("prune rotated files: %w", err))
			} else {
				logger.WarnFields("wal", "Failed to prune rotated files",
					logger.Err(err),
				)
			}
		}
	}()

	logger.InfoFields("wal", "WAL rotated",
		logger.String("new_file", rotated),
	)
	return nil
}

func (w *WAL) marshalHeader(e *Entry) [HeaderSize]byte {
	if e.Timestamp == 0 {
		e.Timestamp = time.Now().UnixNano()
	}

	var hdr [HeaderSize]byte
	binary.LittleEndian.PutUint64(hdr[0:8], e.SegmentID)
	binary.LittleEndian.PutUint64(hdr[8:16], e.ItemID)
	hdr[16] = uint8(e.Op)
	binary.LittleEndian.PutUint32(hdr[17:21], uint32(len(e.Data)))
	binary.LittleEndian.PutUint64(hdr[21:29], uint64(e.Timestamp))

	crc := crc32.NewIEEE()
	_, _ = crc.Write(hdr[:29])
	if len(e.Data) > 0 {
		_, _ = crc.Write(e.Data)
	}
	checksum := crc.Sum32()
	binary.LittleEndian.PutUint32(hdr[29:33], checksum)

	return hdr
}

func (w *WAL) replayFile(ctx context.Context, path string, fn func(*Entry) error) error {
	f, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("wal: open %q: %w", path, err)
	}
	defer f.Close()

	r := bufio.NewReader(f)
	entryCount := 0
	corruptCount := 0

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		var hdrBuf [HeaderSize]byte
		if _, err := io.ReadFull(r, hdrBuf[:]); err != nil {
			if errors.Is(err, io.EOF) || errors.Is(err, io.ErrUnexpectedEOF) {
				break
			}
			return fmt.Errorf("wal: read header in %q: %w", path, err)
		}

		segID, itemID, op, dataLen, ts, storedCRC := w.unmarshalHeader(hdrBuf)

		if dataLen > MaxDataSize {
			w.metrics.TotalCorrupt.Add(1)
			corruptCount++
			logger.WarnFields("wal", "Skipping entry: data length exceeds max",
				logger.String("path", path),
				logger.Uint64("length", uint64(dataLen)),
				logger.Int("max", MaxDataSize),
			)
			break
		}

		var data []byte
		if dataLen > 0 {
			data = make([]byte, dataLen)
			if _, err := io.ReadFull(r, data); err != nil {
				w.metrics.TotalCorrupt.Add(1)
				corruptCount++
				logger.WarnFields("wal", "Skipping truncated entry",
					logger.String("path", path),
					logger.Err(err),
				)
				break
			}
		}

		crc := crc32.NewIEEE()
		_, _ = crc.Write(hdrBuf[:29])
		if len(data) > 0 {
			_, _ = crc.Write(data)
		}
		if got := crc.Sum32(); got != storedCRC {
			w.metrics.TotalCorrupt.Add(1)
			corruptCount++
			logger.WarnFields("wal", "Skipping corrupt entry: checksum mismatch",
				logger.String("path", path),
				logger.Uint64("expected", uint64(storedCRC)),
				logger.Uint64("actual", uint64(got)),
			)
			continue
		}

		e := &Entry{
			SegmentID: segID,
			ItemID:    itemID,
			Op:        op,
			Data:      data,
			Timestamp: ts,
		}

		if err := fn(e); err != nil {
			return fmt.Errorf("wal: replay callback: %w", err)
		}
		entryCount++
	}

	if entryCount > 0 || corruptCount > 0 {
		logger.DebugFields("wal", "Replayed file",
			logger.String("path", path),
			logger.Int("entries", entryCount),
			logger.Int("corrupt", corruptCount),
		)
	}

	return nil
}

func (w *WAL) unmarshalHeader(hdr [HeaderSize]byte) (segID, itemID uint64, op Op, dataLen uint32, ts int64, checksum uint32) {
	segID = binary.LittleEndian.Uint64(hdr[0:8])
	itemID = binary.LittleEndian.Uint64(hdr[8:16])
	op = Op(hdr[16])
	dataLen = binary.LittleEndian.Uint32(hdr[17:21])
	ts = int64(binary.LittleEndian.Uint64(hdr[21:29]))
	checksum = binary.LittleEndian.Uint32(hdr[29:33])
	return
}

func (w *WAL) rotatedFiles() ([]string, error) {
	entries, err := os.ReadDir(w.opts.Dir)
	if err != nil {
		return nil, err
	}

	type tsFile struct {
		ts   int64
		path string
	}
	var result []tsFile

	prefix := baseFilename + "."
	for _, de := range entries {
		name := de.Name()
		if !strings.HasPrefix(name, prefix) {
			continue
		}
		suffix := name[len(prefix):]
		ts, err := strconv.ParseInt(suffix, 10, 64)
		if err != nil {
			continue
		}
		result = append(result, tsFile{ts: ts, path: filepath.Join(w.opts.Dir, name)})
	}

	sort.Slice(result, func(i, j int) bool { return result[i].ts < result[j].ts })

	paths := make([]string, len(result))
	for i, r := range result {
		paths[i] = r.path
	}
	return paths, nil
}

func (w *WAL) pruneRotated() error {
	files, err := w.rotatedFiles()
	if err != nil {
		return err
	}

	if len(files) <= w.opts.MaxRotated {
		return nil
	}

	toDelete := files[:len(files)-w.opts.MaxRotated]
	for _, f := range toDelete {
		if err := os.Remove(f); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove %q: %w", f, err)
		}
		logger.DebugFields("wal", "Pruned rotated file",
			logger.String("path", f),
		)
	}

	return nil
}