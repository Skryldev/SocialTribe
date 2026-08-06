package storage

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"tribedb/logger"
)

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type NodeData struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	NodeType    string  `json:"nodeType"`
	Role        string  `json:"role"`
	FriendCount int     `json:"friendCount"`
	AvgDistance float64 `json:"avgDistance"`
	Centrality  float64 `json:"centrality"`
}

type Node struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"` // "socialUser"
	Position Position `json:"position"`
	Data     NodeData `json:"data"`
	Status   uint8    `json:"-"` // برای حذف منطقی
	_canary  uint64   // 🔒 Canary for corruption detection
}

type EdgeData struct {
	Weight    int       `json:"Weight"`
	CreatedAt time.Time `json:"createdAt"`
	ID        string    `json:"id"`
	TargetID  string    `json:"targetId"`
}

type Edge struct {
	ID     string   `json:"id"`
	Source string   `json:"source"`
	Target string   `json:"target"`
	Type   string   `json:"type"` // "weightedEdge"
	Data   EdgeData `json:"data"`
	Status uint8    `json:"-"` // برای حذف منطقی
	_canary uint64  // 🔒 Canary for corruption detection
}

type Graph struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

// MarshalBinary تبدیل Node به بایت با سایز دقیق 256 بایت
func (n *Node) MarshalBinary() ([]byte, error) {
	data := make([]byte, NodeRecordSize)
	offset := 0

	// 1. ID (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], []byte(n.ID))
	offset += MaxNodeNameLength

	// 2. Type (20 bytes)
	copy(data[offset:offset+MaxNodeTypeLength], []byte(n.Type))
	offset += MaxNodeTypeLength

	// 3. Position X (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], math.Float64bits(n.Position.X))
	offset += 8

	// 4. Position Y (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], math.Float64bits(n.Position.Y))
	offset += 8

	// 5. Data.ID (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], []byte(n.Data.ID))
	offset += MaxNodeNameLength

	// 6. Data.Name (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], []byte(n.Data.Name))
	offset += MaxNodeNameLength

	// 7. Data.NodeType (20 bytes)
	copy(data[offset:offset+MaxNodeTypeLength], []byte(n.Data.NodeType))
	offset += MaxNodeTypeLength

	// 8. Data.Role (20 bytes)
	copy(data[offset:offset+MaxRoleLength], []byte(n.Data.Role))
	offset += MaxRoleLength

	// ✅ 9. Data.FriendCount (4 bytes - INT, نه 8)
	binary.LittleEndian.PutUint32(data[offset:offset+4], uint32(n.Data.FriendCount))
	offset += 4

	// 10. Data.AvgDistance (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], math.Float64bits(n.Data.AvgDistance))
	offset += 8

	// 11. Data.Centrality (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], math.Float64bits(n.Data.Centrality))
	offset += 8

	// 12. Status (1 byte)
	data[offset] = n.Status
	offset += 1

	// ✅ 13. Padding (باقی مانده تا 256)
	for offset < NodeRecordSize {
		data[offset] = 0
		offset++
	}

	// ✅ چک نهایی
	if offset != NodeRecordSize {
		logger.ErrorFields("graph", "Node marshal size mismatch",
			logger.Int("offset", offset),
			logger.Int("expected", NodeRecordSize),
			logger.String("node_id", n.ID),
		)
		return nil, fmt.Errorf("marshaled size %d != expected %d", offset, NodeRecordSize)
	}

	return data, nil
}

// UnmarshalBinary تبدیل بایت به Node
func (n *Node) UnmarshalBinary(data []byte) error {
	if len(data) < NodeRecordSize {
		logger.ErrorFields("graph", "Node unmarshal data too short",
			logger.Int("data_len", len(data)),
			logger.Int("expected", NodeRecordSize),
		)
		return fmt.Errorf("data too short: %d < %d", len(data), NodeRecordSize)
	}

	offset := 0

	// 1. ID
	n.ID = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// 2. Type
	n.Type = string(bytes.TrimRight(data[offset:offset+MaxNodeTypeLength], "\x00"))
	offset += MaxNodeTypeLength

	// 3. Position X
	n.Position.X = math.Float64frombits(binary.LittleEndian.Uint64(data[offset:offset+8]))
	offset += 8

	// 4. Position Y
	n.Position.Y = math.Float64frombits(binary.LittleEndian.Uint64(data[offset:offset+8]))
	offset += 8

	// 5. Data.ID
	n.Data.ID = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// 6. Data.Name
	n.Data.Name = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// 7. Data.NodeType
	n.Data.NodeType = string(bytes.TrimRight(data[offset:offset+MaxNodeTypeLength], "\x00"))
	offset += MaxNodeTypeLength

	// 8. Data.Role
	n.Data.Role = string(bytes.TrimRight(data[offset:offset+MaxRoleLength], "\x00"))
	offset += MaxRoleLength

	// ✅ 9. Data.FriendCount (4 bytes - INT)
	n.Data.FriendCount = int(binary.LittleEndian.Uint32(data[offset:offset+4]))
	offset += 4

	// 10. Data.AvgDistance
	n.Data.AvgDistance = math.Float64frombits(binary.LittleEndian.Uint64(data[offset:offset+8]))
	offset += 8

	// 11. Data.Centrality
	n.Data.Centrality = math.Float64frombits(binary.LittleEndian.Uint64(data[offset:offset+8]))
	offset += 8

	// 12. Status
	n.Status = data[offset]
	offset += 1

	return nil
}

