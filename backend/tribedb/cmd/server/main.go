package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"

	"tribedb/logger"
	"tribedb/server"
	"tribedb/storage"
)

type HealthResponse struct {
	Status    string           `json:"status"`
	Version   string           `json:"version"`
	Timestamp int64            `json:"timestamp"`
	Uptime    int64            `json:"uptime_seconds"`
	Checks    map[string]Check `json:"checks"`
}

type Check struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Details string `json:"details,omitempty"`
}

type ShutdownResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
	Shutdown  bool   `json:"shutdown_initiated"`
}

var closeOnce sync.Once

func main() {
	// ============================================================
	// [0] Initialize Logger - Docker First Approach
	// ============================================================

	// تشخیص محیط Docker
	isDocker := os.Getenv("DOCKER_ENV") == "true" ||
		os.Getenv("CONTAINER_RUNTIME") != "" ||
		os.Getenv("KUBERNETES_SERVICE_HOST") != ""

	// تنظیمات logger بر اساس محیط
	logCfg := logger.Config{
		Level:       os.Getenv("LOG_LEVEL"),
		Environment: os.Getenv("ENVIRONMENT"),
	}

	// مقداردهی پیش‌فرض
	if logCfg.Level == "" {
		logCfg.Level = "info"
	}
	if logCfg.Environment == "" {
		logCfg.Environment = "production"
	}

	// در Docker: فقط stdout، در توسعه: فایل + stdout
	if isDocker || os.Getenv("LOG_OUTPUT") == "stdout" {
		logCfg.OutputMode = logger.OutputStdout
		logCfg.FilePath = ""
	} else {
		logCfg.OutputMode = logger.OutputBoth
		logCfg.FilePath = "logs/storage/app.jsonl"
	}

	// راه‌اندازی logger
	if err := logger.Init(logCfg); err != nil {
		log.Printf("⚠️ Failed to initialize logger: %v", err)
		log.Printf("⚠️ Continuing without file logging...")
	}
	defer func() {
		if err := logger.Sync(); err != nil {
			log.Printf("⚠️ Failed to sync logger: %v", err)
		}
	}()

	// ============================================================
	// TERMINAL OUTPUT - Startup Banner
	// ============================================================
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                                                              ║")
	fmt.Println("║           🚀  T R I B E D B   S T A R T I N G  🚀            ║")
	fmt.Println("║              Graph Storage Server v2.0.0                     ║")
	fmt.Println("║                                                              ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	logger.Info("main", "═══════════════════════════════════════════════════════════")
	logger.Info("main", "🚀 TRIBEDB - Graph Storage Server Starting")
	logger.Info("main", "═══════════════════════════════════════════════════════════")
	logger.InfoFields("main", "Logger initialized",
		logger.String("mode", string(logCfg.OutputMode)),
		logger.String("level", logCfg.Level),
		logger.String("environment", logCfg.Environment),
		logger.String("file_path", logCfg.FilePath),
	)

	// ============================================================
	// [1/5] Opening Graph Storage
	// ============================================================
	fmt.Println("📂 [1/5] Opening Graph Storage...")

	logger.Info("main", "📂 [1/5] Opening Graph Storage...")

	storePath := os.Getenv("STORE_PATH")
	if storePath == "" {
		storePath = "./store"
	}

	cfg := storage.GraphConfig{
		Path:           storePath,
		BucketCount:    2048,
		ExpectedItems:  1_000_000,
		FalsePositive:  0.001,
		MaxNodesPerSeg: 1_000_000,
		MaxEdgesPerSeg: 5_000_000,
		UseSeparateWAL: true,
		AutoRecover:    true,
		RecoveryMode:   storage.RecoveryModeBestEffort,
	}

	logger.InfoFields("main", "Graph storage configuration",
		logger.String("path", cfg.Path),
		logger.Uint64("bucket_count", cfg.BucketCount),
		logger.Uint64("expected_items", cfg.ExpectedItems),
		logger.Float64("false_positive", cfg.FalsePositive),
		logger.Uint64("max_nodes_per_seg", cfg.MaxNodesPerSeg),
		logger.Uint64("max_edges_per_seg", cfg.MaxEdgesPerSeg),
		logger.Bool("use_separate_wal", cfg.UseSeparateWAL),
		logger.Bool("auto_recover", cfg.AutoRecover),
		logger.String("recovery_mode", string(cfg.RecoveryMode)),
	)

	startTime := time.Now()
	gs, err := storage.OpenGraph(cfg)
	elapsed := time.Since(startTime)

	if err != nil {
		fmt.Printf("   ❌ FAILED: %v\n", err)
		logger.ErrorFields("main", "Failed to open graph storage",
			logger.Err(err),
			logger.String("path", cfg.Path),
			logger.Duration("elapsed_ms", elapsed),
		)
		log.Fatalf("❌ Failed to open graph storage: %v", err)
	}

	fmt.Printf("   ✅ Graph Storage opened successfully (took %v)\n", elapsed.Round(time.Millisecond))
	logger.InfoFields("main", "✅ Graph Storage opened successfully",
		logger.Duration("elapsed_ms", elapsed),
	)

	printStorageStats(gs)

	// ============================================================
	// [2/5] Running Component Tests
	// ============================================================
	fmt.Println()
	fmt.Println("🧪 [2/5] Running component tests...")

	logger.Info("main", "🧪 [2/5] Running component tests...")

	if err := runAllTests(gs); err != nil {
		fmt.Printf("   ⚠️  Tests had errors: %v\n", err)
		logger.ErrorFields("main", "Component tests failed",
			logger.Err(err),
			logger.String("severity", "non-fatal"),
		)
		log.Printf("⚠️ Component tests had errors: %v", err)
	} else {
		fmt.Println("   ✅ All component tests passed!")
		logger.Info("main", "✅ All component tests passed!")
	}

	// ============================================================
	// [3/5] Creating CachedStorage
	// ============================================================
	fmt.Println()
	fmt.Println("🗄️  [3/5] Creating CachedStorage...")

	logger.Info("main", "🗄️ [3/5] Creating CachedStorage...")

	cacheCfg := storage.CachedStorageConfig{
		CacheSize:  1000,
		DefaultTTL: 5 * time.Minute,
	}

	logger.InfoFields("main", "CachedStorage configuration",
		logger.Int("cache_size", cacheCfg.CacheSize),
		logger.String("default_ttl", cacheCfg.DefaultTTL.String()),
	)

	cached, err := storage.NewCachedStorage(gs, cacheCfg)
	if err != nil {
		fmt.Printf("   ❌ FAILED: %v\n", err)
		logger.ErrorFields("main", "Failed to create CachedStorage",
			logger.Err(err),
			logger.Int("cache_size", cacheCfg.CacheSize),
		)
		log.Fatalf("❌ Failed to create cached storage: %v", err)
	}

	fmt.Printf("   ✅ CachedStorage created (size: %d, TTL: %v)\n", cacheCfg.CacheSize, cacheCfg.DefaultTTL)
	logger.InfoFields("main", "✅ CachedStorage created",
		logger.Int("cache_size", cacheCfg.CacheSize),
		logger.String("default_ttl", cacheCfg.DefaultTTL.String()),
	)

	defer func() {
		fmt.Println()
		fmt.Println("📝 [DEFER] Closing storage...")
		logger.Info("main", "📝 [DEFER] Closing storage...")
		closeOnce.Do(func() {
			if err := cached.ShutdownCached(); err != nil {
				fmt.Printf("   ⚠️  Close error: %v\n", err)
				logger.ErrorFields("main", "⚠️ [DEFER] Close error",
					logger.Err(err),
				)
			} else {
				fmt.Println("   ✅ Storage closed successfully")
				logger.Info("main", "✅ [DEFER] Storage closed successfully")
			}
		})
	}()

	// ============================================================
	// [4/5] Setting up gRPC Server
	// ============================================================
	fmt.Println()
	fmt.Println("🔌 [4/5] Setting up gRPC server...")

	logger.Info("main", "🔌 [4/5] Setting up gRPC server...")

	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(10*1024*1024),
		grpc.MaxSendMsgSize(10*1024*1024),
	)

	storageServer := server.NewGRPCServer(cached)
	storageServer.Register(grpcServer)

	healthServer := health.NewServer()
	grpc_health_v1.RegisterHealthServer(grpcServer, healthServer)
	healthServer.SetServingStatus("storage", grpc_health_v1.HealthCheckResponse_SERVING)

	reflection.Register(grpcServer)

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		fmt.Printf("   ❌ FAILED to listen on :50051: %v\n", err)
		logger.ErrorFields("main", "❌ Failed to listen on port 50051",
			logger.Err(err),
			logger.Int("port", 50051),
		)
		log.Fatalf("❌ Failed to listen: %v", err)
	}

	fmt.Println("   ✅ gRPC server listener created on :50051")
	logger.InfoFields("main", "✅ gRPC server listener created",
		logger.String("address", ":50051"),
	)

	// ============================================================
	// [5/5] Setting up Shutdown Server
	// ============================================================
	fmt.Println()
	fmt.Println("🔧 [5/5] Setting up shutdown server...")

	logger.Info("main", "🔧 [5/5] Setting up shutdown server...")

	shutdownServer := NewShutdownServer(cached, grpcServer)
	go shutdownServer.Start()

	fmt.Println("   ✅ Shutdown HTTP server ready on :50052")

	// ============================================================
	// SERVER READY
	// ============================================================
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                                                              ║")
	fmt.Println("║              ✅  S E R V E R   I S   R E A D Y  ✅            ║")
	fmt.Println("║                                                              ║")
	fmt.Println("║   📡 gRPC API:    localhost:50051                            ║")
	fmt.Println("║   ❤️  Health:     http://localhost:50052/health               ║")
	fmt.Println("║   📊 Stats:      http://localhost:50052/stats                ║")
	fmt.Println("║   🛑 Shutdown:   http://localhost:50052/shutdown              ║")
	fmt.Println("║                                                              ║")
	fmt.Println("║   Press Ctrl+C to stop                                       ║")
	fmt.Println("║                                                              ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	logger.Info("main", "═══════════════════════════════════════════════════════════")
	logger.Info("main", "✅ Server is ready to accept requests")
	logger.InfoFields("main", "Server endpoints",
		logger.String("grpc_address", ":50051"),
		logger.String("health_address", ":50052/health"),
		logger.String("stats_address", ":50052/stats"),
		logger.String("shutdown_address", ":50052/shutdown"),
	)
	logger.Info("main", "═══════════════════════════════════════════════════════════")

	runServer(grpcServer, lis, cached, storageServer, shutdownServer)
}

