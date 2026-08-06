// tests/edge_index_diagnostic_test.go
//
// Diagnostic test that traces exactly what happens when edges are created.
// This test bypasses Python completely and directly tests the Go storage layer.
//
// Usage:
//   cd D:\Golang\tribedb
//   go run tests/edge_index_diagnostic_test.go

package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health/grpc_health_v1"

	pb "tribedb/proto"
)

const (
	serverAddr = "localhost:50051"
)

func main() {
	log.SetFlags(log.Ltime)
	log.SetPrefix("[DIAG] ")

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║   🔬  EDGE INDEX DIAGNOSTIC TEST                    ║")
	fmt.Println("╚══════════════════════════════════════════════════════╝")
	fmt.Println()

	// ── Connect ────────────────────────────────────────────────────────
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		log.Fatalf("❌ Cannot connect to %s: %v", serverAddr, err)
	}
	defer conn.Close()

	client := pb.NewStorageServiceClient(conn)
	health := grpc_health_v1.NewHealthClient(conn)

	// Health check
	hctx, hcancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer hcancel()
	hresp, err := health.Check(hctx, &grpc_health_v1.HealthCheckRequest{Service: "storage"})
	if err != nil || hresp.Status != grpc_health_v1.HealthCheckResponse_SERVING {
		log.Fatalf("❌ Server not healthy: %v", err)
	}
	log.Println("✅ Server healthy")

	// ── Step 1: Check existing state ──────────────────────────────────
	log.Println()
	log.Println("━━━ STEP 1: Current State ━━━")

	stats, err := client.GetStats(context.Background(), &pb.GetStatsRequest{})
	if err != nil {
		log.Printf("⚠️  GetStats failed: %v", err)
	} else {
		log.Printf("   edge_index_nodes : %s", stats.Stats["edge_index_nodes"])
		log.Printf("   edge_index_edges : %s", stats.Stats["edge_index_edges"])
		log.Printf("   node_key_index_entries: %s", stats.Stats["node_key_index_entries"])
		log.Printf("   edge_key_index_entries: %s", stats.Stats["edge_key_index_entries"])
		log.Printf("   next_node_id     : %s", stats.Stats["next_node_id"])
		log.Printf("   next_edge_id     : %s", stats.Stats["next_edge_id"])
	}

	// ── Step 2: Check if test nodes exist ─────────────────────────────
	log.Println()
	log.Println("━━━ STEP 2: Node Existence ━━━")

	nodeIDs := []string{"node_1", "node_2", "node_3", "node_4", "node_5"}
	existingNodes := 0
	for _, nid := range nodeIDs {
		resp, err := client.ContainsNode(context.Background(), &pb.ContainsNodeRequest{Key: nid})
		if err != nil {
			log.Printf("   ContainsNode(%s): RPC error: %v", nid, err)
			continue
		}
		if resp.Exists {
			existingNodes++
		}
		log.Printf("   ContainsNode(%s): exists=%v in_cache=%v", nid, resp.Exists, resp.InCache)
	}

	needImport := existingNodes == 0

	// ── Step 3: Import test data if needed ────────────────────────────
	if needImport {
		log.Println()
		log.Println("━━━ STEP 3: Importing Test Data ━━━")
		importTestData(client)
	} else {
		log.Println()
		log.Println("━━━ STEP 3: Using Existing Data ━━━")
	}

	// ── Step 4: Get fresh stats after import ──────────────────────────
	log.Println()
	log.Println("━━━ STEP 4: Stats After Import ━━━")

	stats2, _ := client.GetStats(context.Background(), &pb.GetStatsRequest{})
	edgeIdxNodes := stats2.Stats["edge_index_nodes"]
	edgeIdxEdges := stats2.Stats["edge_index_edges"]
	log.Printf("   edge_index_nodes : %s", edgeIdxNodes)
	log.Printf("   edge_index_edges : %s", edgeIdxEdges)
	log.Printf("   next_node_id     : %s", stats2.Stats["next_node_id"])
	log.Printf("   next_edge_id     : %s", stats2.Stats["next_edge_id"])

	// ── Step 5: Test GetNeighborsBatch ────────────────────────────────
	log.Println()
	log.Println("━━━ STEP 5: GetNeighborsBatch Test ━━━")

	allNodeIDs := getAllNodeIDs(client)
	log.Printf("   Testing with %d nodes", len(allNodeIDs))

	if len(allNodeIDs) == 0 {
		log.Println("❌ No nodes found! Cannot test GetNeighborsBatch")
		os.Exit(1)
	}

	testIDs := allNodeIDs
	if len(testIDs) > 10 {
		testIDs = testIDs[:10]
	}

	// ✅ Declare these OUTSIDE the if block
	var totalRefs int
	var nodesWithEdges, nodesEmpty int

	batchResp, err := client.GetNeighborsBatch(context.Background(), &pb.GetNeighborsBatchRequest{
		Keys: testIDs,
	})
	if err != nil {
		log.Printf("❌ GetNeighborsBatch RPC error: %v", err)
	} else {
		if batchResp.Error != "" {
			log.Printf("⚠️  Server error: %s", batchResp.Error)
		}

		for _, nid := range testIDs {
			nl, ok := batchResp.Neighbors[nid]
			if !ok {
				log.Printf("   %s: NOT IN RESPONSE", nid)
				nodesEmpty++
				continue
			}
			n := len(nl.Neighbors)
			totalRefs += n
			if n > 0 {
				nodesWithEdges++
				log.Printf("   %s: %d neighbors → %v", nid, n, nl.Neighbors)
			} else {
				nodesEmpty++
				log.Printf("   %s: 0 neighbors (empty)", nid)
			}
		}

		log.Println("   ─────────────────────────────────────")
		log.Printf("   Total references : %d", totalRefs)
		log.Printf("   Undirected edges : %d", totalRefs/2)
		log.Printf("   Nodes with edges : %d", nodesWithEdges)
		log.Printf("   Nodes empty      : %d", nodesEmpty)
		log.Printf("   Not in response  : %d", len(batchResp.NotFound))
	}

	// ── Step 6: Test GetDegree for each node individually ─────────────
	log.Println()
	log.Println("━━━ STEP 6: Individual GetDegree ━━━")

	var totalDegree uint64
	var zeroDegreeNodes []string

	for _, nid := range testIDs {
		degResp, err := client.GetDegree(context.Background(), &pb.GetDegreeRequest{Key: nid})
		if err != nil {
			log.Printf("   GetDegree(%s): RPC error: %v", nid, err)
			continue
		}
		totalDegree += degResp.Degree
		if degResp.Degree == 0 {
			zeroDegreeNodes = append(zeroDegreeNodes, nid)
		}
		log.Printf("   degree(%s) = %d (found=%v)", nid, degResp.Degree, degResp.Found)
	}

	log.Println("   ─────────────────────────────────────")
	log.Printf("   Total degree     : %d", totalDegree)
	log.Printf("   Zero-degree nodes: %d", len(zeroDegreeNodes))
	if len(zeroDegreeNodes) > 0 {
		limit := 3
		if len(zeroDegreeNodes) < limit {
			limit = len(zeroDegreeNodes)
		}
		log.Printf("   Sample: %v", zeroDegreeNodes[:limit])
	}

	// ── Step 7: Compare edge_key.idx vs edgeIndex ─────────────────────
	log.Println()
	log.Println("━━━ STEP 7: Edge Count Comparison ━━━")

	edgeKeyEntries := stats2.Stats["edge_key_index_entries"]
	log.Printf("   edge_key_index (disk) : %s", edgeKeyEntries)
	log.Printf("   edge_index (memory)   : %s", edgeIdxEdges)
	log.Printf("   Expected undirected   : %s", edgeKeyEntries)

	// ── Step 8: Diagnosis ─────────────────────────────────────────────
	log.Println()
	log.Println("━━━ STEP 8: DIAGNOSIS ━━━")

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║                DIAGNOSTIC RESULT                     ║")
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║   edge_index_nodes (memory) : %-22s ║\n", edgeIdxNodes)
	fmt.Printf("║   edge_index_edges (memory) : %-22s ║\n", edgeIdxEdges)
	fmt.Printf("║   Total references          : %-22d ║\n", totalRefs)
	fmt.Printf("║   Total degree              : %-22d ║\n", totalDegree)

	if edgeIdxEdges == "0" || totalRefs == 0 {
		fmt.Println("╠══════════════════════════════════════════════════════╣")
		fmt.Println("║  ❌ EDGE INDEX IS EMPTY!                             ║")
		fmt.Println("║  AddEdge is NOT being called during import!          ║")
		fmt.Println("║  Check: graph_crud.go → WriteEdgeByKey               ║")
	} else if totalRefs > 0 && totalRefs < len(testIDs)*2 {
		fmt.Println("╠══════════════════════════════════════════════════════╣")
		fmt.Println("║  ⚠️  EDGE INDEX IS INCOMPLETE!                       ║")
		fmt.Println("║  AddEdge adds only ONE direction!                    ║")
		fmt.Println("║  Check: graph_storage_extended.go → AddEdge          ║")
	} else {
		fmt.Println("╠══════════════════════════════════════════════════════╣")
		fmt.Println("║  ✅ EDGE INDEX IS WORKING CORRECTLY!                 ║")
	}

	fmt.Println("╚══════════════════════════════════════════════════════╝")
	fmt.Println()
}

