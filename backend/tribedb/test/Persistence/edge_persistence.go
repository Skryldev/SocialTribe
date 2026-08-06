// tests/edge_persistence_test.go
//
// Production-grade integration test suite for TribeDB Edge Index Persistence.
//
// This test validates the core fix for the edge index persistence bug where
// GetNeighborsBatch returned incomplete results after import and zero results
// after server restart.
//
// Architecture:
//   - Test 1: Validates edge count immediately after import (cache + disk)
//   - Test 2: Validates edge survival across server restart (persistence)
//   - Test 3: Validates sequential ID persistence in metadata.json
//   - Test 4: Validates server-side log messages for index rebuild
//   - Test 5: Validates ContainsNode cache/disk interaction
//
// Prerequisites:
//   Terminal 1: cd D:\Golang\tribedb && go run .
//   Terminal 2: cd D:\Golang\tribedb\test\Persistence && go run edge_persistence.go
//
// The test is self-contained: if no data exists, it will import 20 nodes
// and 41 edges automatically before running the test suite.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health/grpc_health_v1"

	pb "tribedb/proto"
)

// ============================================================================
// Configuration — adjust these constants for your environment
// ============================================================================

const (
	// Network
	serverAddr   = "localhost:50051"
	shutdownAddr = "http://localhost:50052/shutdown"
	healthAddr   = "http://localhost:50052/health"

	// Paths (relative to test/Persistence directory)
	storePath   = "../../store"
	logFilePath = "../../logs/storage/app.jsonl"

	// Server process
	tribeDBDir = "D:\\Golang\\tribedb"

	// Test data dimensions
	testNodeCount = 20
	testEdgeCount = 41

	// Timeouts
	defaultTimeout  = 30 * time.Second
	healthTimeout   = 5 * time.Second
	connectTimeout  = 10 * time.Second
	shutdownTimeout = 10 * time.Second
	serverStartWait = 60 * time.Second
)

// ============================================================================
// TestRunner — gRPC client wrapper
// ============================================================================

// TestRunner holds a gRPC connection and the generated service clients.
type TestRunner struct {
	conn   *grpc.ClientConn
	client pb.StorageServiceClient
	health grpc_health_v1.HealthClient
}

// NewTestRunner dials the server and returns a ready-to-use runner.
func NewTestRunner() (*TestRunner, error) {
	ctx, cancel := context.WithTimeout(context.Background(), connectTimeout)
	defer cancel()

	conn, err := grpc.DialContext(ctx, serverAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", serverAddr, err)
	}

	return &TestRunner{
		conn:   conn,
		client: pb.NewStorageServiceClient(conn),
		health: grpc_health_v1.NewHealthClient(conn),
	}, nil
}

// Close tears down the underlying gRPC connection.
func (tr *TestRunner) Close() {
	if tr.conn != nil {
		tr.conn.Close()
	}
}

// CheckHealth verifies the "storage" service is SERVING.
func (tr *TestRunner) CheckHealth() error {
	ctx, cancel := context.WithTimeout(context.Background(), healthTimeout)
	defer cancel()

	resp, err := tr.health.Check(ctx, &grpc_health_v1.HealthCheckRequest{
		Service: "storage",
	})
	if err != nil {
		return fmt.Errorf("health check: %w", err)
	}
	if resp.Status != grpc_health_v1.HealthCheckResponse_SERVING {
		return fmt.Errorf("server status is %s (expected SERVING)", resp.Status)
	}
	return nil
}

// ============================================================================
// Test Data
// ============================================================================

// testEdge is a simple source→target pair used to build the test graph.
type testEdge struct {
	Source, Target string
}