func runAllTests(gs *storage.GraphStorage) error {
	logger.Info("main", "  ┌─────────────────────────────────────────────────────")
	logger.Info("main", "  │ Running component tests...")
	logger.Info("main", "  ├─────────────────────────────────────────────────────")

	fmt.Println("   │ 🔵 Testing Segmentation...")
	logger.Info("main", "  │ 🔵 Testing Segmentation...")
	if err := testSegmentation(gs); err != nil {
		fmt.Println("   │ ❌ Segmentation test FAILED")
		logger.ErrorFields("main", "  │ ❌ Segmentation test failed",
			logger.Err(err),
		)
		return fmt.Errorf("segmentation test failed: %w", err)
	}
	fmt.Println("   │ ✅ Segmentation OK")
	logger.Info("main", "  │ ✅ Segmentation OK")

	fmt.Println("   │ 🟠 Testing WAL...")
	logger.Info("main", "  │ 🟠 Testing WAL...")
	if err := testWAL(gs); err != nil {
		fmt.Println("   │ ❌ WAL test FAILED")
		logger.ErrorFields("main", "  │ ❌ WAL test failed",
			logger.Err(err),
		)
		return fmt.Errorf("WAL test failed: %w", err)
	}
	fmt.Println("   │ ✅ WAL OK")
	logger.Info("main", "  │ ✅ WAL OK")

	fmt.Println("   │ 🔴 Testing Memory Pool...")
	logger.Info("main", "  │ 🔴 Testing Memory Pool...")
	if err := testMemoryPool(); err != nil {
		fmt.Println("   │ ❌ Memory Pool test FAILED")
		logger.ErrorFields("main", "  │ ❌ Memory Pool test failed",
			logger.Err(err),
		)
		return fmt.Errorf("memory pool test failed: %w", err)
	}
	fmt.Println("   │ ✅ Memory Pool OK")
	logger.Info("main", "  │ ✅ Memory Pool OK")

	logger.Info("main", "  └─────────────────────────────────────────────────────")
	return nil
}

