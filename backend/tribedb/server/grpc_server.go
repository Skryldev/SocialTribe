package server

import (
	"context"
	"fmt"
	"sync"
	"time"

	pb "tribedb/proto"
	"tribedb/storage"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ============================================================================
// GRPCServer — gRPC service wrapper around CachedStorage
// ============================================================================

type GRPCServer struct {
	pb.UnimplementedStorageServiceServer
	Storage *storage.CachedStorage
	Mu      sync.RWMutex
	ctx     context.Context
	cancel  context.CancelFunc
}

// NewGRPCServer creates a new gRPC server with a background context for
// long-running operations (e.g. PrefetchViewport).
func NewGRPCServer(cachedStorage *storage.CachedStorage) *GRPCServer {
	ctx, cancel := context.WithCancel(context.Background())
	return &GRPCServer{
		Storage: cachedStorage,
		ctx:     ctx,
		cancel:  cancel,
	}
}

// Register attaches the StorageService server to a gRPC server.
func (s *GRPCServer) Register(grpcServer *grpc.Server) {
	pb.RegisterStorageServiceServer(grpcServer, s)
}

// Shutdown cancels all background operations.
func (s *GRPCServer) Shutdown() {
	s.cancel()
}

// ============================================================================
// Helper Functions — Proto ↔ Storage conversions
// ============================================================================

func positionToProto(pos storage.Position) *pb.Position {
	return &pb.Position{X: pos.X, Y: pos.Y}
}

func positionFromProto(pos *pb.Position) storage.Position {
	if pos == nil {
		return storage.Position{}
	}
	return storage.Position{X: pos.X, Y: pos.Y}
}

func nodeDataToProto(data storage.NodeData) *pb.NodeData {
	return &pb.NodeData{
		Id:          data.ID,
		Name:        data.Name,
		NodeType:    data.NodeType,
		Role:        data.Role,
		FriendCount: int32(data.FriendCount),
		AvgDistance: data.AvgDistance,
		Centrality:  data.Centrality,
	}
}

func nodeDataFromProto(data *pb.NodeData) storage.NodeData {
	if data == nil {
		return storage.NodeData{}
	}
	return storage.NodeData{
		ID:          data.Id,
		Name:        data.Name,
		NodeType:    data.NodeType,
		Role:        data.Role,
		FriendCount: int(data.FriendCount),
		AvgDistance: data.AvgDistance,
		Centrality:  data.Centrality,
	}
}

func nodeToProto(node *storage.Node) *pb.Node {
	if node == nil {
		return nil
	}
	return &pb.Node{
		Id:       node.ID,
		Type:     node.Type,
		Position: positionToProto(node.Position),
		Data:     nodeDataToProto(node.Data),
	}
}

func nodeFromProto(pbNode *pb.Node) *storage.Node {
	if pbNode == nil {
		return nil
	}
	return &storage.Node{
		ID:       pbNode.Id,
		Type:     pbNode.Type,
		Position: positionFromProto(pbNode.Position),
		Data:     nodeDataFromProto(pbNode.Data),
		Status:   storage.StatusActive,
	}
}

func edgeDataToProto(data storage.EdgeData) *pb.EdgeData {
	return &pb.EdgeData{
		Weight:    int32(data.Weight),
		CreatedAt: data.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
		Id:        data.ID,
		TargetId:  data.TargetID,
	}
}

func edgeDataFromProto(data *pb.EdgeData) storage.EdgeData {
	if data == nil {
		return storage.EdgeData{}
	}
	createdAt, _ := time.Parse("2006-01-02T15:04:05.000Z", data.CreatedAt)
	return storage.EdgeData{
		Weight:    int(data.Weight),
		CreatedAt: createdAt,
		ID:        data.Id,
		TargetID:  data.TargetId,
	}
}

func edgeToProto(edge *storage.Edge) *pb.Edge {
	if edge == nil {
		return nil
	}
	return &pb.Edge{
		Id:     edge.ID,
		Source: edge.Source,
		Target: edge.Target,
		Type:   edge.Type,
		Data:   edgeDataToProto(edge.Data),
	}
}

func edgeFromProto(pbEdge *pb.Edge) *storage.Edge {
	if pbEdge == nil {
		return nil
	}
	return &storage.Edge{
		ID:     pbEdge.Id,
		Source: pbEdge.Source,
		Target: pbEdge.Target,
		Type:   pbEdge.Type,
		Data:   edgeDataFromProto(pbEdge.Data),
		Status: storage.StatusActive,
	}
}

// contextOK is a tiny helper that returns a gRPC-friendly error when the
// client context has expired.
func contextOK(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return status.Error(codes.Canceled, "request cancelled")
	default:
		return nil
	}
}

