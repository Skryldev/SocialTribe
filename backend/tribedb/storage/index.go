package storage

import (
	"encoding/binary"
	"fmt"
	"hash/fnv"
	"os"
	"strings"
	"sync"

	"tribedb/logger"

	"github.com/edsrzf/mmap-go"
)

const (
	IndexHeaderSize    = 24
	IndexEntrySize     = 48
	DefaultBucketCount = 1024
	IndexMagicNumber   = 0x494E4458
	IndexVersion       = 1
)

type IndexEntry struct {
	Key    [32]byte
	Offset uint64
	Next   uint64
}

type IndexHeader struct {
	Magic      uint64
	Version    uint64
	EntryCount uint64
	_          [8]byte
}

type HashIndex struct {
	file        mmap.MMap
	fd          *os.File
	bucketCount uint64
	entryCount  uint64
	mu          sync.RWMutex
	cache       map[string]uint64
	dirty       bool
}

// ====== توابع کمکی ======

func hashKey(key string) uint64 {
	h := fnv.New64a()
	h.Write([]byte(key))
	return h.Sum64()
}

func (idx *HashIndex) getBucketIndex(key string) uint64 {
	return hashKey(key) % idx.bucketCount
}

func (idx *HashIndex) getBucketOffset(bucket uint64) uint64 {
	return IndexHeaderSize + (bucket * 8)
}

func (idx *HashIndex) getEntryOffset(entryIndex uint64) uint64 {
	headerSize := IndexHeaderSize + (idx.bucketCount * 8)
	return headerSize + (entryIndex * IndexEntrySize)
}

func (idx *HashIndex) getHeaderOffset() uint64 {
	return 0
}

// ====== تبدیل کلید به [32]byte ======

func stringToKey(key string) [32]byte {
	var keyBytes [32]byte
	copy(keyBytes[:], key)
	return keyBytes
}

func keyToString(key [32]byte) string {
	for i := 0; i < len(key); i++ {
		if key[i] == 0 {
			return string(key[:i])
		}
	}
	return string(key[:])
}

// ====== ایجاد Index ======

func NewHashIndex(path string, bucketCount uint64) (*HashIndex, error) {
	if bucketCount == 0 {
		bucketCount = DefaultBucketCount
	}

	headerSize := IndexHeaderSize + (bucketCount * 8)
	initialSize := int64(headerSize + (1024 * IndexEntrySize))

	fd, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		logger.ErrorFields("index", "Failed to open index file",
			logger.Err(err),
			logger.String("path", path),
		)
		return nil, fmt.Errorf("open index file: %w", err)
	}

	fileInfo, err := fd.Stat()
	if err != nil {
		fd.Close()
		logger.ErrorFields("index", "Failed to stat index file",
			logger.Err(err),
			logger.String("path", path),
		)
		return nil, fmt.Errorf("stat index file: %w", err)
	}

	if fileInfo.Size() == 0 {
		if err := fd.Truncate(initialSize); err != nil {
			fd.Close()
			logger.ErrorFields("index", "Failed to truncate index file",
				logger.Err(err),
				logger.String("path", path),
			)
			return nil, fmt.Errorf("truncate index file: %w", err)
		}
	}

	mm, err := mmap.Map(fd, mmap.RDWR, 0)
	if err != nil {
		fd.Close()
		logger.ErrorFields("index", "Failed to mmap index file",
			logger.Err(err),
			logger.String("path", path),
		)
		return nil, fmt.Errorf("mmap index file: %w", err)
	}

	idx := &HashIndex{
		file:        mm,
		fd:          fd,
		bucketCount: bucketCount,
		cache:       make(map[string]uint64),
		dirty:       false,
		entryCount:  0,
	}

	if fileInfo.Size() == 0 {
		if err := idx.initialize(); err != nil {
			mm.Unmap()
			fd.Close()
			return nil, err
		}
		logger.InfoFields("index", "HashIndex created and initialized",
			logger.String("path", path),
			logger.Uint64("bucket_count", bucketCount),
		)
	} else {
		if err := idx.load(); err != nil {
			logger.WarnFields("index", "Index load failed, reinitializing",
				logger.Err(err),
				logger.String("path", path),
			)
			if err := idx.initialize(); err != nil {
				mm.Unmap()
				fd.Close()
				return nil, err
			}
		}
		logger.InfoFields("index", "HashIndex loaded from file",
			logger.String("path", path),
			logger.Uint64("entry_count", idx.entryCount),
		)
	}

	return idx, nil
}