func testSegmentation(gs *storage.GraphStorage) error {
	if !gs.UseSegmentation() {
		return fmt.Errorf("segmentation is not enabled")
	}

	testData := make([]byte, gs.NodeRecordSize)
	for i := range testData {
		testData[i] = byte(i % 255)
	}

	logger.DebugFields("main", "Writing test node for segmentation test",
		logger.String("node_id", "1"),
		logger.Int("data_size", len(testData)),
	)

	if err := gs.WriteNode(1, testData); err != nil {
		logger.ErrorFields("main", "Segmentation test: WriteNode failed",
			logger.Err(err),
			logger.String("node_id", "1"),
		)
		return fmt.Errorf("write failed: %w", err)
	}

	readData, err := gs.ReadNode(1)
	if err != nil {
		logger.ErrorFields("main", "Segmentation test: ReadNode failed",
			logger.Err(err),
			logger.String("node_id", "1"),
		)
		return fmt.Errorf("read failed: %w", err)
	}

	if len(readData) != len(testData) {
		logger.ErrorFields("main", "Segmentation test: Data length mismatch",
			logger.Int("expected", len(testData)),
			logger.Int("actual", len(readData)),
		)
		return fmt.Errorf("data length mismatch: %d (expected %d)", len(readData), len(testData))
	}

	if gs.NodeSegManager != nil {
		stats := gs.NodeSegManager.Stats()
		if totalSegs, ok := stats["total_segments"]; ok {
			logger.InfoFields("main", "  │    📊 Segment stats",
				logger.Any("total_segments", totalSegs),
			)
		}
	}

	return nil
}