// ============================================================================
// Node CRUD
// ============================================================================

func (s *GRPCServer) CreateNode(ctx context.Context, req *pb.CreateNodeRequest) (*pb.CreateNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}
	if req.Node == nil {
		return nil, status.Error(codes.InvalidArgument, "node cannot be empty")
	}

	node := nodeFromProto(req.Node)
	index := req.Index
	if index == 0 {
		index = 1
	}

	if err := s.Storage.WriteNode(index, node, req.Key); err != nil {
		return &pb.CreateNodeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.CreateNodeResponse{Success: true, AssignedIndex: index}, nil
}

func (s *GRPCServer) GetNode(ctx context.Context, req *pb.GetNodeRequest) (*pb.GetNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	node, err := s.Storage.ReadNodeByKey(req.Key)
	if err != nil {
		return &pb.GetNodeResponse{Found: false, Error: err.Error()}, nil
	}
	return &pb.GetNodeResponse{Node: nodeToProto(node), Found: true}, nil
}

func (s *GRPCServer) GetNodeBulk(ctx context.Context, req *pb.GetNodeBulkRequest) (*pb.GetNodeBulkResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	result, err := s.Storage.ReadNodeByKeyBulk(req.Keys)
	if err != nil {
		return &pb.GetNodeBulkResponse{Error: err.Error()}, nil
	}

	nodes := make(map[string]*pb.Node, len(result.Found))
	for key, node := range result.Found {
		nodes[key] = nodeToProto(node)
	}
	return &pb.GetNodeBulkResponse{Nodes: nodes, NotFound: result.NotFound}, nil
}

func (s *GRPCServer) UpdateNode(ctx context.Context, req *pb.UpdateNodeRequest) (*pb.UpdateNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" || req.Node == nil {
		return nil, status.Error(codes.InvalidArgument, "key and node are required")
	}

	node := nodeFromProto(req.Node)
	if err := s.Storage.WriteNode(0, node, req.Key); err != nil {
		return &pb.UpdateNodeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.UpdateNodeResponse{Success: true}, nil
}