// ====== مقداردهی اولیه ======

func (idx *HashIndex) initialize() error {
	header := IndexHeader{
		Magic:      IndexMagicNumber,
		Version:    IndexVersion,
		EntryCount: 0,
	}
	if err := idx.writeHeader(header); err != nil {
		return err
	}

	for i := uint64(0); i < idx.bucketCount; i++ {
		offset := idx.getBucketOffset(i)
		if offset+8 > uint64(len(idx.file)) {
			return fmt.Errorf("bucket offset out of range: %d", offset)
		}
		binary.LittleEndian.PutUint64(idx.file[offset:offset+8], 0)
	}

	idx.entryCount = 0
	idx.cache = make(map[string]uint64)
	idx.dirty = false

	return idx.file.Flush()
}

func (idx *HashIndex) load() error {
	header, err := idx.readHeader()
	if err != nil {
		return err
	}

	if header.Magic != IndexMagicNumber {
		return fmt.Errorf("invalid magic number: %x", header.Magic)
	}
	if header.Version != IndexVersion {
		return fmt.Errorf("unsupported version: %d", header.Version)
	}

	idx.entryCount = header.EntryCount

	// پر کردن cache (فقط اگر تعداد entries کم باشد)
	if idx.entryCount < 10000 {
		for i := uint64(0); i < idx.entryCount; i++ {
			entryOffset := idx.getEntryOffset(i)
			if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
				break
			}
			entry := idx.readEntry(entryOffset)
			key := keyToString(entry.Key)
			if key != "" {
				idx.cache[key] = entry.Offset
			}
		}
	}

	return nil
}

// ====== عملیات خواندن/نوشتن هدر ======

func (idx *HashIndex) writeHeader(header IndexHeader) error {
	offset := idx.getHeaderOffset()
	if offset+IndexHeaderSize > uint64(len(idx.file)) {
		return fmt.Errorf("header offset out of range")
	}

	data := idx.file[offset : offset+IndexHeaderSize]
	binary.LittleEndian.PutUint64(data[0:8], header.Magic)
	binary.LittleEndian.PutUint64(data[8:16], header.Version)
	binary.LittleEndian.PutUint64(data[16:24], header.EntryCount)

	return nil
}

func (idx *HashIndex) readHeader() (IndexHeader, error) {
	offset := idx.getHeaderOffset()
	if offset+IndexHeaderSize > uint64(len(idx.file)) {
		return IndexHeader{}, fmt.Errorf("header offset out of range")
	}

	data := idx.file[offset : offset+IndexHeaderSize]
	return IndexHeader{
		Magic:      binary.LittleEndian.Uint64(data[0:8]),
		Version:    binary.LittleEndian.Uint64(data[8:16]),
		EntryCount: binary.LittleEndian.Uint64(data[16:24]),
	}, nil
}

func (idx *HashIndex) updateEntryCount() error {
	offset := idx.getHeaderOffset() + 16
	if offset+8 > uint64(len(idx.file)) {
		return fmt.Errorf("entry count offset out of range")
	}
	binary.LittleEndian.PutUint64(idx.file[offset:offset+8], idx.entryCount)
	idx.dirty = true
	return nil
}

// ====== عملیات اصلی ======