func testWAL(gs *storage.GraphStorage) error {
	wal := gs.WAL()
	if wal == nil {
		logger.Error("main", "WAL test: WAL is nil")
		return fmt.Errorf("WAL is nil")
	}

	testData := []byte("test WAL data")
	entry := &storage.Entry{
		SegmentID: 1,
		ItemID:    999,
		Op:        storage.OpPut,
		Data:      testData,
		Timestamp: time.Now().UnixNano(),
	}

	logger.DebugFields("main", "Appending test WAL entry",
		logger.Int("segment_id", int(entry.SegmentID)),
		logger.Int("item_id", int(entry.ItemID)),
		logger.String("op", string(entry.Op)),
		logger.Int("data_size", len(testData)),
	)

	if err := wal.Append(entry); err != nil {
		logger.ErrorFields("main", "WAL test: Append failed",
			logger.Err(err),
			logger.Int("segment_id", int(entry.SegmentID)),
		)
		return fmt.Errorf("WAL append failed: %w", err)
	}

	entryCount := 0
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logger.Debug("main", "Replaying WAL entries")
	err := wal.Replay(ctx, func(e *storage.Entry) error {
		entryCount++
		return nil
	})

	if err != nil {
		logger.ErrorFields("main", "WAL test: Replay failed",
			logger.Err(err),
		)
		return fmt.Errorf("WAL replay failed: %w", err)
	}

	if entryCount == 0 {
		logger.Error("main", "WAL test: Replay returned 0 entries")
		return fmt.Errorf("WAL replay returned 0 entries")
	}

	logger.InfoFields("main", "  │    📊 WAL entries replayed",
		logger.Int("entry_count", entryCount),
	)
	return nil
}

func testMemoryPool() error {
	logger.Debug("main", "Testing memory pool allocations")

	node := storage.GetNode()
	if node == nil {
		logger.Error("main", "Memory Pool test: GetNode returned nil")
		return fmt.Errorf("GetNode returned nil")
	}
	storage.PutNode(node)

	edge := storage.GetEdge()
	if edge == nil {
		logger.Error("main", "Memory Pool test: GetEdge returned nil")
		return fmt.Errorf("GetEdge returned nil")
	}
	storage.PutEdge(edge)

	entry := storage.GetEntry()
	if entry == nil {
		logger.Error("main", "Memory Pool test: GetEntry returned nil")
		return fmt.Errorf("GetEntry returned nil")
	}
	storage.PutEntry(entry)

	batch := storage.GetBatch()
	if batch == nil {
		logger.Error("main", "Memory Pool test: GetBatch returned nil")
		return fmt.Errorf("GetBatch returned nil")
	}
	storage.PutBatch(batch)

	logger.Debug("main", "Memory pool test: All allocations successful")
	return nil
}

