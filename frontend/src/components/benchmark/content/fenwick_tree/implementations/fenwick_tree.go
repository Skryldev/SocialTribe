package main

type FenwickTree struct {
	n    int
	tree []int
}

func NewFenwickTree(size int) *FenwickTree {
	return &FenwickTree{
		n:    size,
		tree: make([]int, size+1),
	}
}

func (ft *FenwickTree) Build(arr []int) {
	for i := 0; i < ft.n; i++ {
		ft.tree[i+1] += arr[i]
		j := (i + 1) + ((i + 1) & -(i + 1))
		if j <= ft.n {
			ft.tree[j] += ft.tree[i+1]
		}
	}
}

func (ft *FenwickTree) Update(idx, delta int) {
	i := idx + 1
	for i <= ft.n {
		ft.tree[i] += delta
		i += i & -i
	}
}

func (ft *FenwickTree) Query(idx int) int {
	result := 0
	i := idx + 1
	for i > 0 {
		result += ft.tree[i]
		i -= i & -i
	}
	return result
}

func (ft *FenwickTree) RangeQuery(left, right int) int {
	if left > 0 {
		return ft.Query(right) - ft.Query(left-1)
	}
	return ft.Query(right)
}