func (idx *HashIndex) Insert(key string, offset uint64) error {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("empty key")
	}
	if len(key) > 32 {
		return fmt.Errorf("key too long: %d > 32", len(key))
	}

	bucketIdx := idx.getBucketIndex(key)
	bucketOffset := idx.getBucketOffset(bucketIdx)

	// بررسی وجود کلید
	entryIdx := binary.LittleEndian.Uint64(idx.file[bucketOffset:])
	for entryIdx != 0 {
		entryOffset := idx.getEntryOffset(entryIdx)
		entry := idx.readEntry(entryOffset)

		if keyToString(entry.Key) == key {
			// به‌روزرسانی offset
			idx.writeEntryOffset(entryOffset, offset)
			idx.cache[key] = offset
			idx.dirty = true

			logger.DebugFields("index", "Index entry updated",
				logger.String("key", key),
				logger.Uint64("offset", offset),
			)
			return nil
		}

		entryIdx = entry.Next
	}

	// ایجاد entry جدید
	newEntryIdx := idx.entryCount
	newEntryOffset := idx.getEntryOffset(newEntryIdx)

	if err := idx.ensureSpace(newEntryOffset); err != nil {
		logger.ErrorFields("index", "Failed to ensure space for new entry",
			logger.Err(err),
			logger.String("key", key),
		)
		return err
	}

	entry := IndexEntry{
		Key:    stringToKey(key),
		Offset: offset,
		Next:   binary.LittleEndian.Uint64(idx.file[bucketOffset:]),
	}

	idx.writeEntry(newEntryOffset, entry)
	idx.entryCount++

	binary.LittleEndian.PutUint64(idx.file[bucketOffset:], newEntryIdx)

	if err := idx.updateEntryCount(); err != nil {
		return err
	}

	idx.cache[key] = offset
	idx.dirty = true

	logger.DebugFields("index", "Index entry inserted",
		logger.String("key", key),
		logger.Uint64("offset", offset),
		logger.Uint64("entry_index", newEntryIdx),
	)
	return nil
}

func (idx *HashIndex) Get(key string) (uint64, bool) {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	key = strings.TrimSpace(key)
	if key == "" {
		return 0, false
	}

	// چک کردن cache
	if offset, ok := idx.cache[key]; ok {
		return offset, true
	}

	// جستجو در ایندکس
	bucketIdx := idx.getBucketIndex(key)
	bucketOffset := idx.getBucketOffset(bucketIdx)

	entryIdx := binary.LittleEndian.Uint64(idx.file[bucketOffset:])
	for entryIdx != 0 {
		entryOffset := idx.getEntryOffset(entryIdx)
		if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
			return 0, false
		}

		entry := idx.readEntry(entryOffset)
		entryKey := keyToString(entry.Key)

		if entryKey == key {
			idx.cache[key] = entry.Offset
			return entry.Offset, true
		}

		entryIdx = entry.Next
	}

	return 0, false
}

func (idx *HashIndex) Delete(key string) error {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	key = strings.TrimSpace(key)
	if key == "" {
		return fmt.Errorf("empty key")
	}

	bucketIdx := idx.getBucketIndex(key)
	bucketOffset := idx.getBucketOffset(bucketIdx)

	entryIdx := binary.LittleEndian.Uint64(idx.file[bucketOffset:])
	var prevIdx uint64 = 0

	for entryIdx != 0 {
		entryOffset := idx.getEntryOffset(entryIdx)
		if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
			return fmt.Errorf("invalid entry offset")
		}

		entry := idx.readEntry(entryOffset)
		entryKey := keyToString(entry.Key)

		if entryKey == key {
			// حذف از زنجیره
			if prevIdx == 0 {
				binary.LittleEndian.PutUint64(idx.file[bucketOffset:], entry.Next)
			} else {
				prevOffset := idx.getEntryOffset(prevIdx)
				prevEntry := idx.readEntry(prevOffset)
				prevEntry.Next = entry.Next
				idx.writeEntry(prevOffset, prevEntry)
			}

			// پاک کردن entry
			idx.clearEntry(entryOffset)

			delete(idx.cache, key)
			idx.dirty = true

			logger.DebugFields("index", "Index entry deleted",
				logger.String("key", key),
			)
			return nil
		}

		prevIdx = entryIdx
		entryIdx = entry.Next
	}

	return fmt.Errorf("key not found: %s", key)
}

