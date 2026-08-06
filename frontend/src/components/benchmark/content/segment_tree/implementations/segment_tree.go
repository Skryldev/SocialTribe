package main

type SegmentTree struct {
    tree []int
    n    int
}

func NewSegmentTree(arr []int) *SegmentTree {
    st := &SegmentTree{
        tree: make([]int, 4*len(arr)),
        n:    len(arr),
    }
    st.build(arr, 1, 0, st.n-1)
    return st
}

func (st *SegmentTree) build(arr []int, node, start, end int) {
    if start == end {
        st.tree[node] = arr[start]
        return
    }

    mid := (start + end) / 2
    st.build(arr, node*2, start, mid)
    st.build(arr, node*2+1, mid+1, end)
    st.tree[node] = st.tree[node*2] + st.tree[node*2+1]
}

func (st *SegmentTree) Update(idx, val int) {
    st.update(1, 0, st.n-1, idx, val)
}

func (st *SegmentTree) update(node, start, end, idx, val int) {
    if start == end {
        st.tree[node] = val
        return
    }

    mid := (start + end) / 2
    if idx <= mid {
        st.update(node*2, start, mid, idx, val)
    } else {
        st.update(node*2+1, mid+1, end, idx, val)
    }

    st.tree[node] = st.tree[node*2] + st.tree[node*2+1]
}

func (st *SegmentTree) Query(l, r int) int {
    return st.query(1, 0, st.n-1, l, r)
}

func (st *SegmentTree) query(node, start, end, l, r int) int {
    if r < start || l > end {
        return 0
    }

    if l <= start && end <= r {
        return st.tree[node]
    }

    mid := (start + end) / 2
    return st.query(node*2, start, mid, l, r) +
           st.query(node*2+1, mid+1, end, l, r)
}