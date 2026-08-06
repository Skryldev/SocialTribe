	package main

	import (
		"context"
		"log"
		"time"

		"google.golang.org/grpc"
		"google.golang.org/grpc/credentials/insecure"

		pb "tribedb/proto"
	)

	func main() {
		log.Println("═══════════════════════════════════════════════════════════")
		log.Println("🧪 TRIBEDB - gRPC Client Test (Full Graph Operations)")
		log.Println("═══════════════════════════════════════════════════════════")

		// ============================================================
		// اتصال به سرور
		// ============================================================
		log.Println("\n📡 Connecting to gRPC server...")

		conn, err := grpc.Dial(
			"localhost:50051",
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithBlock(),
			grpc.WithTimeout(5*time.Second),
		)
		if err != nil {
			log.Fatalf("❌ Failed to connect: %v", err)
		}
		defer conn.Close()

		client := pb.NewStorageServiceClient(conn)
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		log.Println("✅ Connected to gRPC server")

		// ============================================================
		// 1. Create Nodes (برای تست گراف)
		// ============================================================
		log.Println("\n📝 [1/15] Creating test nodes...")

		testNodes := []struct {
			key  string
			id   string
			name string
			x    float64
			y    float64
			role string
		}{
			{"A", "node-A", "Alice", 1000.0, 0.0, "central"},
			{"B", "node-B", "Bob", 1100.0, 100.0, "bridge"},
			{"C", "node-C", "Charlie", 900.0, 100.0, "bridge"},
			{"D", "node-D", "David", 1200.0, 200.0, "leaf"},
			{"E", "node-E", "Eve", 800.0, 200.0, "leaf"},
			{"F", "node-F", "Frank", 1000.0, 300.0, "central"},
		}

		for _, n := range testNodes {
			node := &pb.Node{
				Id:   n.id,
				Type: "socialUser",
				Position: &pb.Position{
					X: n.x,
					Y: n.y,
				},
				Data: &pb.NodeData{
					Id:          n.id,
					Name:        n.name,
					NodeType:    "socialUser",
					Role:        n.role,
					FriendCount: 0,
					AvgDistance: 0,
					Centrality:  0,
				},
			}
			resp, err := client.CreateNode(ctx, &pb.CreateNodeRequest{
				Key:  n.key,
				Node: node,
			})
			if err != nil {
				log.Printf("❌ Failed to create node %s: %v", n.key, err)
			} else if resp.Success {
				log.Printf("✅ Created: %s (%s)", n.key, n.name)
			} else {
				log.Printf("⚠️ Create failed for %s: %s", n.key, resp.Error)
			}
		}

		// ============================================================
		// 2. Create Edges (گراف جهت‌دار نیست)
		// ============================================================
		log.Println("\n📝 [2/15] Creating test edges...")

		edges := []struct {
			key    string
			source string
			target string
			weight int
		}{
			{"A-B", "A", "B", 10},
			{"A-C", "A", "C", 15},
			{"B-D", "B", "D", 20},
			{"C-E", "C", "E", 25},
			{"D-F", "D", "F", 30},
			{"E-F", "E", "F", 35},
			{"A-F", "A", "F", 40},
		}

		for _, e := range edges {
			edge := &pb.Edge{
				Id:     e.key,
				Source: e.source,
				Target: e.target,
				Type:   "weightedEdge",
				Data: &pb.EdgeData{
					Weight:    int32(e.weight),
					CreatedAt: time.Now().Format("2006-01-02T15:04:05.000Z"),
					Id:        e.source,
					TargetId:  e.target,
				},
			}
			resp, err := client.CreateEdge(ctx, &pb.CreateEdgeRequest{
				Key:  e.key,
				Edge: edge,
			})
			if err != nil {
				log.Printf("❌ Failed to create edge %s: %v", e.key, err)
			} else if resp.Success {
				log.Printf("✅ Created edge: %s (%s->%s)", e.key, e.source, e.target)
			} else {
				log.Printf("⚠️ Create edge failed for %s: %s", e.key, resp.Error)
			}
		}

		// ============================================================
		// 3. GetDegree
		// ============================================================
		log.Println("\n📊 [3/15] GetDegree...")

		degreeResp, err := client.GetDegree(ctx, &pb.GetDegreeRequest{Key: "A"})
		if err != nil {
			log.Fatalf("❌ GetDegree failed: %v", err)
		}
		if degreeResp.Found {
			log.Printf("✅ Degree of A: %d", degreeResp.Degree)
		} else {
			log.Printf("⚠️ GetDegree failed: %s", degreeResp.Error)
		}

		// ============================================================
		// 4. GetDegreeBatch
		// ============================================================
		log.Println("\n📊 [4/15] GetDegreeBatch...")

		degreeBatchResp, err := client.GetDegreeBatch(ctx, &pb.GetDegreeBatchRequest{
			Keys: []string{"A", "B", "C", "D", "E", "F"},
		})
		if err != nil {
			log.Fatalf("❌ GetDegreeBatch failed: %v", err)
		}
		log.Println("✅ Degrees:")
		for key, degree := range degreeBatchResp.Degrees {
			log.Printf("   %s: %d", key, degree)
		}
		if len(degreeBatchResp.NotFound) > 0 {
			log.Printf("   Not found: %v", degreeBatchResp.NotFound)
		}

		// ============================================================
		// 5. HasEdge
		// ============================================================
		log.Println("\n🔍 [5/15] HasEdge...")

		hasEdgeResp, err := client.HasEdge(ctx, &pb.HasEdgeRequest{
			Source: "A",
			Target: "B",
		})
		if err != nil {
			log.Fatalf("❌ HasEdge failed: %v", err)
		}
		log.Printf("✅ HasEdge(A->B): %v", hasEdgeResp.Exists)

		hasEdgeResp2, err := client.HasEdge(ctx, &pb.HasEdgeRequest{
			Source: "A",
			Target: "Z",
		})
		if err != nil {
			log.Fatalf("❌ HasEdge failed: %v", err)
		}
		log.Printf("✅ HasEdge(A->Z): %v", hasEdgeResp2.Exists)

		// ============================================================
		// 6. HasEdgeBatch
		// ============================================================
		log.Println("\n🔍 [6/15] HasEdgeBatch...")

		hasEdgeBatchResp, err := client.HasEdgeBatch(ctx, &pb.HasEdgeBatchRequest{
			Source:  "A",
			Targets: []string{"B", "C", "D", "E", "F"},
		})
		if err != nil {
			log.Fatalf("❌ HasEdgeBatch failed: %v", err)
		}
		log.Println("✅ HasEdgeBatch results:")
		for target, exists := range hasEdgeBatchResp.Results {
			log.Printf("   A->%s: %v", target, exists)
		}

		// ============================================================
		// 7. GetEdgeWeight
		// ============================================================
		log.Println("\n⚖️ [7/15] GetEdgeWeight...")

		weightResp, err := client.GetEdgeWeight(ctx, &pb.GetEdgeWeightRequest{
			Source: "A",
			Target: "B",
		})
		if err != nil {
			log.Fatalf("❌ GetEdgeWeight failed: %v", err)
		}
		if weightResp.Found {
			log.Printf("✅ Weight of A->B: %d", weightResp.Weight)
		} else {
			log.Printf("⚠️ Edge not found: %s", weightResp.Error)
		}

		// ============================================================
		// 8. GetEdgeWeightsBatch
		// ============================================================
		log.Println("\n⚖️ [8/15] GetEdgeWeightsBatch...")

		edgePairs := []*pb.EdgePair{
			{Source: "A", Target: "B"},
			{Source: "A", Target: "C"},
			{Source: "B", Target: "D"},
			{Source: "X", Target: "Y"}, // این یافت نمی‌شود
		}

		weightsBatchResp, err := client.GetEdgeWeightsBatch(ctx, &pb.GetEdgeWeightsBatchRequest{
			Edges: edgePairs,
		})
		if err != nil {
			log.Fatalf("❌ GetEdgeWeightsBatch failed: %v", err)
		}
		log.Println("✅ Edge weights:")
		for key, weight := range weightsBatchResp.Weights {
			log.Printf("   %s: %d", key, weight)
		}
		if len(weightsBatchResp.NotFound) > 0 {
			log.Printf("   Not found: %v", weightsBatchResp.NotFound)
		}

		// ============================================================
		// 9. GetCommonNeighbors
		// ============================================================
		log.Println("\n👥 [9/15] GetCommonNeighbors...")

		commonResp, err := client.GetCommonNeighbors(ctx, &pb.GetCommonNeighborsRequest{
			Source: "B",
			Target: "C",
		})
		if err != nil {
			log.Fatalf("❌ GetCommonNeighbors failed: %v", err)
		}
		if commonResp.Found {
			log.Printf("✅ Common neighbors of B and C: %v", commonResp.Neighbors)
		} else {
			log.Printf("⚠️ GetCommonNeighbors failed: %s", commonResp.Error)
		}

		// ============================================================
		// 10. CountCommonNeighbors
		// ============================================================
		log.Println("\n🔢 [10/15] CountCommonNeighbors...")

		countCommonResp, err := client.CountCommonNeighbors(ctx, &pb.CountCommonNeighborsRequest{
			Source: "B",
			Target: "C",
		})
		if err != nil {
			log.Fatalf("❌ CountCommonNeighbors failed: %v", err)
		}
		if countCommonResp.Found {
			log.Printf("✅ Number of common neighbors of B and C: %d", countCommonResp.Count)
		} else {
			log.Printf("⚠️ CountCommonNeighbors failed: %s", countCommonResp.Error)
		}

		// ============================================================
		// 11. GetNeighbors
		// ============================================================
		log.Println("\n🌐 [11/15] GetNeighbors...")

		neighborsResp, err := client.GetNeighbors(ctx, &pb.GetNeighborsRequest{
			Key: "A",
		})
		if err != nil {
			log.Fatalf("❌ GetNeighbors failed: %v", err)
		}
		if neighborsResp.Found {
			log.Printf("✅ Neighbors of A: %v", neighborsResp.Neighbors)
		} else {
			log.Printf("⚠️ GetNeighbors failed: %s", neighborsResp.Error)
		}

		// ============================================================
		// 12. GetNeighborsBatch
		// ============================================================
		log.Println("\n🌐 [12/15] GetNeighborsBatch...")

		neighborsBatchResp, err := client.GetNeighborsBatch(ctx, &pb.GetNeighborsBatchRequest{
			Keys: []string{"A", "B", "C", "D"},
		})
		if err != nil {
			log.Fatalf("❌ GetNeighborsBatch failed: %v", err)
		}
		log.Println("✅ Neighbors batch:")
		for key, neighborList := range neighborsBatchResp.Neighbors {
			log.Printf("   %s: %v", key, neighborList.Neighbors)
		}
		if len(neighborsBatchResp.NotFound) > 0 {
			log.Printf("   Not found: %v", neighborsBatchResp.NotFound)
		}

		// ============================================================
		// 13. GetNeighborsWithWeights
		// ============================================================
		log.Println("\n⚖️🌐 [13/15] GetNeighborsWithWeights...")

		neighborsWeightResp, err := client.GetNeighborsWithWeights(ctx, &pb.GetNeighborsWithWeightsRequest{
			Key: "A",
		})
		if err != nil {
			log.Fatalf("❌ GetNeighborsWithWeights failed: %v", err)
		}
		if neighborsWeightResp.Found {
			log.Println("✅ Neighbors of A with weights:")
			for neighbor, weight := range neighborsWeightResp.Neighbors {
				log.Printf("   %s: %d", neighbor, weight)
			}
		} else {
			log.Printf("⚠️ GetNeighborsWithWeights failed: %s", neighborsWeightResp.Error)
		}

		// ============================================================
		// 14. ShortestPath
		// ============================================================
		log.Println("\n🛤️ [14/15] ShortestPath...")

		shortestPathResp, err := client.ShortestPath(ctx, &pb.ShortestPathRequest{
			Source: "A",
			Target: "F",
		})
		if err != nil {
			log.Fatalf("❌ ShortestPath failed: %v", err)
		}
		if shortestPathResp.Found {
			log.Printf("✅ Shortest path A->F: %v", shortestPathResp.Path)
		} else {
			log.Printf("⚠️ ShortestPath failed: %s", shortestPathResp.Error)
		}

		// تست مسیر غیرموجود
		shortestPathResp2, err := client.ShortestPath(ctx, &pb.ShortestPathRequest{
			Source: "A",
			Target: "Z",
		})
		if err != nil {
			log.Fatalf("❌ ShortestPath failed: %v", err)
		}
		if shortestPathResp2.Found {
			log.Printf("✅ Shortest path A->Z: %v", shortestPathResp2.Path)
		} else {
			log.Printf("⚠️ No path found A->Z: %s", shortestPathResp2.Error)
		}

		// ============================================================
		// 15. IsNeighbor
		// ============================================================
		log.Println("\n🔗 [15/15] IsNeighbor...")

		isNeighborResp, err := client.IsNeighbor(ctx, &pb.IsNeighborRequest{
			Source: "A",
			Target: "B",
		})
		if err != nil {
			log.Fatalf("❌ IsNeighbor failed: %v", err)
		}
		log.Printf("✅ IsNeighbor(A, B): %v", isNeighborResp.IsNeighbor)

		isNeighborResp2, err := client.IsNeighbor(ctx, &pb.IsNeighborRequest{
			Source: "A",
			Target: "Z",
		})
		if err != nil {
			log.Fatalf("❌ IsNeighbor failed: %v", err)
		}
		log.Printf("✅ IsNeighbor(A, Z): %v", isNeighborResp2.IsNeighbor)

		// ============================================================
		// Cache Stats
		// ============================================================
		log.Println("\n📊 Cache Stats...")

		cacheStats, err := client.GetCacheStats(ctx, &pb.GetCacheStatsRequest{})
		if err != nil {
			log.Fatalf("❌ GetCacheStats failed: %v", err)
		}
		log.Printf("📊 Cache Stats:")
		log.Printf("   Hits:        %d", cacheStats.Hits)
		log.Printf("   Misses:      %d", cacheStats.Misses)
		log.Printf("   Hit Ratio:   %.2f%%", cacheStats.HitRatio*100)
		log.Printf("   Live Entries: %d", cacheStats.LiveEntries)
		log.Printf("   Cache Size:  %d", cacheStats.CacheSize)

		// ============================================================
		// Full Storage Stats
		// ============================================================
		log.Println("\n📊 Full Storage Stats...")

		stats, err := client.GetStats(ctx, &pb.GetStatsRequest{})
		if err != nil {
			log.Fatalf("❌ GetStats failed: %v", err)
		}

		importantKeys := []string{
			"max_nodes", "max_edges", "node_record_size", "edge_record_size",
			"use_segmentation", "node_total_segments", "node_total_items",
			"edge_total_segments", "edge_total_items",
			"wal_writes", "wal_recovery", "wal_errors",
			"edge_index_nodes", "edge_index_edges",
		}

		log.Println("📊 Storage Statistics:")
		for _, key := range importantKeys {
			if val, ok := stats.Stats[key]; ok {
				log.Printf("   %s: %s", key, val)
			}
		}

		// ============================================================
		// Cleanup: Delete test nodes
		// ============================================================
		log.Println("\n🗑️ Cleaning up test data...")

		for _, n := range testNodes {
			_, err := client.DeleteNode(ctx, &pb.DeleteNodeRequest{Key: n.key})
			if err != nil {
				log.Printf("⚠️ Failed to delete %s: %v", n.key, err)
			}
		}
		log.Println("✅ Cleanup completed")

		// ============================================================
		// پایان
		// ============================================================
		log.Println("\n═══════════════════════════════════════════════════════════")
		log.Println("✅ All graph operations tests completed successfully!")
		log.Println("═══════════════════════════════════════════════════════════")
	}