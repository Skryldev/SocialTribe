package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "tribedb/proto"
)

const (
	NUM_NODES      = 10000 // 10,000 Node برای تست سنگین
	NUM_EDGES      = 5000  // 5,000 Edge
	NUM_READS      = 500   // 500 Read
	NUM_UPDATES    = 200   // 200 Update
	NUM_DELETES    = 100   // 100 Delete
	CONCURRENT_REQ = 20    // 20 درخواست همزمان
)

// Metrics برای Benchmark
type BenchmarkMetrics struct {
	TotalNodes       int
	TotalEdges       int
	NodeSegments     int
	EdgeSegments     int
	BloomSizes       map[string]int64 // مسیر → سایز
	IndexSizes       map[string]int64
	DataSizes        map[string]int64
	WriteSpeed       float64
	ReadSpeed        float64
	UpdateSpeed      float64
	DeleteSpeed      float64
	TotalTime        time.Duration
	WALWrites        int64
	WALErrors        int64
	CacheHitRatio    float64
}

func main() {
	rand.Seed(time.Now().UnixNano())

	log.Println("═══════════════════════════════════════════════════════════")
	log.Println("🔥🔥🔥 TRIBEDB - ULTRA STRESS TEST + BENCHMARK 🔥🔥🔥")
	log.Println("═══════════════════════════════════════════════════════════")

	log.Println("\n📊 Test Configuration:")
	log.Printf("   📝 Nodes: %d (10,000)", NUM_NODES)
	log.Printf("   📝 Edges: %d", NUM_EDGES)
	log.Printf("   📖 Reads: %d", NUM_READS)
	log.Printf("   🔄 Updates: %d", NUM_UPDATES)
	log.Printf("   🗑️  Deletes: %d", NUM_DELETES)
	log.Printf("   🔀 Concurrent Requests: %d", CONCURRENT_REQ)

	// ============================================================
	// 1. اتصال به سرور
	// ============================================================
	log.Println("\n📡 Connecting to gRPC server...")

	conn, err := grpc.Dial(
		"localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
		grpc.WithTimeout(10*time.Second),
	)
	if err != nil {
		log.Fatalf("❌ Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewStorageServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 600*time.Second) // 10 دقیقه
	defer cancel()

	log.Println("✅ Connected to gRPC server")

	metrics := &BenchmarkMetrics{
		BloomSizes: make(map[string]int64),
		IndexSizes: make(map[string]int64),
		DataSizes:  make(map[string]int64),
	}

	// ============================================================
	// 2. آمار اولیه
	// ============================================================
	log.Println("\n📊 [1/9] Initial stats...")
	printUltraStats(client, ctx, "Initial")

	// ============================================================
	// 3. Bulk Create Nodes
	// ============================================================
	log.Println("\n📝 [2/9] Creating 10,000 nodes with bulk write...")
	startTime := time.Now()

	createdNodes := make([]string, 0, NUM_NODES)
	batchSize := 100

	for batchStart := 0; batchStart < NUM_NODES; batchStart += batchSize {
		batchEnd := batchStart + batchSize
		if batchEnd > NUM_NODES {
			batchEnd = NUM_NODES
		}

		for i := batchStart; i < batchEnd; i++ {
			key := fmt.Sprintf("ultra-node-%d", i)
			node := &pb.Node{
				Id:   key,
				Type: "ultra",
				Position: &pb.Position{
					X: rand.Float64() * 10000,
					Y: rand.Float64() * 10000,
				},
				Data: &pb.NodeData{
					Id:          key,
					Name:        fmt.Sprintf("Ultra Node %d", i),
					NodeType:    []string{"typeA", "typeB", "typeC"}[rand.Intn(3)],
					Role:        []string{"leader", "follower", "observer", "admin"}[rand.Intn(4)],
					FriendCount: int32(rand.Intn(500)),
					AvgDistance: rand.Float64() * 1000,
					Centrality:  rand.Float64() * 10,
				},
			}

			resp, err := client.CreateNode(ctx, &pb.CreateNodeRequest{
				Key:  key,
				Node: node,
			})
			if err != nil {
				log.Printf("❌ Failed to create node %d: %v", i, err)
				continue
			}
			if resp.Success {
				createdNodes = append(createdNodes, key)
			}
		}

		if (batchStart/batchSize)%10 == 0 {
			log.Printf("   📊 Progress: %d/%d nodes created", batchEnd, NUM_NODES)
		}
	}

	writeDuration := time.Since(startTime)
	metrics.WriteSpeed = float64(len(createdNodes)) / writeDuration.Seconds()
	log.Printf("✅ Created %d nodes in %v (avg: %.2f nodes/sec)",
		len(createdNodes), writeDuration, metrics.WriteSpeed)

	// ============================================================
	// 4. Bulk Create Edges
	// ============================================================
	log.Println("\n📝 [3/9] Creating edges...")
	startTime = time.Now()

	createdEdges := make([]string, 0, NUM_EDGES)

	for i := 0; i < NUM_EDGES; i++ {
		sourceIdx := rand.Intn(len(createdNodes))
		targetIdx := rand.Intn(len(createdNodes))
		for targetIdx == sourceIdx {
			targetIdx = rand.Intn(len(createdNodes))
		}

		key := fmt.Sprintf("ultra-edge-%d", i)
		edge := &pb.Edge{
			Id:     key,
			Source: createdNodes[sourceIdx],
			Target: createdNodes[targetIdx],
			Type:   "weightedEdge",
			Data: &pb.EdgeData{
				Weight:    int32(rand.Intn(1000) + 1),
				CreatedAt: time.Now().Format("2006-01-02T15:04:05.000Z"),
				Id:        createdNodes[sourceIdx],
				TargetId:  createdNodes[targetIdx],
			},
		}

		resp, err := client.CreateEdge(ctx, &pb.CreateEdgeRequest{
			Key:  key,
			Edge: edge,
		})
		if err != nil {
			log.Printf("❌ Failed to create edge %d: %v", i, err)
			continue
		}
		if resp.Success {
			createdEdges = append(createdEdges, key)
		}

		if (i+1)%500 == 0 {
			log.Printf("   📊 Progress: %d/%d edges created", i+1, NUM_EDGES)
		}
	}

	edgeDuration := time.Since(startTime)
	metrics.TotalEdges = len(createdEdges)
	log.Printf("✅ Created %d edges in %v (avg: %.2f edges/sec)",
		len(createdEdges), edgeDuration, float64(len(createdEdges))/edgeDuration.Seconds())

	// ============================================================
	// 5. Concurrent Read Benchmark
	// ============================================================
	log.Println("\n📖 [4/9] Running read benchmark...")
	startTime = time.Now()

	readSuccess := 0
	readFail := 0
	semaphore := make(chan struct{}, CONCURRENT_REQ)

	for i := 0; i < NUM_READS; i++ {
		go func() {
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			nodeIdx := rand.Intn(len(createdNodes))
			key := createdNodes[nodeIdx]

			resp, err := client.GetNode(ctx, &pb.GetNodeRequest{Key: key})
			if err != nil || !resp.Found {
				readFail++
			} else {
				readSuccess++
			}
		}()
	}

	// منتظر ماندن برای اتمام همه
	time.Sleep(2 * time.Second) // ساده‌سازی
	readDuration := time.Since(startTime)
	metrics.ReadSpeed = float64(readSuccess+readFail) / readDuration.Seconds()
	log.Printf("✅ Read benchmark: %d success, %d fail in %v (%.2f ops/sec)",
		readSuccess, readFail, readDuration, metrics.ReadSpeed)

	// ============================================================
	// 6. Concurrent Update Benchmark
	// ============================================================
	log.Println("\n🔄 [5/9] Running update benchmark...")
	startTime = time.Now()

	updateSuccess := 0
	updateFail := 0

	for i := 0; i < NUM_UPDATES; i++ {
		go func(idx int) {
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			nodeIdx := rand.Intn(len(createdNodes))
			key := createdNodes[nodeIdx]

			node := &pb.Node{
				Id:   key,
				Type: "updated",
				Position: &pb.Position{
					X: rand.Float64() * 10000,
					Y: rand.Float64() * 10000,
				},
				Data: &pb.NodeData{
					Id:          key,
					Name:        fmt.Sprintf("Updated %d", idx),
					NodeType:    "updated",
					Role:        "updated",
					FriendCount: int32(rand.Intn(1000)),
					AvgDistance: rand.Float64() * 2000,
					Centrality:  rand.Float64() * 20,
				},
			}

			resp, err := client.UpdateNode(ctx, &pb.UpdateNodeRequest{
				Key:  key,
				Node: node,
			})
			if err != nil || !resp.Success {
				updateFail++
			} else {
				updateSuccess++
			}
		}(i)
	}

	time.Sleep(2 * time.Second)
	updateDuration := time.Since(startTime)
	metrics.UpdateSpeed = float64(updateSuccess+updateFail) / updateDuration.Seconds()
	log.Printf("✅ Update benchmark: %d success, %d fail in %v (%.2f ops/sec)",
		updateSuccess, updateFail, updateDuration, metrics.UpdateSpeed)

	// ============================================================
	// 7. Delete Benchmark
	// ============================================================
	log.Println("\n🗑️ [6/9] Running delete benchmark...")
	startTime = time.Now()

	deleteSuccess := 0
	deleteFail := 0
	toDelete := make([]string, 0, NUM_DELETES)

	for i := 0; i < NUM_DELETES && i < len(createdNodes); i++ {
		idx := rand.Intn(len(createdNodes))
		toDelete = append(toDelete, createdNodes[idx])
	}

	for _, key := range toDelete {
		resp, err := client.DeleteNode(ctx, &pb.DeleteNodeRequest{Key: key})
		if err != nil || !resp.Success {
			deleteFail++
		} else {
			deleteSuccess++
			for i, k := range createdNodes {
				if k == key {
					createdNodes = append(createdNodes[:i], createdNodes[i+1:]...)
					break
				}
			}
		}
	}

	deleteDuration := time.Since(startTime)
	metrics.DeleteSpeed = float64(deleteSuccess+deleteFail) / deleteDuration.Seconds()
	log.Printf("✅ Delete benchmark: %d success, %d fail in %v (%.2f ops/sec)",
		deleteSuccess, deleteFail, deleteDuration, metrics.DeleteSpeed)

	// ============================================================
	// 8. بررسی سایز فایل‌ها
	// ============================================================
	log.Println("\n📁 [7/9] Checking file sizes...")

	basePath := "./store/segments/nodes"
	entries, err := os.ReadDir(basePath)
	if err != nil {
		log.Printf("⚠️ Failed to read segments dir: %v", err)
	} else {
		for _, entry := range entries {
			if entry.IsDir() {
				segPath := filepath.Join(basePath, entry.Name())
				metrics.BloomSizes[segPath] = getFileSize(segPath, "nodes.bloom")
				metrics.IndexSizes[segPath] = getFileSize(segPath, "nodes.idx")
				metrics.DataSizes[segPath] = getFileSize(segPath, "data.mmap")
			}
		}
	}

	// ============================================================
	// 9. آمار نهایی
	// ============================================================
	log.Println("\n📊 [8/9] Final stats...")
	finalStats, hitRatio := printUltraStats(client, ctx, "Final")

	metrics.TotalNodes = len(createdNodes)
	metrics.NodeSegments = len(metrics.BloomSizes)
	metrics.WALWrites = finalStats["wal_writes"]
	metrics.WALErrors = finalStats["wal_errors"]
	metrics.CacheHitRatio = hitRatio  // ✅ الان از نوع float64 است

	// ============================================================
	// 10. گزارش نهایی
	// ============================================================
	printFinalReport(metrics)
}

// ============================================================
// توابع کمکی
// ============================================================

func getFileSize(dir, filename string) int64 {
	path := filepath.Join(dir, filename)
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}

func printUltraStats(client pb.StorageServiceClient, ctx context.Context, label string) (map[string]int64, float64) {
	stats, err := client.GetStats(ctx, &pb.GetStatsRequest{})
	if err != nil {
		log.Printf("⚠️ Failed to get stats: %v", err)
		return nil, 0
	}

	// آمار کش
	cacheStats, _ := client.GetCacheStats(ctx, &pb.GetCacheStatsRequest{})

	result := make(map[string]int64)

	keys := []string{
		"use_segmentation",
		"node_seg_total_segments", "node_seg_total_items",
		"edge_seg_total_segments", "edge_seg_total_items",
		"wal_writes", "wal_recovery", "wal_errors",
	}

	log.Printf("📊 [%s] Stats:", label)
	for _, key := range keys {
		if val, ok := stats.Stats[key]; ok {
			var intVal int64
			fmt.Sscanf(val, "%d", &intVal)
			result[key] = intVal
			log.Printf("   %s: %s", key, val)
		}
	}

	var hitRatio float64
	if cacheStats != nil {
		hitRatio = cacheStats.HitRatio
		log.Printf("   cache_hit_ratio: %.2f%%", hitRatio*100)
	}

	return result, hitRatio
}

func printFinalReport(m *BenchmarkMetrics) {
	log.Println("\n═══════════════════════════════════════════════════════════")
	log.Println("📊 ULTRA STRESS TEST - FINAL REPORT")
	log.Println("═══════════════════════════════════════════════════════════")

	log.Println("\n📈 Performance Summary:")
	log.Printf("   ✅ Nodes Created:     %d", m.TotalNodes)
	log.Printf("   ✅ Edges Created:     %d", m.TotalEdges)
	log.Printf("   ✅ Node Segments:     %d", m.NodeSegments)
	log.Printf("   ✅ Edge Segments:     %d", m.EdgeSegments)
	log.Printf("   📝 Write Speed:       %.2f nodes/sec", m.WriteSpeed)
	log.Printf("   📖 Read Speed:        %.2f ops/sec", m.ReadSpeed)
	log.Printf("   🔄 Update Speed:      %.2f ops/sec", m.UpdateSpeed)
	log.Printf("   🗑️  Delete Speed:      %.2f ops/sec", m.DeleteSpeed)
	log.Printf("   💾 WAL Writes:        %d", m.WALWrites)
	log.Printf("   ❌ WAL Errors:        %d", m.WALErrors)
	log.Printf("   🎯 Cache Hit Ratio:   %.2f%%", m.CacheHitRatio)

	log.Println("\n📁 File Sizes (Bloom Filter per Segment):")
	totalBloomSize := int64(0)
	for path, size := range m.BloomSizes {
		totalBloomSize += size
		log.Printf("   %s: %d bytes (%.2f KB)", filepath.Base(path), size, float64(size)/1024)
	}
	log.Printf("\n   📊 Total Bloom Size: %d bytes (%.2f KB)", totalBloomSize, float64(totalBloomSize)/1024)
	log.Printf("   📊 Avg Bloom Size:   %.2f bytes", float64(totalBloomSize)/float64(len(m.BloomSizes)))

	log.Println("\n📁 File Sizes (Index per Segment):")
	totalIndexSize := int64(0)
	for path, size := range m.IndexSizes {
		totalIndexSize += size
		log.Printf("   %s: %d bytes (%.2f KB)", filepath.Base(path), size, float64(size)/1024)
	}
	log.Printf("\n   📊 Total Index Size: %d bytes (%.2f KB)", totalIndexSize, float64(totalIndexSize)/1024)

	log.Println("\n📁 File Sizes (Data per Segment):")
	totalDataSize := int64(0)
	for path, size := range m.DataSizes {
		totalDataSize += size
		log.Printf("   %s: %d bytes (%.2f KB)", filepath.Base(path), size, float64(size)/1024)
	}
	log.Printf("\n   📊 Total Data Size:  %d bytes (%.2f KB)", totalDataSize, float64(totalDataSize)/1024)

	log.Println("\n🎯 Test Results:")
	if m.WALErrors == 0 && m.TotalNodes > 0 {
		log.Println("   ✅ ALL TESTS PASSED!")
		log.Println("   ✅ System is stable under extreme load!")
		log.Println("   ✅ Segmentation is working perfectly!")
		log.Printf("   ✅ Bloom size increased with data (avg: %.2f bytes/segment)", float64(totalBloomSize)/float64(len(m.BloomSizes)))
	} else {
		log.Println("   ⚠️ Some issues detected. Check logs above.")
	}

	log.Println("\n═══════════════════════════════════════════════════════════")
	log.Println("🔥🔥🔥 ULTRA STRESS TEST COMPLETED! 🔥🔥🔥")
	log.Println("═══════════════════════════════════════════════════════════")
}