func (s *GRPCServer) DeleteNode(ctx context.Context, req *pb.DeleteNodeRequest) (*pb.DeleteNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	if err := s.Storage.DeleteNodeByKey(req.Key); err != nil {
		return &pb.DeleteNodeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.DeleteNodeResponse{Success: true}, nil
}

func (s *GRPCServer) DeleteNodeBulk(ctx context.Context, req *pb.DeleteNodeBulkRequest) (*pb.DeleteNodeBulkResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	failedKeys := make([]string, 0)
	errs := make(map[string]string)

	for _, key := range req.Keys {
		if err := s.Storage.DeleteNodeByKey(key); err != nil {
			failedKeys = append(failedKeys, key)
			errs[key] = err.Error()
		}
	}
	return &pb.DeleteNodeBulkResponse{
		DeletedCount: int32(len(req.Keys) - len(failedKeys)),
		FailedKeys:   failedKeys,
		Errors:       errs,
	}, nil
}

func (s *GRPCServer) ContainsNode(ctx context.Context, req *pb.ContainsNodeRequest) (*pb.ContainsNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	// ✅ Now correctly falls back to disk via CachedStorage.ContainsNode
	exists := s.Storage.ContainsNode(req.Key)

	// Check if it's in cache specifically
	_, inCache := s.Storage.PeekNode(req.Key)

	return &pb.ContainsNodeResponse{
		Exists:  exists,
		InCache: inCache,
	}, nil
}

func (s *GRPCServer) PeekNode(ctx context.Context, req *pb.PeekNodeRequest) (*pb.PeekNodeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	node, found := s.Storage.PeekNode(req.Key)
	return &pb.PeekNodeResponse{
		Node:    nodeToProto(node),
		Found:   found,
		InCache: found,
	}, nil
}

// ============================================================================
// Edge CRUD
// ============================================================================

func (s *GRPCServer) CreateEdge(ctx context.Context, req *pb.CreateEdgeRequest) (*pb.CreateEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" || req.Edge == nil {
		return nil, status.Error(codes.InvalidArgument, "key and edge are required")
	}

	edge := edgeFromProto(req.Edge)
	index := req.Index
	if index == 0 {
		index = 1
	}

	if err := s.Storage.WriteEdge(index, edge, req.Key); err != nil {
		return &pb.CreateEdgeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.CreateEdgeResponse{Success: true, AssignedIndex: index}, nil
}

func (s *GRPCServer) GetEdge(ctx context.Context, req *pb.GetEdgeRequest) (*pb.GetEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	edge, err := s.Storage.ReadEdgeByKey(req.Key)
	if err != nil {
		return &pb.GetEdgeResponse{Found: false, Error: err.Error()}, nil
	}
	return &pb.GetEdgeResponse{Edge: edgeToProto(edge), Found: true}, nil
}

func (s *GRPCServer) GetEdgeBulk(ctx context.Context, req *pb.GetEdgeBulkRequest) (*pb.GetEdgeBulkResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	result, err := s.Storage.ReadEdgeByKeyBulk(req.Keys)
	if err != nil {
		return &pb.GetEdgeBulkResponse{Error: err.Error()}, nil
	}

	edges := make(map[string]*pb.Edge, len(result.Found))
	for key, edge := range result.Found {
		edges[key] = edgeToProto(edge)
	}
	return &pb.GetEdgeBulkResponse{Edges: edges, NotFound: result.NotFound}, nil
}

func (s *GRPCServer) UpdateEdge(ctx context.Context, req *pb.UpdateEdgeRequest) (*pb.UpdateEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" || req.Edge == nil {
		return nil, status.Error(codes.InvalidArgument, "key and edge are required")
	}

	edge := edgeFromProto(req.Edge)
	if err := s.Storage.WriteEdge(0, edge, req.Key); err != nil {
		return &pb.UpdateEdgeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.UpdateEdgeResponse{Success: true}, nil
}

func (s *GRPCServer) DeleteEdge(ctx context.Context, req *pb.DeleteEdgeRequest) (*pb.DeleteEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	if err := s.Storage.DeleteEdgeByKey(req.Key); err != nil {
		return &pb.DeleteEdgeResponse{Success: false, Error: err.Error()}, nil
	}
	return &pb.DeleteEdgeResponse{Success: true}, nil
}

func (s *GRPCServer) DeleteEdgeBulk(ctx context.Context, req *pb.DeleteEdgeBulkRequest) (*pb.DeleteEdgeBulkResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	failedKeys := make([]string, 0)
	errs := make(map[string]string)

	for _, key := range req.Keys {
		if err := s.Storage.DeleteEdgeByKey(key); err != nil {
			failedKeys = append(failedKeys, key)
			errs[key] = err.Error()
		}
	}
	return &pb.DeleteEdgeBulkResponse{
		DeletedCount: int32(len(req.Keys) - len(failedKeys)),
		FailedKeys:   failedKeys,
		Errors:       errs,
	}, nil
}

func (s *GRPCServer) ContainsEdge(ctx context.Context, req *pb.ContainsEdgeRequest) (*pb.ContainsEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	// ✅ Now correctly falls back to disk
	exists := s.Storage.ContainsEdge(req.Key)
	_, inCache := s.Storage.PeekEdge(req.Key)

	return &pb.ContainsEdgeResponse{
		Exists:  exists,
		InCache: inCache,
	}, nil
}

func (s *GRPCServer) PeekEdge(ctx context.Context, req *pb.PeekEdgeRequest) (*pb.PeekEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	edge, found := s.Storage.PeekEdge(req.Key)
	return &pb.PeekEdgeResponse{
		Edge:    edgeToProto(edge),
		Found:   found,
		InCache: found,
	}, nil
}

// ============================================================================
// Graph Operations
// ============================================================================

// --- Degree ---

func (s *GRPCServer) GetDegree(ctx context.Context, req *pb.GetDegreeRequest) (*pb.GetDegreeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	degree, err := s.Storage.GetDegree(req.Key)
	if err != nil {
		return &pb.GetDegreeResponse{Found: false, Error: err.Error()}, nil
	}
	return &pb.GetDegreeResponse{Degree: degree, Found: true}, nil
}

func (s *GRPCServer) GetDegreeBatch(ctx context.Context, req *pb.GetDegreeBatchRequest) (*pb.GetDegreeBatchResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	degrees, err := s.Storage.GetDegreeBatch(req.Keys)

	notFound := make([]string, 0)
	for _, key := range req.Keys {
		if _, ok := degrees[key]; !ok {
			notFound = append(notFound, key)
		}
	}

	// ✅ Always return partial results alongside the error
	return &pb.GetDegreeBatchResponse{
		Degrees:  degrees,
		NotFound: notFound,
		Error:    errToStr(err),
	}, nil
}

// --- Edge Existence ---

func (s *GRPCServer) HasEdge(ctx context.Context, req *pb.HasEdgeRequest) (*pb.HasEdgeResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target cannot be empty")
	}

	exists, err := s.Storage.HasEdge(req.Source, req.Target)
	return &pb.HasEdgeResponse{Exists: exists, Error: errToStr(err)}, nil
}