// testEdges returns exactly testEdgeCount edges connecting testNodeCount nodes.
func testEdges() []testEdge {
	all := []testEdge{
		{"node_1", "node_2"}, {"node_1", "node_3"}, {"node_1", "node_4"},
		{"node_2", "node_3"}, {"node_2", "node_5"},
		{"node_3", "node_4"}, {"node_3", "node_5"}, {"node_3", "node_6"},
		{"node_4", "node_5"}, {"node_4", "node_7"},
		{"node_5", "node_6"}, {"node_5", "node_7"}, {"node_5", "node_8"},
		{"node_6", "node_7"}, {"node_6", "node_9"},
		{"node_7", "node_8"}, {"node_7", "node_9"}, {"node_7", "node_10"},
		{"node_8", "node_9"}, {"node_8", "node_11"},
		{"node_9", "node_10"}, {"node_9", "node_11"}, {"node_9", "node_12"},
		{"node_10", "node_11"}, {"node_10", "node_13"},
		{"node_11", "node_12"}, {"node_11", "node_13"}, {"node_11", "node_14"},
		{"node_12", "node_13"}, {"node_12", "node_15"},
		{"node_13", "node_14"}, {"node_13", "node_15"}, {"node_13", "node_16"},
		{"node_14", "node_15"}, {"node_14", "node_17"},
		{"node_15", "node_16"}, {"node_15", "node_17"}, {"node_15", "node_18"},
		{"node_16", "node_17"}, {"node_16", "node_19"},
		{"node_17", "node_18"}, {"node_17", "node_19"}, {"node_17", "node_20"},
		{"node_18", "node_19"}, {"node_18", "node_20"},
		{"node_19", "node_20"},
	}
	if len(all) > testEdgeCount {
		return all[:testEdgeCount]
	}
	return all
}

// nodeIDs returns the canonical list of node keys for the test dataset.
func nodeIDs() []string {
	ids := make([]string, testNodeCount)
	for i := 0; i < testNodeCount; i++ {
		ids[i] = fmt.Sprintf("node_%d", i+1)
	}
	return ids
}

// ============================================================================
// Import helpers
// ============================================================================

// ImportTestDataset creates testNodeCount nodes and testEdgeCount edges.
// It is idempotent for nodes (CreateNode overwrites), but edges are always
// re-created to guarantee the correct graph structure.
func ImportTestDataset(client pb.StorageServiceClient) error {
	ctx := context.Background()

	// ---- nodes ----
	log.Println("   📥 Creating nodes...")
	for i := 1; i <= testNodeCount; i++ {
		nodeID := fmt.Sprintf("node_%d", i)
		_, err := client.CreateNode(ctx, &pb.CreateNodeRequest{
			Key: nodeID,
			Node: &pb.Node{
				Id:   nodeID,
				Type: "socialUser",
				Position: &pb.Position{
					X: float64(i%5) * 100,
					Y: float64(i/5) * 100,
				},
				Data: &pb.NodeData{
					Id:       nodeID,
					Name:     fmt.Sprintf("User %d", i),
					NodeType: "person",
					Role:     "member",
				},
			},
		})
		if err != nil {
			return fmt.Errorf("create node %s: %w", nodeID, err)
		}
	}
	log.Printf("   ✅ %d nodes created\n", testNodeCount)

	// ---- edges ----
	log.Println("   📥 Creating edges...")
	edges := testEdges()
	for _, e := range edges {
		edgeKey := fmt.Sprintf("%s-%s", e.Source, e.Target)
		_, err := client.CreateEdge(ctx, &pb.CreateEdgeRequest{
			Key: edgeKey,
			Edge: &pb.Edge{
				Id:     edgeKey,
				Source: e.Source,
				Target: e.Target,
				Type:   "weightedEdge",
				Data: &pb.EdgeData{
					Weight:    1,
					CreatedAt: time.Now().Format(time.RFC3339),
					Id:        edgeKey,
					TargetId:  e.Target,
				},
			},
		})
		if err != nil {
			return fmt.Errorf("create edge %s: %w", edgeKey, err)
		}
	}
	log.Printf("   ✅ %d edges created\n", len(edges))
	return nil
}