func printStorageStats(gs *storage.GraphStorage) {
	stats := gs.Stats()

	fmt.Println()
	fmt.Println("   ┌─────────────────────────────────────────────────────")
	fmt.Printf("   │ 📁 Path:            %v\n", stats["file_path"])
	fmt.Printf("   │ 📝 Record Size:     Node=%v, Edge=%v\n",
		stats["node_record_size"], stats["edge_record_size"])

	logger.Info("main", "📊 Storage Statistics:")
	logger.InfoFields("main", "  Storage details",
		logger.Any("file_path", stats["file_path"]),
		logger.Any("node_record_size", stats["node_record_size"]),
		logger.Any("edge_record_size", stats["edge_record_size"]),
	)

	if useSeg, ok := stats["use_segmentation"].(bool); ok && useSeg {
		fmt.Printf("   │ 🆕 Segmentation:    ENABLED\n")
		if totalSegs, ok := stats["node_seg_total_segments"]; ok {
			fmt.Printf("   │ 📦 Node Segments:   %v\n", totalSegs)
		}
		logger.InfoFields("main", "  Segmentation enabled",
			logger.Any("node_seg_total_segments", stats["node_seg_total_segments"]),
		)
	}

	if walWrites, ok := stats["wal_writes"]; ok {
		fmt.Printf("   │ 📝 WAL Writes:      %v\n", walWrites)
		logger.InfoFields("main", "  WAL statistics",
			logger.Any("wal_writes", walWrites),
		)
	}

	fmt.Println("   └─────────────────────────────────────────────────────")
}

type ShutdownServer struct {
	cached         *storage.CachedStorage
	grpcServer     *grpc.Server
	httpServer     *http.Server
	shutdownCalled bool
	mu             sync.Mutex
	startTime      time.Time
}