func (s *GRPCServer) HasEdgeBatch(ctx context.Context, req *pb.HasEdgeBatchRequest) (*pb.HasEdgeBatchResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || len(req.Targets) == 0 {
		return nil, status.Error(codes.InvalidArgument, "source and targets are required")
	}

	results, err := s.Storage.HasEdgeBatch(req.Source, req.Targets)
	return &pb.HasEdgeBatchResponse{Results: results, Error: errToStr(err)}, nil
}

// --- Edge Weight ---

func (s *GRPCServer) GetEdgeWeight(ctx context.Context, req *pb.GetEdgeWeightRequest) (*pb.GetEdgeWeightResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target are required")
	}

	weight, err := s.Storage.GetEdgeWeight(req.Source, req.Target)
	return &pb.GetEdgeWeightResponse{Weight: int32(weight), Found: err == nil, Error: errToStr(err)}, nil
}

func (s *GRPCServer) GetEdgeWeightsBatch(ctx context.Context, req *pb.GetEdgeWeightsBatchRequest) (*pb.GetEdgeWeightsBatchResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Edges) == 0 {
		return nil, status.Error(codes.InvalidArgument, "edges cannot be empty")
	}

	edges := make([][2]string, len(req.Edges))
	for i, e := range req.Edges {
		edges[i] = [2]string{e.Source, e.Target}
	}

	weights, err := s.Storage.GetEdgeWeightsBatch(edges)

	result := make(map[string]int32)
	notFound := make([]string, 0)
	for _, e := range req.Edges {
		key := fmt.Sprintf("%s->%s", e.Source, e.Target)
		if w, ok := weights[[2]string{e.Source, e.Target}]; ok {
			result[key] = int32(w)
		} else {
			notFound = append(notFound, key)
		}
	}

	return &pb.GetEdgeWeightsBatchResponse{
		Weights:  result,
		NotFound: notFound,
		Error:    errToStr(err),
	}, nil
}

// --- Common Neighbors ---

func (s *GRPCServer) GetCommonNeighbors(ctx context.Context, req *pb.GetCommonNeighborsRequest) (*pb.GetCommonNeighborsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target are required")
	}

	neighbors, err := s.Storage.GetCommonNeighbors(req.Source, req.Target)
	return &pb.GetCommonNeighborsResponse{Neighbors: neighbors, Found: err == nil, Error: errToStr(err)}, nil
}

func (s *GRPCServer) CountCommonNeighbors(ctx context.Context, req *pb.CountCommonNeighborsRequest) (*pb.CountCommonNeighborsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target are required")
	}

	count, err := s.Storage.CountCommonNeighbors(req.Source, req.Target)
	return &pb.CountCommonNeighborsResponse{Count: count, Found: err == nil, Error: errToStr(err)}, nil
}

// --- Neighbors ---

func (s *GRPCServer) GetNeighbors(ctx context.Context, req *pb.GetNeighborsRequest) (*pb.GetNeighborsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	neighbors, err := s.Storage.GetNeighbors(req.Key)
	return &pb.GetNeighborsResponse{Neighbors: neighbors, Found: err == nil, Error: errToStr(err)}, nil
}

