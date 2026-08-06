package storage

import "time"

func (n *Node) Clone() *Node {
	if n == nil {
		return nil
	}

	// ✅ استفاده از Pool برای Node جدید
	clone := GetNode()

	// کپی کردن فیلدها
	clone.ID = n.ID
	clone.Type = n.Type
	clone.Status = n.Status

	// کپی Position
	clone.Position.X = n.Position.X
	clone.Position.Y = n.Position.Y

	// کپی Data (همه فیلدها)
	clone.Data.ID = n.Data.ID
	clone.Data.Name = n.Data.Name
	clone.Data.NodeType = n.Data.NodeType
	clone.Data.Role = n.Data.Role
	clone.Data.FriendCount = n.Data.FriendCount
	clone.Data.AvgDistance = n.Data.AvgDistance
	clone.Data.Centrality = n.Data.Centrality

	// کپی Canary (اگر نیاز است)
	clone._canary = n._canary

	return clone
}

// CloneTo - کپی کردن Node به یک Node موجود (برای استفاده با Pool)
func (n *Node) CloneTo(dst *Node) {
	if n == nil || dst == nil {
		return
	}

	dst.ID = n.ID
	dst.Type = n.Type
	dst.Status = n.Status

	// کپی Position
	dst.Position.X = n.Position.X
	dst.Position.Y = n.Position.Y

	// کپی Data
	dst.Data.ID = n.Data.ID
	dst.Data.Name = n.Data.Name
	dst.Data.NodeType = n.Data.NodeType
	dst.Data.Role = n.Data.Role
	dst.Data.FriendCount = n.Data.FriendCount
	dst.Data.AvgDistance = n.Data.AvgDistance
	dst.Data.Centrality = n.Data.Centrality

	// کپی Canary
	dst._canary = n._canary
}

// Reset - بازنشانی Node برای استفاده مجدد در Pool
func (n *Node) Reset() {
	n.ID = ""
	n.Type = ""
	n.Status = 0
	n.Position.X = 0
	n.Position.Y = 0
	n.Data.ID = ""
	n.Data.Name = ""
	n.Data.NodeType = ""
	n.Data.Role = ""
	n.Data.FriendCount = 0
	n.Data.AvgDistance = 0
	n.Data.Centrality = 0
	n._canary = 0
}

// ============================================================
// 🎯 CLONE METHODS FOR EDGE
// ============================================================

// Clone - ایجاد یک کپی عمیق از Edge
func (e *Edge) Clone() *Edge {
	if e == nil {
		return nil
	}

	// ✅ استفاده از Pool برای Edge جدید
	clone := GetEdge()

	// کپی کردن فیلدها
	clone.ID = e.ID
	clone.Source = e.Source
	clone.Target = e.Target
	clone.Type = e.Type
	clone.Status = e.Status

	// کپی Data
	clone.Data.Weight = e.Data.Weight
	clone.Data.CreatedAt = e.Data.CreatedAt
	clone.Data.ID = e.Data.ID
	clone.Data.TargetID = e.Data.TargetID

	// کپی Canary
	clone._canary = e._canary

	return clone
}

// CloneTo - کپی کردن Edge به یک Edge موجود (برای استفاده با Pool)
func (e *Edge) CloneTo(dst *Edge) {
	if e == nil || dst == nil {
		return
	}

	dst.ID = e.ID
	dst.Source = e.Source
	dst.Target = e.Target
	dst.Type = e.Type
	dst.Status = e.Status

	// کپی Data
	dst.Data.Weight = e.Data.Weight
	dst.Data.CreatedAt = e.Data.CreatedAt
	dst.Data.ID = e.Data.ID
	dst.Data.TargetID = e.Data.TargetID

	// کپی Canary
	dst._canary = e._canary
}

// Reset - بازنشانی Edge برای استفاده مجدد در Pool
func (e *Edge) Reset() {
	e.ID = ""
	e.Source = ""
	e.Target = ""
	e.Type = ""
	e.Status = 0
	e.Data.Weight = 0
	e.Data.CreatedAt = time.Time{}
	e.Data.ID = ""
	e.Data.TargetID = ""
	e._canary = 0
}