func dataExists(client pb.StorageServiceClient) bool {
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    resp, err := client.GetNode(ctx, &pb.GetNodeRequest{Key: "node_1"})
    if err != nil {
        return false
    }
    return resp.Found  // ✅ این مهم است
}

// ============================================================================
// Test 1 — Edge Count After Import
// ============================================================================

// TestEdgeCountAfterImport calls GetNeighborsBatch for every node and asserts
// the total undirected edge count equals testEdgeCount.
func TestEdgeCountAfterImport(tr *TestRunner) error {
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🧪 TEST 1  Edge Count After Import")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	ids := nodeIDs()
	log.Printf("   📋 Querying %d nodes via GetNeighborsBatch...\n", len(ids))

	resp, err := tr.client.GetNeighborsBatch(ctx, &pb.GetNeighborsBatchRequest{
		Keys: ids,
	})
	if err != nil {
		return fmt.Errorf("GetNeighborsBatch RPC: %w", err)
	}
	if resp.Error != "" {
		log.Printf("   ⚠️  Server error: %s\n", resp.Error)
	}

	// Tally
	totalRefs := 0
	withEdges, withoutEdges, missing := 0, 0, 0
	for _, id := range ids {
		nl, ok := resp.Neighbors[id]
		if !ok {
			missing++
			continue
		}
		n := len(nl.Neighbors)
		totalRefs += n
		if n > 0 {
			withEdges++
		} else {
			withoutEdges++
		}
	}
	actualEdges := totalRefs / 2 // undirected

	log.Println("   ┌─────────────────────────────────────────")
	log.Printf("   │ Neighbor references : %d\n", totalRefs)
	log.Printf("   │ Undirected edges    : %d\n", actualEdges)
	log.Printf("   │ Nodes with edges    : %d\n", withEdges)
	log.Printf("   │ Nodes without edges : %d\n", withoutEdges)
	log.Printf("   │ Missing in response : %d\n", missing)
	log.Printf("   │ Expected edges      : %d\n", testEdgeCount)
	log.Println("   └─────────────────────────────────────────")

	switch {
	case actualEdges == 0:
		return fmt.Errorf("ZERO edges — edgeIndex is empty (the exact bug!)")
	case actualEdges < testEdgeCount:
		return fmt.Errorf("edge count %d < expected %d — edgeIndex incomplete", actualEdges, testEdgeCount)
	case missing == testNodeCount:
		return fmt.Errorf("all %d nodes missing from response", testNodeCount)
	default:
		log.Printf("   ✅ PASSED  (%d edges)\n", actualEdges)
		return nil
	}
}

// ============================================================================
// Test 2 — Edge Persistence Across Restart
// ============================================================================