// MarshalBinary برای Edge
func (e *Edge) MarshalBinary() ([]byte, error) {
	data := make([]byte, EdgeRecordSize)
	offset := 0

	// ID (100 bytes)
	copy(data[offset:offset+MaxEdgeIDLength], e.ID)
	offset += MaxEdgeIDLength

	// Source (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], e.Source)
	offset += MaxNodeNameLength

	// Target (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], e.Target)
	offset += MaxNodeNameLength

	// Type (20 bytes)
	copy(data[offset:offset+MaxNodeTypeLength], e.Type)
	offset += MaxNodeTypeLength

	// Weight (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], uint64(e.Data.Weight))
	offset += 8

	// CreatedAt (8 bytes)
	binary.LittleEndian.PutUint64(data[offset:offset+8], uint64(e.Data.CreatedAt.UnixNano()))
	offset += 8

	// Data.ID (100 bytes)
	copy(data[offset:offset+MaxEdgeIDLength], e.Data.ID)
	offset += MaxEdgeIDLength

	// Data.TargetID (47 bytes)
	copy(data[offset:offset+MaxNodeNameLength], e.Data.TargetID)
	offset += MaxNodeNameLength

	// Status (1 byte)
	data[offset] = e.Status
	offset += 1

	return data, nil
}

// UnmarshalBinary برای Edge
func (e *Edge) UnmarshalBinary(data []byte) error {
	if len(data) < EdgeRecordSize {
		logger.ErrorFields("graph", "Edge unmarshal data too short",
			logger.Int("data_len", len(data)),
			logger.Int("expected", EdgeRecordSize),
			logger.String("edge_id", e.ID),
		)
		return fmt.Errorf("data too short: %d < %d", len(data), EdgeRecordSize)
	}

	offset := 0

	// ID
	e.ID = string(bytes.TrimRight(data[offset:offset+MaxEdgeIDLength], "\x00"))
	offset += MaxEdgeIDLength

	// Source
	e.Source = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// Target
	e.Target = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// Type
	e.Type = string(bytes.TrimRight(data[offset:offset+MaxNodeTypeLength], "\x00"))
	offset += MaxNodeTypeLength

	// Weight
	e.Data.Weight = int(binary.LittleEndian.Uint64(data[offset:offset+8]))
	offset += 8

	// CreatedAt
	e.Data.CreatedAt = time.Unix(0, int64(binary.LittleEndian.Uint64(data[offset:offset+8])))
	offset += 8

	// Data.ID
	e.Data.ID = string(bytes.TrimRight(data[offset:offset+MaxEdgeIDLength], "\x00"))
	offset += MaxEdgeIDLength

	// Data.TargetID
	e.Data.TargetID = string(bytes.TrimRight(data[offset:offset+MaxNodeNameLength], "\x00"))
	offset += MaxNodeNameLength

	// Status
	e.Status = data[offset]
	offset += 1

	return nil
}

// ---- Helper Methods ----

// IsDeleted بررسی حذف منطقی
func (n *Node) IsDeleted() bool {
	return n.Status == StatusDeleted
}

// Delete علامت‌گذاری برای حذف
func (n *Node) Delete() {
	n.Status = StatusDeleted
}

// IsDeleted بررسی حذف منطقی
func (e *Edge) IsDeleted() bool {
	return e.Status == StatusDeleted
}

// Delete علامت‌گذاری برای حذف
func (e *Edge) Delete() {
	e.Status = StatusDeleted
}

// ---- JSON Serialization ----

// ToJSON تبدیل Node به JSON
func (n *Node) ToJSON() ([]byte, error) {
	return json.Marshal(n)
}

// FromJSON ساخت Node از JSON
func (n *Node) FromJSON(data []byte) error {
	return json.Unmarshal(data, n)
}

// ToJSON تبدیل Edge به JSON
func (e *Edge) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}

// FromJSON ساخت Edge از JSON
func (e *Edge) FromJSON(data []byte) error {
	return json.Unmarshal(data, e)
}

// ---- Graph Helper ----

// NewNode ایجاد یک Node جدید
func NewNode(id, nodeType, name string, x, y float64) *Node {
	return &Node{
		ID:   id,
		Type: nodeType,
		Position: Position{X: x, Y: y},
		Data: NodeData{
			ID:          id,
			Name:        name,
			NodeType:    nodeType,
			Role:        "",
			FriendCount: 0,
			AvgDistance: 0,
			Centrality:  0,
		},
		Status: StatusActive,
	}
}

// NewEdge ایجاد یک Edge جدید
func NewEdge(id, source, target, edgeType string, weight int) *Edge {
	now := time.Now()
	return &Edge{
		ID:     id,
		Source: source,
		Target: target,
		Type:   edgeType,
		Data: EdgeData{
			Weight:    weight,
			CreatedAt: now,
			ID:        source,
			TargetID:  target,
		},
		Status: StatusActive,
	}
}