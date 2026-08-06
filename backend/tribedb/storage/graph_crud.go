package storage

import (
	"fmt"

	"tribedb/logger"
)

// ---- Node Operations (High-Level API with string keys) ----

// WriteNodeByKey writes a node with string key
func (gs *GraphStorage) WriteNodeByKey(key string, node *Node) error {
	data, err := node.MarshalBinary()
	if err != nil {
		logger.ErrorFields("graph_crud", "Failed to marshal node",
			logger.Err(err),
			logger.String("key", key),
		)
		return fmt.Errorf("marshal node: %w", err)
	}

	// ✅ Sequential ID
	gs.idMu.Lock()
	id := gs.nextNodeIDLocked()
	gs.idMu.Unlock()

	// ✅ Store in Key Index
	if err := gs.nodeKeyIndex.Insert(key, id); err != nil {
		logger.ErrorFields("graph_crud", "Failed to insert into node key index",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return fmt.Errorf("failed to insert into node key index: %w", err)
	}

	if err := gs.WriteNode(id, data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to write node",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return err
	}

	logger.DebugFields("graph_crud", "Node written successfully",
		logger.String("key", key),
		logger.Uint64("node_id", id),
		logger.Int("data_size", len(data)),
	)
	return nil
}

// ReadNodeByKey reads a node by string key
func (gs *GraphStorage) ReadNodeByKey(key string) (*Node, error) {
	// ✅ Get ID from Key Index
	id, found := gs.nodeKeyIndex.Get(key)
	if !found {
		logger.DebugFields("graph_crud", "Node key not found in index",
			logger.String("key", key),
		)
		return nil, ErrNodeNotFound
	}

	data, err := gs.ReadNode(id)
	if err != nil {
		if err == ErrNotFound {
			logger.DebugFields("graph_crud", "Node data not found on disk",
				logger.String("key", key),
				logger.Uint64("node_id", id),
			)
			return nil, ErrNodeNotFound
		}
		logger.ErrorFields("graph_crud", "Failed to read node data",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return nil, err
	}

	node := GetNode()
	defer PutNode(node)

	if err := node.UnmarshalBinary(data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to unmarshal node",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return nil, err
	}

	if node.IsDeleted() {
		logger.DebugFields("graph_crud", "Node is deleted (tombstone)",
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return nil, ErrDeletedRecord
	}

	return node.Clone(), nil
}

// DeleteNodeByKey soft deletes a node by string key
func (gs *GraphStorage) DeleteNodeByKey(key string) error {
	id, found := gs.nodeKeyIndex.Get(key)
	if !found {
		logger.DebugFields("graph_crud", "Cannot delete - node key not found",
			logger.String("key", key),
		)
		return ErrNodeNotFound
	}

	data, err := gs.ReadNode(id)
	if err != nil {
		if err == ErrNotFound {
			return ErrNodeNotFound
		}
		logger.ErrorFields("graph_crud", "Failed to read node for deletion",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return err
	}

	node := GetNode()
	defer PutNode(node)

	if err := node.UnmarshalBinary(data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to unmarshal node for deletion",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return fmt.Errorf("unmarshal node: %w", err)
	}

	if node.IsDeleted() {
		logger.DebugFields("graph_crud", "Node is already deleted",
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return ErrDeletedRecord
	}

	node.Delete()
	newData, err := node.MarshalBinary()
	if err != nil {
		logger.ErrorFields("graph_crud", "Failed to marshal deleted node",
			logger.Err(err),
			logger.String("key", key),
		)
		return err
	}

	if err := gs.WriteNode(id, newData); err != nil {
		logger.ErrorFields("graph_crud", "Failed to write tombstone node",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("node_id", id),
		)
		return err
	}

	logger.InfoFields("graph_crud", "Node soft-deleted",
		logger.String("key", key),
		logger.Uint64("node_id", id),
	)
	return nil
}

// ContainsNode checks if a node exists by key
func (gs *GraphStorage) ContainsNode(key string) bool {
	_, found := gs.nodeKeyIndex.Get(key)
	return found
}

// ---- Edge Operations (High-Level API with string keys) ----

// WriteEdgeByKey writes an edge with string key and updates edge index
func (gs *GraphStorage) WriteEdgeByKey(key string, edge *Edge) error {
	data, err := edge.MarshalBinary()
	if err != nil {
		logger.ErrorFields("graph_crud", "Failed to marshal edge",
			logger.Err(err),
			logger.String("key", key),
		)
		return fmt.Errorf("marshal edge: %w", err)
	}

	// ✅ Sequential ID
	gs.idMu.Lock()
	id := gs.nextEdgeIDLocked()
	gs.idMu.Unlock()

	// ✅ Store in Key Index
	if err := gs.edgeKeyIndex.Insert(key, id); err != nil {
		logger.ErrorFields("graph_crud", "Failed to insert into edge key index",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return fmt.Errorf("failed to insert into edge key index: %w", err)
	}

	if err := gs.WriteEdge(id, data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to write edge",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return err
	}

	// Update edge index (undirected graph)
	if !edge.IsDeleted() {
		gs.edgeIndex.AddEdge(edge.Source, edge.Target)
	}

	logger.DebugFields("graph_crud", "Edge written successfully",
		logger.String("key", key),
		logger.Uint64("edge_id", id),
		logger.String("source", edge.Source),
		logger.String("target", edge.Target),
		logger.Int("data_size", len(data)),
	)
	return nil
}

// ReadEdgeByKey reads an edge by string key
func (gs *GraphStorage) ReadEdgeByKey(key string) (*Edge, error) {
	id, found := gs.edgeKeyIndex.Get(key)
	if !found {
		logger.DebugFields("graph_crud", "Edge key not found in index",
			logger.String("key", key),
		)
		return nil, ErrEdgeNotFound
	}

	data, err := gs.ReadEdge(id)
	if err != nil {
		if err == ErrNotFound {
			logger.DebugFields("graph_crud", "Edge data not found on disk",
				logger.String("key", key),
				logger.Uint64("edge_id", id),
			)
			return nil, ErrEdgeNotFound
		}
		logger.ErrorFields("graph_crud", "Failed to read edge data",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return nil, err
	}

	edge := GetEdge()
	defer PutEdge(edge)

	if err := edge.UnmarshalBinary(data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to unmarshal edge",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return nil, err
	}

	if edge.IsDeleted() {
		logger.DebugFields("graph_crud", "Edge is deleted (tombstone)",
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return nil, ErrDeletedRecord
	}

	return edge.Clone(), nil
}

// DeleteEdgeByKey soft deletes an edge by string key and updates edge index
func (gs *GraphStorage) DeleteEdgeByKey(key string) error {
	// First read the edge to get source/target
	edge, err := gs.ReadEdgeByKey(key)
	if err != nil {
		return err
	}

	id, found := gs.edgeKeyIndex.Get(key)
	if !found {
		logger.DebugFields("graph_crud", "Cannot delete - edge key not found",
			logger.String("key", key),
		)
		return ErrEdgeNotFound
	}

	data, err := gs.ReadEdge(id)
	if err != nil {
		if err == ErrNotFound {
			return ErrEdgeNotFound
		}
		logger.ErrorFields("graph_crud", "Failed to read edge for deletion",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return err
	}

	edge = GetEdge()
	defer PutEdge(edge)

	if err := edge.UnmarshalBinary(data); err != nil {
		logger.ErrorFields("graph_crud", "Failed to unmarshal edge for deletion",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return fmt.Errorf("unmarshal edge: %w", err)
	}

	if edge.IsDeleted() {
		logger.DebugFields("graph_crud", "Edge is already deleted",
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return ErrDeletedRecord
	}

	edge.Delete()
	newData, err := edge.MarshalBinary()
	if err != nil {
		logger.ErrorFields("graph_crud", "Failed to marshal deleted edge",
			logger.Err(err),
			logger.String("key", key),
		)
		return err
	}

	if err := gs.WriteEdge(id, newData); err != nil {
		logger.ErrorFields("graph_crud", "Failed to write tombstone edge",
			logger.Err(err),
			logger.String("key", key),
			logger.Uint64("edge_id", id),
		)
		return err
	}

	// Remove from edge index
	gs.edgeIndex.RemoveEdge(edge.Source, edge.Target)

	logger.InfoFields("graph_crud", "Edge soft-deleted",
		logger.String("key", key),
		logger.Uint64("edge_id", id),
		logger.String("source", edge.Source),
		logger.String("target", edge.Target),
	)
	return nil
}

// ContainsEdge checks if an edge exists by key
func (gs *GraphStorage) ContainsEdge(key string) bool {
	_, found := gs.edgeKeyIndex.Get(key)
	return found
}

// ---- Bulk Operations ----

func (gs *GraphStorage) ReadNodeByKeyBulk(keys []string) (map[string]*Node, error) {
	result := make(map[string]*Node, len(keys))
	notFound := 0

	for _, key := range keys {
		node, err := gs.ReadNodeByKey(key)
		if err == nil {
			result[key] = node
		} else {
			notFound++
		}
	}

	logger.DebugFields("graph_crud", "Bulk read nodes completed",
		logger.Int("total_requested", len(keys)),
		logger.Int("found", len(result)),
		logger.Int("not_found", notFound),
	)
	return result, nil
}

func (gs *GraphStorage) ReadEdgeByKeyBulk(keys []string) (map[string]*Edge, error) {
	result := make(map[string]*Edge, len(keys))
	notFound := 0

	for _, key := range keys {
		edge, err := gs.ReadEdgeByKey(key)
		if err == nil {
			result[key] = edge
		} else {
			notFound++
		}
	}

	logger.DebugFields("graph_crud", "Bulk read edges completed",
		logger.Int("total_requested", len(keys)),
		logger.Int("found", len(result)),
		logger.Int("not_found", notFound),
	)
	return result, nil
}

func (gs *GraphStorage) WriteNodeBulk(entries map[string]*Node) error {
	logger.DebugFields("graph_crud", "Bulk writing nodes",
		logger.Int("count", len(entries)),
	)

	for key, node := range entries {
		if err := gs.WriteNodeByKey(key, node); err != nil {
			return fmt.Errorf("failed to write node %s: %w", key, err)
		}
	}

	logger.DebugFields("graph_crud", "Bulk write nodes completed",
		logger.Int("count", len(entries)),
	)
	return nil
}

func (gs *GraphStorage) WriteEdgeBulk(entries map[string]*Edge) error {
	logger.DebugFields("graph_crud", "Bulk writing edges",
		logger.Int("count", len(entries)),
	)

	for key, edge := range entries {
		if err := gs.WriteEdgeByKey(key, edge); err != nil {
			return fmt.Errorf("failed to write edge %s: %w", key, err)
		}
	}

	logger.DebugFields("graph_crud", "Bulk write edges completed",
		logger.Int("count", len(entries)),
	)
	return nil
}