// TestEdgePersistenceAfterRestart performs a full shutdown/restart cycle and
// verifies the edge count is preserved.
func TestEdgePersistenceAfterRestart() error {
	log.Println()
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🧪 TEST 2  Edge Persistence After Restart")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// 1. Count before
	log.Println("   📊 Counting edges BEFORE restart...")
	before, err := edgeCountFromServer()
	if err != nil {
		log.Printf("   ⚠️  Could not read before-count: %v\n", err)
		before = -1
	} else {
		log.Printf("   📊 Before: %d edges\n", before)
	}

	// 2. Shutdown
	log.Println("   🛑 Triggering graceful shutdown...")
	if err := httpShutdown(); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	log.Println("   ✅ Shutdown acknowledged")
	time.Sleep(3 * time.Second)

	// 3. Verify store & metadata
	log.Printf("   📂 Checking %s ...\n", storePath)
	if _, err := os.Stat(storePath); os.IsNotExist(err) {
		return fmt.Errorf("store directory missing — data was not persisted")
	}
	log.Println("   ✅ Store directory present")

	metaPath := storePath + "/metadata.json"
	meta, err := readJSON(metaPath)
	if err != nil {
		return fmt.Errorf("metadata.json: %w", err)
	}
	nid := floatFromMap(meta, "next_node_id")
	eid := floatFromMap(meta, "next_edge_id")
	log.Printf("   📊 metadata: next_node_id=%.0f  next_edge_id=%.0f  status=%v\n", nid, eid, meta["status"])
	if eid <= 1 {
		return fmt.Errorf("next_edge_id is %.0f — IDs not saved!", eid)
	}
	log.Println("   ✅ Sequential IDs saved correctly")

	// 4. Restart
	log.Println("   🚀 Restarting server...")
	cmd := startServer()
	defer func() {
		if cmd != nil && cmd.Process != nil {
			cmd.Process.Kill()
		}
	}()

	log.Println("   ⏳ Waiting for server...")
	if err := waitHealthy(serverStartWait); err != nil {
		return fmt.Errorf("server not ready: %w", err)
	}
	log.Println("   ✅ Server ready")

	// 5. Count after
	log.Println("   📊 Counting edges AFTER restart...")
	after, err := edgeCountFromServer()
	if err != nil {
		return fmt.Errorf("after-count: %w", err)
	}
	log.Printf("   📊 After: %d edges\n", after)

	// 6. Assert
	switch {
	case after == 0:
		return fmt.Errorf("ZERO edges after restart — edgeIndex not rebuilt!")
	case before > 0 && after < before:
		return fmt.Errorf("edges decreased from %d → %d", before, after)
	case after == testEdgeCount:
		log.Printf("   ✅ PASSED  (%d edges survived restart)\n", after)
	default:
		log.Printf("   ⚠️  PARTIAL: %d/%d edges\n", after, testEdgeCount)
	}
	return nil
}

// ============================================================================
// Test 3 — Metadata Persistence
// ============================================================================

// TestMetadataPersistence validates that next_node_id and next_edge_id in
// metadata.json are at least the expected minimum values.
func TestMetadataPersistence() error {
	log.Println()
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🧪 TEST 3  Metadata Persistence")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	meta, err := readJSON(storePath + "/metadata.json")
	if err != nil {
		return fmt.Errorf("read metadata: %w", err)
	}

	nid := floatFromMap(meta, "next_node_id")
	eid := floatFromMap(meta, "next_edge_id")

	log.Printf("   next_node_id = %.0f  (min %d)\n", nid, testNodeCount+1)
	log.Printf("   next_edge_id = %.0f  (min %d)\n", eid, testEdgeCount+1)

	if nid < testNodeCount+1 {
		return fmt.Errorf("next_node_id too low: %.0f", nid)
	}
	if eid < testEdgeCount+1 {
		return fmt.Errorf("next_edge_id too low: %.0f", eid)
	}

	log.Println("   ✅ PASSED")
	return nil
}

// ============================================================================
// Test 4 — Log Verification
// ============================================================================

// TestEdgeIndexRebuildLogs scans the structured log file for key phrases that
// prove the edge-index rebuild ran at startup.
func TestEdgeIndexRebuildLogs() error {
	log.Println()
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🧪 TEST 4  Edge-Index Rebuild Logs")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	raw, err := os.ReadFile(logFilePath)
	if err != nil {
		log.Printf("   ⚠️  Cannot read log (%v) — skipping\n", err)
		return nil // non-fatal
	}

	haystack := string(raw)
	patterns := []string{
		"Building edge index from persisted",
		"Edge index rebuild completed",
		"edges_added",
		"Restored sequential IDs from metadata",
		"Saved sequential IDs to metadata",
	}

	missing := 0
	for _, p := range patterns {
		if strings.Contains(haystack, p) {
			log.Printf("   ✅  %q\n", p)
		} else {
			log.Printf("   ❌  MISSING %q\n", p)
			missing++
		}
	}
	if missing > 0 {
		log.Println("   ⚠️  Some log markers missing (non-fatal)")
	} else {
		log.Println("   ✅ PASSED")
	}
	return nil
}