func NewShutdownServer(cached *storage.CachedStorage, grpcServer *grpc.Server) *ShutdownServer {
	s := &ShutdownServer{
		cached:     cached,
		grpcServer: grpcServer,
		startTime:  time.Now(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/shutdown", s.handleShutdown)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/stats", s.handleStats)

	s.httpServer = &http.Server{
		Addr:         ":50052",
		Handler:      mux,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	return s
}

func (s *ShutdownServer) Start() {
	fmt.Println()
	fmt.Println("🔧 Shutdown HTTP server listening on :50052")
	fmt.Println("   📊 /stats     - Get storage statistics")
	fmt.Println("   ❤️  /health    - Health check")
	fmt.Println("   🛑 /shutdown  - Graceful shutdown")
	fmt.Println()

	logger.InfoFields("shutdown_server", "HTTP server starting",
		logger.String("address", ":50052"),
	)
	logger.Info("shutdown_server", "   📊 /stats  - Get storage statistics")
	logger.Info("shutdown_server", "   ❤️  /health - Health check")
	logger.Info("shutdown_server", "   🛑 /shutdown - Graceful shutdown")

	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.ErrorFields("shutdown_server", "HTTP server error",
			logger.Err(err),
		)
	}
}

func (s *ShutdownServer) Stop() {
	fmt.Println()
	fmt.Println("🛑 Stopping HTTP server...")
	logger.Info("shutdown_server", "Stopping HTTP server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.httpServer.Shutdown(ctx); err != nil {
		fmt.Printf("   ⚠️  HTTP server shutdown error: %v\n", err)
		logger.ErrorFields("shutdown_server", "HTTP server shutdown error",
			logger.Err(err),
		)
	} else {
		fmt.Println("   ✅ HTTP server stopped")
		logger.Info("shutdown_server", "✅ HTTP server stopped")
	}
}

func (s *ShutdownServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	logger.DebugFields("shutdown_server", "Health check requested",
		logger.String("remote_addr", r.RemoteAddr),
		logger.String("method", r.Method),
	)

	stats := s.cached.GetStorage().Stats()

	response := HealthResponse{
		Status:    "healthy",
		Version:   "v2.0.0",
		Timestamp: time.Now().Unix(),
		Uptime:    int64(time.Since(s.startTime).Seconds()),
		Checks:    make(map[string]Check),
	}

	// بررسی storage با وجود فیلدهای معتبر
	storageStatus := "pass"
	storageMessage := "Storage is operational"
	storageDetails := ""

	// بررسی اینکه storage باز شده و data موجود است
	if filePath, ok := stats["file_path"]; ok && filePath != "" {
		storageDetails = fmt.Sprintf("Path: %v", filePath)
	} else {
		storageStatus = "fail"
		storageMessage = "Storage path is invalid"
	}

	// بررسی segmentation
	if useSeg, ok := stats["use_segmentation"].(bool); ok && useSeg {
		if totalSegs, ok := stats["node_seg_total_segments"]; ok {
			storageDetails = fmt.Sprintf("Path: %v, Segments: %v", stats["file_path"], totalSegs)
		}
	} else {
		storageStatus = "fail"
		storageMessage = "Segmentation is not enabled"
	}

	// بررسی اینکه storage بسته نشده باشد
	if closed, ok := stats["closed"].(bool); ok && closed {
		storageStatus = "fail"
		storageMessage = "Storage is closed"
	}

	response.Checks["storage"] = Check{
		Status:  storageStatus,
		Message: storageMessage,
		Details: storageDetails,
	}

	if storageStatus == "fail" {
		response.Status = "degraded"
	}

	// بررسی segmentation
	if useSeg, ok := stats["use_segmentation"].(bool); ok && useSeg {
		totalSegs := stats["node_seg_total_segments"]
		response.Checks["segmentation"] = Check{
			Status:  "pass",
			Message: "Segmentation enabled",
			Details: fmt.Sprintf("Segments: %v", totalSegs),
		}
	} else {
		response.Checks["segmentation"] = Check{
			Status:  "fail",
			Message: "Segmentation not enabled",
		}
		if response.Status == "healthy" {
			response.Status = "degraded"
		}
	}

	// بررسی WAL
	if walWrites, ok := stats["wal_writes"]; ok {
		response.Checks["wal"] = Check{
			Status:  "pass",
			Message: "WAL is operational",
			Details: fmt.Sprintf("Writes: %v", walWrites),
		}
	} else {
		response.Checks["wal"] = Check{
			Status:  "fail",
			Message: "WAL is not operational",
		}
		if response.Status == "healthy" {
			response.Status = "degraded"
		}
	}

	// بررسی gRPC
	if s.grpcServer != nil {
		response.Checks["grpc"] = Check{
			Status:  "pass",
			Message: "gRPC server is running",
		}
	} else {
		response.Checks["grpc"] = Check{
			Status:  "fail",
			Message: "gRPC server is not running",
		}
		if response.Status == "healthy" {
			response.Status = "degraded"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if response.Status == "healthy" {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	json.NewEncoder(w).Encode(response)
}

func (s *ShutdownServer) handleStats(w http.ResponseWriter, r *http.Request) {
	logger.DebugFields("shutdown_server", "Stats requested",
		logger.String("remote_addr", r.RemoteAddr),
		logger.String("method", r.Method),
	)
	stats := s.cached.GetStorage().Stats()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "{\n")
	first := true
	for k, v := range stats {
		if !first {
			fmt.Fprintf(w, ",\n")
		}
		first = false
		fmt.Fprintf(w, "  %q: %v", k, v)
	}
	fmt.Fprintf(w, "\n}\n")
}

func (s *ShutdownServer) handleShutdown(w http.ResponseWriter, r *http.Request) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(ShutdownResponse{
			Status:    "error",
			Message:   "Method not allowed. Use POST",
			Timestamp: time.Now().Unix(),
			Shutdown:  false,
		})
		return
	}

	logger.InfoFields("shutdown_server", "Shutdown requested via HTTP",
		logger.String("remote_addr", r.RemoteAddr),
	)

	response := ShutdownResponse{
		Timestamp: time.Now().Unix(),
	}

	if s.shutdownCalled {
		fmt.Println("⚠️  Shutdown already called, ignoring")
		logger.Warn("shutdown_server", "⚠️ Shutdown already called, ignoring")
		response.Status = "already_in_progress"
		response.Message = "Shutdown already in progress"
		response.Shutdown = false

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
		return
	}

	s.shutdownCalled = true
	response.Shutdown = true
	response.Status = "initiated"
	response.Message = "Shutdown initiated successfully"

	fmt.Println()
	fmt.Println("📡 Shutdown request received via HTTP")
	fmt.Println("📝 Closing storage...")

	logger.Info("shutdown_server", "📡 Shutdown request received via HTTP")
	logger.Info("shutdown_server", "📝 Closing storage...")

	closeOnce.Do(func() {
		if err := s.cached.ShutdownCached(); err != nil {
			fmt.Printf("   ⚠️  Error closing storage: %v\n", err)
			logger.ErrorFields("shutdown_server", "⚠️ Error closing storage",
				logger.Err(err),
			)
			response.Status = "failed"
			response.Message = fmt.Sprintf("Failed to close storage: %v", err)
			response.Shutdown = false

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}
		fmt.Println("   ✅ Storage closed successfully")
		logger.Info("shutdown_server", "✅ Storage closed successfully")
	})

	go func() {
		fmt.Println("🛑 Stopping gRPC server gracefully...")
		logger.Info("shutdown_server", "🛑 Stopping gRPC server gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		done := make(chan struct{})
		go func() {
			s.grpcServer.GracefulStop()
			close(done)
		}()

		select {
		case <-done:
			fmt.Println("   ✅ gRPC server stopped gracefully")
			logger.Info("shutdown_server", "✅ gRPC server stopped gracefully")
		case <-shutdownCtx.Done():
			fmt.Println("   ⚠️  gRPC shutdown timeout, forcing stop...")
			logger.Warn("shutdown_server", "⚠️ gRPC shutdown timeout, forcing stop...")
			s.grpcServer.Stop()
			fmt.Println("   ✅ gRPC server forcefully stopped")
			logger.Info("shutdown_server", "✅ gRPC server forcefully stopped")
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

	fmt.Println("✅ Shutdown response sent")
	logger.Info("shutdown_server", "✅ Shutdown response sent")
}

func runServer(grpcServer *grpc.Server, lis net.Listener, cached *storage.CachedStorage, storageServer *server.GRPCServer, shutdownServer *ShutdownServer) {
	stopped := make(chan struct{})

	go func() {
		logger.InfoFields("main", "🚀 gRPC server is running",
			logger.String("address", ":50051"),
		)
		logger.Info("main", "📊 Available services:")
		logger.Info("main", "   - StorageService (Nodes & Edges)")
		logger.Info("main", "   - Health")
		logger.Info("main", "   - Reflection")

		if err := grpcServer.Serve(lis); err != nil {
			logger.ErrorFields("main", "gRPC server stopped with error",
				logger.Err(err),
			)
		}
		close(stopped)
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		fmt.Println()
		fmt.Printf("📡 Received OS signal: %v\n", sig)
		fmt.Println()
		fmt.Println("🛑 Initiating graceful shutdown...")
		fmt.Println()

		logger.InfoFields("main", "📡 Received OS signal - Initiating shutdown",
			logger.String("signal", sig.String()),
		)

		shutdownServer.Stop()

		logger.Info("main", "🛑 Cancelling background operations...")
		storageServer.Shutdown()
		logger.Info("main", "✅ Background operations cancelled")

		shutdownServer.mu.Lock()
		if !shutdownServer.shutdownCalled {
			fmt.Println("📝 Fallback: Closing storage...")
			logger.Info("main", "📝 Fallback: Closing storage...")
			closeOnce.Do(func() {
				if err := cached.ShutdownCached(); err != nil {
					fmt.Printf("   ⚠️  Fallback close error: %v\n", err)
					logger.ErrorFields("main", "⚠️ Fallback close error",
						logger.Err(err),
					)
				} else {
					fmt.Println("   ✅ Fallback: Storage closed successfully")
					logger.Info("main", "✅ Fallback: Storage closed successfully")
				}
			})
		}
		shutdownServer.mu.Unlock()

		fmt.Println("🛑 Stopping gRPC server...")
		logger.Info("main", "🛑 Stopping gRPC server...")
		grpcServer.Stop()
		fmt.Println("   ✅ gRPC server stopped")
		logger.Info("main", "✅ gRPC server stopped")

		<-stopped
		fmt.Println("✅ Server fully stopped")
		logger.Info("main", "✅ Server fully stopped")

	case <-stopped:
		fmt.Println("✅ gRPC server stopped normally")
		logger.Info("main", "✅ gRPC server stopped normally")
	}

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════════════╗")
	fmt.Println("║                                                              ║")
	fmt.Println("║              🛑  S E R V E R   S H U T D O W N  🛑            ║")
	fmt.Println("║                                                              ║")
	fmt.Println("╚══════════════════════════════════════════════════════════════╝")
	fmt.Println()

	logger.Info("main", "✅ Server shutdown complete")
	logger.Info("main", "═══════════════════════════════════════════════════════════")
}
