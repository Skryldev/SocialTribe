// storage/bloom.go
package storage

import (
	"encoding/binary"
	"hash/fnv"
	"math"
	"os"
	"sync"

	"tribedb/logger"

	"github.com/edsrzf/mmap-go"
)

// ====== ساختار Bloom Filter ======

// BloomFilter ساختار اصلی
type BloomFilter struct {
	bits      []uint64 // آرایه بیت‌ها (هر uint64 = 64 بیت)
	size      uint64   // تعداد بیت‌ها
	hashFuncs uint8    // تعداد توابع هش
	count     uint64   // تعداد کلیدهای اضافه شده

	// برای ذخیره‌سازی روی دیسک
	file mmap.MMap
	fd   *os.File
	mu   sync.RWMutex
}

// ConfigBloom تنظیمات Bloom Filter
type ConfigBloom struct {
	ExpectedItems uint64  // تعداد تقریبی کلیدها
	FalsePositive float64 // نرخ خطای مجاز (مثلاً 0.01 = 1%)
	FilePath      string  // مسیر ذخیره‌سازی (اختیاری)
}

// ====== محاسبات ریاضی ======

// optimalSize محاسبه اندازه بهینه بیت‌ها
// فرمول: m = - (n * ln(p)) / (ln(2))^2
func optimalSize(n uint64, p float64) uint64 {
	if n == 0 {
		return 1024 // حداقل اندازه
	}
	m := -float64(n) * math.Log(p) / (math.Ln2 * math.Ln2)
	return uint64(math.Ceil(m))
}

// optimalHashFuncs محاسبه تعداد بهینه توابع هش
// فرمول: k = (m/n) * ln(2)
func optimalHashFuncs(m, n uint64) uint8 {
	if n == 0 {
		return 4 // پیش‌فرض
	}
	k := (float64(m) / float64(n)) * math.Ln2
	if k < 1 {
		return 1
	}
	if k > 30 {
		return 30
	}
	return uint8(math.Ceil(k))
}

// ====== ایجاد Bloom Filter ======

// NewBloomFilter ایجاد Bloom Filter جدید
func NewBloomFilter(cfg ConfigBloom) (*BloomFilter, error) {
	// محاسبه اندازه بهینه
	size := optimalSize(cfg.ExpectedItems, cfg.FalsePositive)
	if size < 64 {
		size = 64 // حداقل 64 بیت
	}

	// تعداد توابع هش
	hashFuncs := optimalHashFuncs(size, cfg.ExpectedItems)

	bf := &BloomFilter{
		bits:      make([]uint64, (size+63)/64), // تعداد uint64 مورد نیاز
		size:      size,
		hashFuncs: hashFuncs,
		count:     0,
	}

	logger.InfoFields("bloom", "Bloom filter created",
		logger.Uint64("expected_items", cfg.ExpectedItems),
		logger.Float64("false_positive_target", cfg.FalsePositive),
		logger.Uint64("size_bits", size),
		logger.Int("hash_functions", int(hashFuncs)),
	)

	// اگر فایل مشخص شده، بارگذاری کن
	if cfg.FilePath != "" {
		logger.InfoFields("bloom", "Loading bloom filter from file",
			logger.String("file_path", cfg.FilePath),
		)
		if err := bf.loadFromFile(cfg.FilePath); err != nil {
			logger.ErrorFields("bloom", "Failed to load bloom filter from file",
				logger.Err(err),
				logger.String("file_path", cfg.FilePath),
			)
			return nil, err
		}
		logger.InfoFields("bloom", "Bloom filter loaded from file",
			logger.Uint64("loaded_count", bf.count),
		)
	}

	return bf, nil
}

// ====== توابع هش ======

// hash تابع هش با seed متفاوت
func (bf *BloomFilter) hash(data []byte, seed uint32) uint64 {
	h := fnv.New64a()
	// اضافه کردن seed برای تولید هش‌های مختلف
	seedBytes := make([]byte, 4)
	binary.LittleEndian.PutUint32(seedBytes, seed)
	h.Write(seedBytes)
	h.Write(data)
	return h.Sum64() % bf.size
}

// getIndexes محاسبه همه موقعیت‌های بیت برای یک کلید
func (bf *BloomFilter) getIndexes(key string) []uint64 {
	data := []byte(key)
	indexes := make([]uint64, bf.hashFuncs)

	for i := uint8(0); i < bf.hashFuncs; i++ {
		indexes[i] = bf.hash(data, uint32(i))
	}

	return indexes
}

// ====== عملیات اصلی ======

// Add اضافه کردن کلید به Bloom Filter
func (bf *BloomFilter) Add(key string) {
	bf.mu.Lock()
	defer bf.mu.Unlock()

	indexes := bf.getIndexes(key)
	for _, idx := range indexes {
		// پیدا کردن uint64 مربوطه
		wordIdx := idx / 64
		bitIdx := idx % 64
		// تنظیم بیت
		bf.bits[wordIdx] |= 1 << bitIdx
	}
	bf.count++
}

// Contains بررسی وجود کلید (احتمالی)
func (bf *BloomFilter) Contains(key string) bool {
	bf.mu.RLock()
	defer bf.mu.RUnlock()

	indexes := bf.getIndexes(key)
	for _, idx := range indexes {
		wordIdx := idx / 64
		bitIdx := idx % 64
		// اگر هر بیتی صفر بود، قطعاً وجود ندارد
		if (bf.bits[wordIdx] & (1 << bitIdx)) == 0 {
			return false
		}
	}
	return true // احتمالاً وجود دارد
}

// ====== آمار و اطلاعات ======