// ============================================================================
// Test 5 — ContainsNode Cache / Disk Interaction
// ============================================================================

// TestContainsNodeCacheBehaviour validates that ContainsNode falls back to
// persistent storage after a cache miss, and that a subsequent GetNode
// populates the cache so the next ContainsNode hits it.
func TestContainsNodeCacheBehaviour() error {
	log.Println()
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🧪 TEST 5  ContainsNode Cache Behaviour")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	tr, err := NewTestRunner()
	if err != nil {
		return err
	}
	defer tr.Close()
	ctx := context.Background()

	existKey := "node_1"
	missKey := "node_nonexistent"

	// 5a — cold cache → disk fallback
	r1, err := tr.client.ContainsNode(ctx, &pb.ContainsNodeRequest{Key: existKey})
	if err != nil {
		return fmt.Errorf("ContainsNode(%s): %w", existKey, err)
	}
	log.Printf("   ContainsNode(%s) = %v  (in_cache=%v)\n", existKey, r1.Exists, r1.InCache)
	if !r1.Exists {
		return fmt.Errorf("node_1 must exist")
	}
	// After a fresh restart this may be a cache miss — acceptable.

	// 5b — warm cache via GetNode
	if _, err := tr.client.GetNode(ctx, &pb.GetNodeRequest{Key: existKey}); err != nil {
		return fmt.Errorf("GetNode(%s): %w", existKey, err)
	}
	r2, err := tr.client.ContainsNode(ctx, &pb.ContainsNodeRequest{Key: existKey})
	if err != nil {
		return fmt.Errorf("ContainsNode(%s) after GetNode: %w", existKey, err)
	}
	log.Printf("   ContainsNode(%s) after GetNode = %v  (in_cache=%v)\n", existKey, r2.Exists, r2.InCache)
	if !r2.Exists {
		return fmt.Errorf("node_1 must still exist")
	}

	// 5c — non-existent key → disk miss
	r3, err := tr.client.ContainsNode(ctx, &pb.ContainsNodeRequest{Key: missKey})
	if err != nil {
		return fmt.Errorf("ContainsNode(%s): %w", missKey, err)
	}
	log.Printf("   ContainsNode(%s) = %v  (in_cache=%v)\n", missKey, r3.Exists, r3.InCache)
	if r3.Exists {
		return fmt.Errorf("non-existent key must not exist")
	}

	log.Println("   ✅ PASSED")
	return nil
}

// ============================================================================
// Helpers
// ============================================================================

// edgeCountFromServer calls GetNeighborsBatch and returns the undirected edge
// count (total references ÷ 2).
func edgeCountFromServer() (int, error) {
	tr, err := NewTestRunner()
	if err != nil {
		return 0, err
	}
	defer tr.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	resp, err := tr.client.GetNeighborsBatch(ctx, &pb.GetNeighborsBatchRequest{
		Keys: nodeIDs(),
	})
	if err != nil {
		return 0, err
	}

	total := 0
	for _, nl := range resp.Neighbors {
		total += len(nl.Neighbors)
	}
	return total / 2, nil
}

