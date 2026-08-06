package storage

import (
	"errors"

	"github.com/cespare/xxhash/v2"
)

var (
	ErrDeletedRecord = errors.New("record is deleted")
	ErrOutOfRange    = errors.New("record index out of range")
	ErrInvalidSize   = errors.New("invalid file size")
	ErrNodeNotFound  = errors.New("node not found")
	ErrEdgeNotFound  = errors.New("edge not found")
	ErrNotFound      = errors.New("segments not found")
)

const (
	MaxNodeNameLength = 47
	MaxNodeTypeLength = 20
	MaxRoleLength     = 20
	MaxEdgeIDLength   = 100

	NodeRecordSize = 256
	EdgeRecordSize = 392

	StatusActive  uint8 = 0
	StatusDeleted uint8 = 1

	MagicNumber = 0xDEADBEEF
	Version     = 1
)

const (
	NodeFileName    = "nodes.bin"
	EdgeFileName    = "edges.bin"
	NodeIndexName   = "nodes.idx"
	EdgeIndexName   = "edges.idx"
	NodeBloomName   = "nodes.bloom"
	EdgeBloomName   = "edges.bloom"
	MmapDataName    = "data.mmap"
	
	// ✅ Key Index names
	NodeKeyIndexName = "node_key.idx"
	EdgeKeyIndexName = "edge_key.idx"

	// WAL Operation Types
	WalOpNodePut     = 1
	WalOpNodeDelete  = 2
	WalOpEdgePut     = 3
	WalOpEdgeDelete  = 4
	
	// Recovery Mode
	RecoveryModeStrict      = "strict"
	RecoveryModeBestEffort  = "best_effort"
)

// NodeWALEntry represents a node operation in WAL
type NodeWALEntry struct {
	Key  string
	Node *Node
	Op   uint8 // WalOpNodePut or WalOpNodeDelete
}

// EdgeWALEntry represents an edge operation in WAL
type EdgeWALEntry struct {
	Key  string
	Edge *Edge
	Op   uint8 // WalOpEdgePut or WalOpEdgeDelete
}

func HashToUint64(s string) uint64 {
	return xxhash.Sum64([]byte(s))
}