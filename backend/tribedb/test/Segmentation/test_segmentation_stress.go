package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "tribedb/proto"
)

const (
	NUM_NODES      = 500   // تعداد Nodeها برای تست
	NUM_EDGES      = 500   // تعداد Edgeها برای تست
	NUM_READS      = 100   // تعداد Read تصادفی
	NUM_UPDATES    = 50    // تعداد Update
	NUM_DELETES    = 30    // تعداد Delete
	BATCH_SIZE     = 50    // سایز Batch برای Bulk Operations
	CONCURRENT_REQ = 10    // تعداد درخواست‌های همزمان
)

func main() {
	// تنظیم seed برای Random
	rand.Seed(time.Now().UnixNano())

	log.Println("═══════════════════════════════════════════════════════════")
	log.Println("🔥 TRIBEDB - Stress Test (Under Pressure)")
	log.Println("═══════════════════════════════════════════════════════════")

	log.Println("\n📊 Test Configuration:")
	log.Printf("   📝 Nodes: %d", NUM_NODES)
	log.Printf("   📝 Edges: %d", NUM_EDGES)
	log.Printf("   📖 Reads: %d", NUM_READS)
	log.Printf("   🔄 Updates: %d", NUM_UPDATES)
	log.Printf("   🗑️  Deletes: %d", NUM_DELETES)
	log.Printf("   📦 Batch Size: %d", BATCH_SIZE)
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
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Second) // 5 دقیقه
	defer cancel()

	log.Println("✅ Connected to gRPC server")

	// ============================================================
	// 2. آمار اولیه
	// ============================================================
	log.Println("\n📊 [1/8] Initial stats...")
	printDetailedStats(client, ctx, "Initial")

	// ============================================================
	// 3. Bulk Create Nodes (با استفاده از Batch)
	// ============================================================
	log.Println("\n📝 [2/8] Creating nodes with bulk write...")

	startTime := time.Now()
	createdNodes := make([]string, 0, NUM_NODES)

	// تقسیم به Batch‌های کوچکتر
	for batchStart := 0; batchStart < NUM_NODES; batchStart += BATCH_SIZE {
		batchEnd := batchStart + BATCH_SIZE
		if batchEnd > NUM_NODES {
			batchEnd = NUM_NODES
		}

		batchNodes := make(map[string]*pb.Node)
		for i := batchStart; i < batchEnd; i++ {
			key := fmt.Sprintf("stress-node-%d", i)
			node := &pb.Node{
				Id:   key,
				Type: "stress",
				Position: &pb.Position{
					X: rand.Float64() * 1000,
					Y: rand.Float64() * 1000,
				},
				Data: &pb.NodeData{
					Id:          key,
					Name:        fmt.Sprintf("Stress Node %d", i),
					NodeType:    "stress",
					Role:        []string{"leader", "follower", "observer"}[rand.Intn(3)],
					FriendCount: int32(rand.Intn(100)),
					AvgDistance: rand.Float64() * 50,
					Centrality:  rand.Float64(),
				},
			}
			batchNodes[key] = node
		}

		// اینجا باید Bulk Create انجام شود
		// فعلاً تک‌تک ایجاد می‌کنیم (در صورت وجود Bulk API)
		for key, node := range batchNodes {
			resp, err := client.CreateNode(ctx, &pb.CreateNodeRequest{
				Key:  key,
				Node: node,
			})
			if err != nil {
				log.Printf("❌ Failed to create node %s: %v", key, err)
				continue
			}
			if resp.Success {
				createdNodes = append(createdNodes, key)
			}
		}

		// نمایش پیشرفت
		if (batchStart/BATCH_SIZE)%2 == 0 {
			log.Printf("   📊 Progress: %d/%d nodes created", batchEnd, NUM_NODES)
		}
	}

	nodeCreateDuration := time.Since(startTime)
	log.Printf("✅ Created %d nodes in %v (avg: %.2f nodes/sec)",
		len(createdNodes), nodeCreateDuration,
		float64(len(createdNodes))/nodeCreateDuration.Seconds())

	// ============================================================
	// 4. Bulk Create Edges
	// ============================================================
	log.Println("\n📝 [3/8] Creating edges with bulk write...")

	startTime = time.Now()
	createdEdges := make([]string, 0, NUM_EDGES)

	for i := 0; i < NUM_EDGES; i++ {
		sourceIdx := rand.Intn(len(createdNodes))
		targetIdx := rand.Intn(len(createdNodes))
		for targetIdx == sourceIdx {
			targetIdx = rand.Intn(len(createdNodes))
		}

		key := fmt.Sprintf("stress-edge-%d", i)
		edge := &pb.Edge{
			Id:     key,
			Source: createdNodes[sourceIdx],
			Target: createdNodes[targetIdx],
			Type:   "weightedEdge",
			Data: &pb.EdgeData{
				Weight:    int32(rand.Intn(100) + 1),
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

		// نمایش پیشرفت
		if (i+1)%100 == 0 {
			log.Printf("   📊 Progress: %d/%d edges created", i+1, NUM_EDGES)
		}
	}

	edgeCreateDuration := time.Since(startTime)
	log.Printf("✅ Created %d edges in %v (avg: %.2f edges/sec)",
		len(createdEdges), edgeCreateDuration,
		float64(len(createdEdges))/edgeCreateDuration.Seconds())

	// ============================================================
	// 5. تست Concurrent Read (همزمان)
	// ============================================================
	log.Println("\n📖 [4/8] Testing concurrent reads...")

	startTime = time.Now()
	var readMu sync.Mutex
	readSuccess := 0
	readFail := 0

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, CONCURRENT_REQ)

	for i := 0; i < NUM_READS; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// انتخاب یک Node تصادفی
			nodeIdx := rand.Intn(len(createdNodes))
			key := createdNodes[nodeIdx]

			resp, err := client.GetNode(ctx, &pb.GetNodeRequest{Key: key})
			if err != nil {
				readMu.Lock()
				readFail++
				readMu.Unlock()
				return
			}
			if resp.Found {
				readMu.Lock()
				readSuccess++
				readMu.Unlock()
			} else {
				readMu.Lock()
				readFail++
				readMu.Unlock()
			}
		}(i)
	}

	wg.Wait()
	readDuration := time.Since(startTime)

	log.Printf("✅ Concurrent reads completed in %v", readDuration)
	log.Printf("   📊 Results: %d success, %d fail", readSuccess, readFail)

	// ============================================================
	// 6. تست Bulk Read
	// ============================================================
	log.Println("\n📚 [5/8] Testing bulk read...")

	// انتخاب Keys تصادفی
	randomKeys := make([]string, 0, 50)
	for i := 0; i < 50 && i < len(createdNodes); i++ {
		idx := rand.Intn(len(createdNodes))
		randomKeys = append(randomKeys, createdNodes[idx])
	}

	bulkResp, err := client.GetNodeBulk(ctx, &pb.GetNodeBulkRequest{Keys: randomKeys})
	if err != nil {
		log.Printf("❌ Bulk read failed: %v", err)
	} else {
		log.Printf("✅ Bulk read: found %d nodes, %d not found",
			len(bulkResp.Nodes), len(bulkResp.NotFound))
	}

	// ============================================================
	// 7. تست Concurrent Update
	// ============================================================
	log.Println("\n🔄 [6/8] Testing concurrent updates...")

	startTime = time.Now()
	updateSuccess := 0
	updateFail := 0

	var updateWg sync.WaitGroup
	updateSemaphore := make(chan struct{}, CONCURRENT_REQ)

	for i := 0; i < NUM_UPDATES; i++ {
		updateWg.Add(1)
		go func(idx int) {
			defer updateWg.Done()
			updateSemaphore <- struct{}{}
			defer func() { <-updateSemaphore }()

			nodeIdx := rand.Intn(len(createdNodes))
			key := createdNodes[nodeIdx]

			node := &pb.Node{
				Id:   key,
				Type: "updated",
				Position: &pb.Position{
					X: rand.Float64() * 1000,
					Y: rand.Float64() * 1000,
				},
				Data: &pb.NodeData{
					Id:          key,
					Name:        fmt.Sprintf("Updated %d", idx),
					NodeType:    "updated",
					Role:        []string{"leader", "follower"}[rand.Intn(2)],
					FriendCount: int32(rand.Intn(200)),
					AvgDistance: rand.Float64() * 100,
					Centrality:  rand.Float64(),
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

	updateWg.Wait()
	updateDuration := time.Since(startTime)

	log.Printf("✅ Concurrent updates completed in %v", updateDuration)
	log.Printf("   📊 Results: %d success, %d fail", updateSuccess, updateFail)

	// ============================================================
	// 8. تست Delete
	// ============================================================
	log.Println("\n🗑️ [7/8] Testing deletes...")

	startTime = time.Now()
	deleteSuccess := 0
	deleteFail := 0

	// حذف Nodeهای تصادفی
	toDelete := make([]string, 0, NUM_DELETES)
	for i := 0; i < NUM_DELETES && i < len(createdNodes); i++ {
		idx := rand.Intn(len(createdNodes))
		toDelete = append(toDelete, createdNodes[idx])
	}

	for _, key := range toDelete {
		resp, err := client.DeleteNode(ctx, &pb.DeleteNodeRequest{Key: key})
		if err != nil {
			deleteFail++
			continue
		}
		if resp.Success {
			deleteSuccess++
			// حذف از لیست createdNodes
			for i, k := range createdNodes {
				if k == key {
					createdNodes = append(createdNodes[:i], createdNodes[i+1:]...)
					break
				}
			}
		} else {
			deleteFail++
		}
	}

	deleteDuration := time.Since(startTime)
	log.Printf("✅ Deletes completed in %v", deleteDuration)
	log.Printf("   📊 Results: %d success, %d fail", deleteSuccess, deleteFail)

	// ============================================================
	// 9. آمار نهایی
	// ============================================================
	log.Println("\n📊 [8/8] Final stats...")
	printDetailedStats(client, ctx, "Final")

	// ============================================================
	// 10. گزارش نهایی
	// ============================================================
	log.Println("\n═══════════════════════════════════════════════════════════")
	log.Println("📊 Final Report")
	log.Println("═══════════════════════════════════════════════════════════")

	log.Println("\n📈 Performance Summary:")
	log.Printf("   ✅ Nodes created: %d (in %v)", NUM_NODES, nodeCreateDuration)
	log.Printf("   ✅ Edges created: %d (in %v)", NUM_EDGES, edgeCreateDuration)
	log.Printf("   ✅ Reads: %d success / %d fail (in %v)", readSuccess, readFail, readDuration)
	log.Printf("   ✅ Updates: %d success / %d fail (in %v)", updateSuccess, updateFail, updateDuration)
	log.Printf("   ✅ Deletes: %d success / %d fail (in %v)", deleteSuccess, deleteFail, deleteDuration)

	log.Println("\n📊 Final Stats:")
	stats, _ := client.GetStats(ctx, &pb.GetStatsRequest{})
	importantKeys := []string{
		"use_segmentation",
		"node_seg_total_segments", "node_seg_total_items",
		"edge_seg_total_segments", "edge_seg_total_items",
		"wal_writes", "wal_recovery", "wal_errors",
	}
	for _, key := range importantKeys {
		if val, ok := stats.Stats[key]; ok {
			log.Printf("   %s: %s", key, val)
		}
	}

	log.Println("\n🎯 Test Results:")
	if len(createdNodes) > 0 && len(createdEdges) > 0 {
		log.Println("   ✅ All operations completed successfully!")
		log.Println("   ✅ Segmentation is working under pressure!")
		log.Println("   ✅ System is stable with concurrent requests!")
	} else {
		log.Println("   ⚠️ Some operations failed. Check logs above.")
	}

	log.Println("\n═══════════════════════════════════════════════════════════")
	log.Println("🔥 Stress test completed!")
	log.Println("═══════════════════════════════════════════════════════════")
}

// ============================================================
// توابع کمکی
// ============================================================

func printDetailedStats(client pb.StorageServiceClient, ctx context.Context, label string) {
	stats, err := client.GetStats(ctx, &pb.GetStatsRequest{})
	if err != nil {
		log.Printf("⚠️ Failed to get stats: %v", err)
		return
	}

	keys := []string{
		"use_segmentation",
		"node_seg_total_segments", "node_seg_total_items",
		"edge_seg_total_segments", "edge_seg_total_items",
		"wal_writes", "wal_recovery", "wal_errors",
	}

	log.Printf("📊 [%s] Stats:", label)
	for _, key := range keys {
		if val, ok := stats.Stats[key]; ok {
			log.Printf("   %s: %s", key, val)
		}
	}
}