// ====== توابع کمکی ======

func (idx *HashIndex) clearEntry(offset uint64) {
	data := idx.file[offset : offset+IndexEntrySize]
	for i := range data {
		data[i] = 0
	}
}

func (idx *HashIndex) ensureSpace(offset uint64) error {
	neededSize := offset + IndexEntrySize
	if uint64(len(idx.file)) >= neededSize {
		return nil
	}

	newSize := int64(neededSize * 2)
	if err := idx.fd.Truncate(newSize); err != nil {
		return fmt.Errorf("grow index file: %w", err)
	}

	if err := idx.file.Unmap(); err != nil {
		return fmt.Errorf("unmap for resize: %w", err)
	}

	mm, err := mmap.Map(idx.fd, mmap.RDWR, 0)
	if err != nil {
		return fmt.Errorf("remap after resize: %w", err)
	}
	idx.file = mm

	logger.DebugFields("index", "Index file grown",
		logger.Int("new_size_bytes", int(newSize)),
		logger.Uint64("entry_count", idx.entryCount),
	)
	return nil
}

func (idx *HashIndex) readEntry(offset uint64) IndexEntry {
	data := idx.file[offset : offset+IndexEntrySize]
	var entry IndexEntry
	copy(entry.Key[:], data[0:32])
	entry.Offset = binary.LittleEndian.Uint64(data[32:40])
	entry.Next = binary.LittleEndian.Uint64(data[40:48])
	return entry
}

func (idx *HashIndex) writeEntry(offset uint64, entry IndexEntry) {
	data := idx.file[offset : offset+IndexEntrySize]
	copy(data[0:32], entry.Key[:])
	binary.LittleEndian.PutUint64(data[32:40], entry.Offset)
	binary.LittleEndian.PutUint64(data[40:48], entry.Next)
}

func (idx *HashIndex) writeEntryOffset(offset uint64, newOffset uint64) {
	data := idx.file[offset+32 : offset+40]
	binary.LittleEndian.PutUint64(data, newOffset)
}

// ====== متدهای مدیریتی ======

func (idx *HashIndex) Flush() error {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	if !idx.dirty {
		return nil
	}

	if err := idx.file.Flush(); err != nil {
		logger.ErrorFields("index", "Failed to flush index",
			logger.Err(err),
		)
		return fmt.Errorf("flush index: %w", err)
	}

	idx.dirty = false
	return nil
}

// CloseIndexFile closes the index file
func (idx *HashIndex) CloseIndexFile() error {
	logger.Info("index", "Closing HashIndex...")

	idx.mu.Lock()
	defer idx.mu.Unlock()

	var errs []error

	if err := idx.file.Flush(); err != nil {
		logger.ErrorFields("index", "Failed to flush on close",
			logger.Err(err),
		)
		errs = append(errs, fmt.Errorf("flush: %w", err))
	}

	if err := idx.file.Unmap(); err != nil {
		logger.ErrorFields("index", "Failed to unmap on close",
			logger.Err(err),
		)
		errs = append(errs, fmt.Errorf("unmap: %w", err))
	}

	if err := idx.fd.Close(); err != nil {
		logger.ErrorFields("index", "Failed to close file descriptor",
			logger.Err(err),
		)
		errs = append(errs, fmt.Errorf("close: %w", err))
	}

	if len(errs) > 0 {
		logger.ErrorFields("index", "Close completed with errors",
			logger.Int("error_count", len(errs)),
		)
		return fmt.Errorf("close errors: %v", errs)
	}

	logger.Info("index", "HashIndex closed successfully")
	return nil
}