// ✅ GetNeighborsBatch — FIXED: now returns partial results even when some
// nodes are missing. Previously the entire result was discarded on first error.
func (s *GRPCServer) GetNeighborsBatch(ctx context.Context, req *pb.GetNeighborsBatchRequest) (*pb.GetNeighborsBatchResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.Keys) == 0 {
		return nil, status.Error(codes.InvalidArgument, "keys cannot be empty")
	}

	results, err := s.Storage.GetNeighborsBatch(req.Keys)

	// Build proto response — always include partial results
	neighbors := make(map[string]*pb.NeighborList, len(results))
	notFound := make([]string, 0)

	for _, key := range req.Keys {
		if list, ok := results[key]; ok {
			neighbors[key] = &pb.NeighborList{Neighbors: list}
		} else {
			notFound = append(notFound, key)
		}
	}

	// ✅ Return partial results AND the error string (if any)
	return &pb.GetNeighborsBatchResponse{
		Neighbors: neighbors,
		NotFound:  notFound,
		Error:     errToStr(err),
	}, nil
}

func (s *GRPCServer) GetNeighborsWithWeights(ctx context.Context, req *pb.GetNeighborsWithWeightsRequest) (*pb.GetNeighborsWithWeightsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Key == "" {
		return nil, status.Error(codes.InvalidArgument, "key cannot be empty")
	}

	neighbors, err := s.Storage.GetNeighborsWithWeights(req.Key)

	result := make(map[string]int32, len(neighbors))
	for n, w := range neighbors {
		result[n] = int32(w)
	}
	return &pb.GetNeighborsWithWeightsResponse{Neighbors: result, Found: err == nil, Error: errToStr(err)}, nil
}

// --- Shortest Path ---

func (s *GRPCServer) ShortestPath(ctx context.Context, req *pb.ShortestPathRequest) (*pb.ShortestPathResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target are required")
	}

	path, err := s.Storage.ShortestPath(req.Source, req.Target)
	return &pb.ShortestPathResponse{Path: path, Found: err == nil, Error: errToStr(err)}, nil
}

// --- Convenience ---

func (s *GRPCServer) IsNeighbor(ctx context.Context, req *pb.IsNeighborRequest) (*pb.IsNeighborResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if req.Source == "" || req.Target == "" {
		return nil, status.Error(codes.InvalidArgument, "source and target are required")
	}

	isNeighbor, err := s.Storage.IsNeighbor(req.Source, req.Target)
	return &pb.IsNeighborResponse{IsNeighbor: isNeighbor, Error: errToStr(err)}, nil
}

// ============================================================================
// Admin
// ============================================================================

func (s *GRPCServer) GetStats(ctx context.Context, req *pb.GetStatsRequest) (*pb.GetStatsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}

	stats := s.Storage.Storage.Stats()
	stringStats := make(map[string]string, len(stats))
	for k, v := range stats {
		stringStats[k] = fmt.Sprintf("%v", v)
	}
	return &pb.GetStatsResponse{Stats: stringStats}, nil
}

func (s *GRPCServer) GetCacheStats(ctx context.Context, req *pb.GetCacheStatsRequest) (*pb.GetCacheStatsResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}

	hits, misses, ratio := s.Storage.GetCacheStats()
	return &pb.GetCacheStatsResponse{
		Hits:        hits,
		Misses:      misses,
		HitRatio:    ratio,
		LiveEntries: int32(s.Storage.Cache.Len()),
		CacheSize:   int32(s.Storage.CacheSize),
	}, nil
}

func (s *GRPCServer) ClearCache(ctx context.Context, req *pb.ClearCacheRequest) (*pb.ClearCacheResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}

	s.Storage.ClearCache()
	return &pb.ClearCacheResponse{Success: true}, nil
}

func (s *GRPCServer) PrefetchViewport(ctx context.Context, req *pb.PrefetchViewportRequest) (*pb.PrefetchViewportResponse, error) {
	if err := contextOK(ctx); err != nil {
		return nil, err
	}
	if len(req.NodeIds) == 0 {
		return nil, status.Error(codes.InvalidArgument, "node_ids cannot be empty")
	}

	// Detach from the request context so the gRPC handler returns immediately.
	go s.Storage.PrefetchViewport(s.ctx, req.NodeIds)

	return &pb.PrefetchViewportResponse{PrefetchedCount: int32(len(req.NodeIds))}, nil
}

// ============================================================================
// Helpers
// ============================================================================

// errToStr converts an error to its string representation, or returns empty
// string for nil. This avoids sending "<nil>" in proto responses.
func errToStr(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}