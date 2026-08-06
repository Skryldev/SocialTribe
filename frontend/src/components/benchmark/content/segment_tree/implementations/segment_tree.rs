pub struct SegmentTree {
    tree: Vec<i32>,
    n: usize,
}

impl SegmentTree {
    pub fn new(arr: &[i32]) -> Self {
        let n = arr.len();
        let mut tree = vec![0; 4 * n];
        Self::build(&mut tree, arr, 1, 0, n - 1);
        SegmentTree { tree, n }
    }

    fn build(tree: &mut Vec<i32>, arr: &[i32], node: usize, start: usize, end: usize) {
        if start == end {
            tree[node] = arr[start];
            return;
        }

        let mid = (start + end) / 2;
        Self::build(tree, arr, node * 2, start, mid);
        Self::build(tree, arr, node * 2 + 1, mid + 1, end);
        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    pub fn update(&mut self, idx: usize, val: i32) {
        Self::update_tree(&mut self.tree, 1, 0, self.n - 1, idx, val);
    }

    fn update_tree(tree: &mut Vec<i32>, node: usize, start: usize, end: usize, idx: usize, val: i32) {
        if start == end {
            tree[node] = val;
            return;
        }

        let mid = (start + end) / 2;
        if idx <= mid {
            Self::update_tree(tree, node * 2, start, mid, idx, val);
        } else {
            Self::update_tree(tree, node * 2 + 1, mid + 1, end, idx, val);
        }

        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    pub fn query(&self, l: usize, r: usize) -> i32 {
        Self::query_tree(&self.tree, 1, 0, self.n - 1, l, r)
    }

    fn query_tree(tree: &Vec<i32>, node: usize, start: usize, end: usize, l: usize, r: usize) -> i32 {
        if r < start || l > end {
            return 0;
        }

        if l <= start && end <= r {
            return tree[node];
        }

        let mid = (start + end) / 2;
        Self::query_tree(tree, node * 2, start, mid, l, r) +
        Self::query_tree(tree, node * 2 + 1, mid + 1, end, l, r)
    }
}