func (idx *HashIndex) Stats() map[string]interface{} {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	totalEntries := idx.entryCount
	usedBuckets := uint64(0)
	for i := uint64(0); i < idx.bucketCount; i++ {
		offset := idx.getBucketOffset(i)
		if offset+8 <= uint64(len(idx.file)) {
			if binary.LittleEndian.Uint64(idx.file[offset:offset+8]) != 0 {
				usedBuckets++
			}
		}
	}

	return map[string]interface{}{
		"bucket_count":       idx.bucketCount,
		"entry_count":        idx.entryCount,
		"cache_size":         len(idx.cache),
		"load_factor":        float64(totalEntries) / float64(idx.bucketCount),
		"bucket_utilization": float64(usedBuckets) / float64(idx.bucketCount) * 100,
		"dirty":              idx.dirty,
	}
}

// ====== متدهای بازیابی ======

func (idx *HashIndex) Repair() error {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	idx.cache = make(map[string]uint64)

	for i := uint64(0); i < idx.entryCount; i++ {
		entryOffset := idx.getEntryOffset(i)
		if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
			break
		}
		entry := idx.readEntry(entryOffset)
		key := keyToString(entry.Key)
		if key != "" {
			idx.cache[key] = entry.Offset
		}
	}

	logger.InfoFields("index", "Index repaired",
		logger.Int("cache_entries", len(idx.cache)),
	)
	return nil
}

// ============================================================================
// ✅ NEW: ScanAll - پیمایش همه کلیدهای موجود در ایندکس
// ============================================================================

// ScanAll returns a buffered channel that yields all non-empty keys in the index.
// This is designed for rebuilding in-memory indexes (e.g., edgeIndex) on startup.
//
// Usage:
//
//	for key := range index.ScanAll() {
//	    // process key
//	}
//
// Important notes:
//   - The channel is buffered (size 100) to avoid goroutine leaks
//   - The scan holds a read lock for the entire duration - do NOT call other
//     HashIndex methods from the consumer goroutine (deadlock risk)
//   - Keys are returned in no guaranteed order
//   - Deleted/tombstone entries are not returned
func (idx *HashIndex) ScanAll() <-chan string {
	ch := make(chan string, 100) // buffered to prevent goroutine leak

	go func() {
		defer close(ch)

		idx.mu.RLock()
		defer idx.mu.RUnlock()

		scannedCount := uint64(0)
		emptyCount := uint64(0)

		// پیمایش خطی همه entryها
		for i := uint64(0); i < idx.entryCount; i++ {
			entryOffset := idx.getEntryOffset(i)

			// بررسی محدوده امن
			if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
				logger.WarnFields("index", "ScanAll: entry offset out of bounds",
					logger.Uint64("entry_index", i),
					logger.Uint64("offset", entryOffset),
					logger.Int("file_size", len(idx.file)),
				)
				break
			}

			entry := idx.readEntry(entryOffset)
			key := keyToString(entry.Key)

			if key != "" {
				// ارسال کلید به channel
				// اگر channel پر باشد، اینجا block می‌شود تا consumer بخواند
				ch <- key
				scannedCount++
			} else {
				emptyCount++
			}
		}

		logger.DebugFields("index", "ScanAll completed",
			logger.Uint64("entry_count", idx.entryCount),
			logger.Uint64("scanned_keys", scannedCount),
			logger.Uint64("empty_entries", emptyCount),
		)
	}()

	return ch
}

// ====== متد دیباگ ======

func (idx *HashIndex) Debug() map[string]interface{} {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	keys := []string{}
	for i := uint64(0); i < idx.entryCount && i < 100; i++ {
		entryOffset := idx.getEntryOffset(i)
		if entryOffset+IndexEntrySize > uint64(len(idx.file)) {
			break
		}
		entry := idx.readEntry(entryOffset)
		key := keyToString(entry.Key)
		if key != "" {
			keys = append(keys, fmt.Sprintf("%s->%d", key, entry.Offset))
		}
	}

	return map[string]interface{}{
		"entry_count": idx.entryCount,
		"cache_size":  len(idx.cache),
		"keys_sample": keys,
	}
}