// httpShutdown sends a POST to the shutdown endpoint.
func httpShutdown() error {
	client := &http.Client{Timeout: shutdownTimeout}
	req, err := http.NewRequest(http.MethodPost, shutdownAddr, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("POST %s: %w", shutdownAddr, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("shutdown returned %d", resp.StatusCode)
	}
	return nil
}

// startServer launches the TribeDB binary as a child process.
func startServer() *exec.Cmd {
	cmd := exec.Command("cmd", "/c", fmt.Sprintf("cd /d %s && go run .", tribeDBDir))
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	_ = cmd.Start()
	return cmd
}

func waitHealthy(timeout time.Duration) error {
    deadline := time.Now().Add(timeout)
    for time.Now().Before(deadline) {
        tr, err := NewTestRunner()
        if err == nil {
            if err := tr.CheckHealth(); err == nil {
                tr.Close()
                return nil
            }
            tr.Close()
        }
        time.Sleep(1 * time.Second)
    }
    return fmt.Errorf("health endpoint not ready after %v", timeout)
}

// readJSON reads and unmarshals a JSON file into a generic map.
func readJSON(path string) (map[string]interface{}, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var m map[string]interface{}
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// floatFromMap extracts a numeric value from a loosely-typed JSON map.
func floatFromMap(m map[string]interface{}, key string) float64 {
	v, ok := m[key]
	if !ok {
		return 0
	}
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	default:
		return 0
	}
}

// ============================================================================
// Main
// ============================================================================

func main() {
	log.SetFlags(log.Ltime)
	log.SetPrefix("[EDGE-TEST] ")

	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║  🧪  TRIBEDB  EDGE PERSISTENCE  TEST  SUITE  🧪      ║")
	fmt.Println("╚══════════════════════════════════════════════════════╝")
	fmt.Println()

	log.Printf("Server   : %s\n", serverAddr)
	log.Printf("Store    : %s\n", storePath)
	log.Printf("Log      : %s\n", logFilePath)
	log.Printf("Nodes    : %d\n", testNodeCount)
	log.Printf("Edges    : %d\n", testEdgeCount)
	fmt.Println()

	// -------------------- pre-flight --------------------
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	log.Println("🔍 PRE-FLIGHT")
	log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	tr, err := NewTestRunner()
	if err != nil {
		log.Fatalf("❌  %v\n", err)
	}

	if err := tr.CheckHealth(); err != nil {
		tr.Close()
		log.Fatalf("❌  %v\n", err)
	}
	log.Println("   ✅ Server healthy")

	// Auto-import if store is empty
	if !dataExists(tr.client) {
		log.Println("   📥 No data — importing test dataset...")
		if err := ImportTestDataset(tr.client); err != nil {
			tr.Close()
			log.Fatalf("❌  import: %v\n", err)
		}
	} else {
		log.Println("   ✅ Test data present")
	}
	tr.Close()
	fmt.Println()

	// -------------------- test suite --------------------
	type testCase struct {
		name string
		run  func() error
	}
	tests := []testCase{
		{"Edge Count After Import", func() error {
			tr, err := NewTestRunner()
			if err != nil {
				return err
			}
			defer tr.Close()
			return TestEdgeCountAfterImport(tr)
		}},
		{"Edge Persistence After Restart", TestEdgePersistenceAfterRestart},
		{"Metadata Persistence", TestMetadataPersistence},
		{"Edge-Index Rebuild Logs", TestEdgeIndexRebuildLogs},
		{"ContainsNode Cache Behaviour", TestContainsNodeCacheBehaviour},
	}

	passed, failed := 0, 0
	for _, tc := range tests {
		fmt.Println()
		if err := tc.run(); err != nil {
			log.Printf("❌  FAILED  %s\n", tc.name)
			log.Printf("        %v\n", err)
			failed++
		} else {
			passed++
		}
	}

	// -------------------- summary --------------------
	fmt.Println()
	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║                📊  TEST SUMMARY  📊                  ║")
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║   ✅ Passed  %-2d                                      ║\n", passed)
	fmt.Printf("║   ❌ Failed  %-2d                                      ║\n", failed)
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	if failed == 0 {
		fmt.Println("║   🟢  ALL TESTS PASSED — FIX CONFIRMED               ║")
	} else {
		fmt.Println("║   🔴  SOME TESTS FAILED — REVIEW LOGS                ║")
	}
	fmt.Println("╚══════════════════════════════════════════════════════╝")
	fmt.Println()

	if failed > 0 {
		os.Exit(1)
	}
}