// Stats آمار Bloom Filter
func (bf *BloomFilter) Stats() map[string]interface{} {
	bf.mu.RLock()
	defer bf.mu.RUnlock()

	// محاسبه تعداد بیت‌های 1
	ones := uint64(0)
	for _, word := range bf.bits {
		ones += uint64(popcount(word))
	}

	// محاسبه نرخ خطای فعلی
	// p ≈ (1 - e^(-kn/m))^k
	n := float64(bf.count)
	m := float64(bf.size)
	k := float64(bf.hashFuncs)

	var falsePositive float64
	if n > 0 && m > 0 {
		// (1 - e^(-k*n/m))^k
		e := math.Exp(-k * n / m)
		falsePositive = math.Pow(1-e, k)
	}

	return map[string]interface{}{
		"size_bits":           bf.size,
		"hash_functions":      bf.hashFuncs,
		"items_added":         bf.count,
		"bits_set":            ones,
		"fill_ratio":          float64(ones) / float64(bf.size),
		"false_positive_rate": falsePositive,
	}
}

// popcount شمارش بیت‌های 1 (استفاده از دستورالعمل CPU)
func popcount(x uint64) int {
	// الگوریتم Brian Kernighan
	count := 0
	for x != 0 {
		x &= x - 1
		count++
	}
	return count
}

// ====== ذخیره‌سازی روی دیسک ======

// Save ذخیره Bloom Filter در فایل
func (bf *BloomFilter) Save(path string) error {
	bf.mu.Lock()
	defer bf.mu.Unlock()

	logger.DebugFields("bloom", "Saving bloom filter to file",
		logger.String("file_path", path),
		logger.Uint64("count", bf.count),
	)

	fd, err := os.Create(path)
	if err != nil {
		logger.ErrorFields("bloom", "Failed to create bloom filter file",
			logger.Err(err),
			logger.String("file_path", path),
		)
		return err
	}
	defer fd.Close()

	// نوشتن هدر
	// 1. اندازه بیت‌ها (8 بایت)
	if err := binary.Write(fd, binary.LittleEndian, bf.size); err != nil {
		return err
	}
	// 2. تعداد توابع هش (1 بایت)
	if err := binary.Write(fd, binary.LittleEndian, bf.hashFuncs); err != nil {
		return err
	}
	// 3. تعداد کلیدها (8 بایت)
	if err := binary.Write(fd, binary.LittleEndian, bf.count); err != nil {
		return err
	}

	// نوشتن آرایه بیت‌ها
	if err := binary.Write(fd, binary.LittleEndian, bf.bits); err != nil {
		return err
	}

	logger.InfoFields("bloom", "Bloom filter saved successfully",
		logger.String("file_path", path),
		logger.Uint64("size_bytes", uint64(8+1+8+len(bf.bits)*8)),
	)
	return nil
}

// loadFromFile بارگذاری Bloom Filter از فایل
func (bf *BloomFilter) loadFromFile(path string) error {
	// بررسی وجود فایل
	if _, err := os.Stat(path); os.IsNotExist(err) {
		logger.DebugFields("bloom", "Bloom filter file not found, starting fresh",
			logger.String("file_path", path),
		)
		return nil // فایل وجود ندارد، از خالی شروع کن
	}

	fd, err := os.Open(path)
	if err != nil {
		logger.ErrorFields("bloom", "Failed to open bloom filter file",
			logger.Err(err),
			logger.String("file_path", path),
		)
		return err
	}
	defer fd.Close()

	// خوندن هدر
	var size uint64
	if err := binary.Read(fd, binary.LittleEndian, &size); err != nil {
		logger.ErrorFields("bloom", "Failed to read bloom filter header (size)",
			logger.Err(err),
		)
		return err
	}

	var hashFuncs uint8
	if err := binary.Read(fd, binary.LittleEndian, &hashFuncs); err != nil {
		logger.ErrorFields("bloom", "Failed to read bloom filter header (hashFuncs)",
			logger.Err(err),
		)
		return err
	}

	var count uint64
	if err := binary.Read(fd, binary.LittleEndian, &count); err != nil {
		logger.ErrorFields("bloom", "Failed to read bloom filter header (count)",
			logger.Err(err),
		)
		return err
	}

	// خوندن آرایه بیت‌ها
	bits := make([]uint64, (size+63)/64)
	if err := binary.Read(fd, binary.LittleEndian, &bits); err != nil {
		logger.ErrorFields("bloom", "Failed to read bloom filter bits array",
			logger.Err(err),
		)
		return err
	}

	// به‌روزرسانی struct
	bf.size = size
	bf.hashFuncs = hashFuncs
	bf.count = count
	bf.bits = bits

	logger.InfoFields("bloom", "Bloom filter loaded from file",
		logger.String("file_path", path),
		logger.Uint64("size_bits", size),
		logger.Int("hash_functions", int(hashFuncs)),
		logger.Uint64("items_count", count),
	)
	return nil
}

// CloseBloomFile closes the bloom filter file
func (bf *BloomFilter) CloseBloomFile() error {
	logger.Info("bloom", "Closing bloom filter file...")

	if bf.file != nil {
		if err := bf.file.Unmap(); err != nil {
			logger.ErrorFields("bloom", "Failed to unmap bloom filter file",
				logger.Err(err),
			)
			return err
		}
	}
	if bf.fd != nil {
		if err := bf.fd.Close(); err != nil {
			logger.ErrorFields("bloom", "Failed to close bloom filter file descriptor",
				logger.Err(err),
			)
			return err
		}
	}

	logger.Info("bloom", "Bloom filter file closed successfully")
	return nil
}