// ── Helpers ────────────────────────────────────────────────────────────

func importTestData(client pb.StorageServiceClient) {
	ctx := context.Background()

	// Create 5 nodes
	log.Println("   Creating 5 test nodes...")
	for i := 1; i <= 5; i++ {
		nodeID := fmt.Sprintf("node_%d", i)
		_, err := client.CreateNode(ctx, &pb.CreateNodeRequest{
			Key: nodeID,
			Node: &pb.Node{
				Id:   nodeID,
				Type: "test",
				Data: &pb.NodeData{Id: nodeID, Name: fmt.Sprintf("Node %d", i)},
			},
		})
		if err != nil {
			log.Printf("   ❌ CreateNode(%s): %v", nodeID, err)
		} else {
			log.Printf("   ✅ Created node: %s", nodeID)
		}
	}

	// Create 4 edges forming a connected graph
	edges := []struct{ src, dst string }{
		{"node_1", "node_2"},
		{"node_2", "node_3"},
		{"node_3", "node_4"},
		{"node_4", "node_5"},
	}

	log.Println("   Creating 4 test edges...")
	for _, e := range edges {
		edgeKey := fmt.Sprintf("%s-%s", e.src, e.dst)
		_, err := client.CreateEdge(ctx, &pb.CreateEdgeRequest{
			Key: edgeKey,
			Edge: &pb.Edge{
				Id:     edgeKey,
				Source: e.src,
				Target: e.dst,
				Type:   "weightedEdge",
				Data: &pb.EdgeData{
					Weight:    1,
					CreatedAt: time.Now().Format(time.RFC3339),
					Id:        edgeKey,
					TargetId:  e.dst,
				},
			},
		})
		if err != nil {
			log.Printf("   ❌ CreateEdge(%s): %v", edgeKey, err)
		} else {
			log.Printf("   ✅ Created edge: %s → %s", e.src, e.dst)
		}
	}
}

func getAllNodeIDs(client pb.StorageServiceClient) []string {
	ids := []string{}
	for i := 1; i <= 20; i++ {
		nid := fmt.Sprintf("node_%d", i)
		resp, err := client.ContainsNode(context.Background(), &pb.ContainsNodeRequest{Key: nid})
		if err == nil && resp.Exists {
			ids = append(ids, nid)
		}
	}
	if len(ids) == 0 {
		log.Println("   No node_N nodes found — store may use different IDs")
	}
	return ids
}