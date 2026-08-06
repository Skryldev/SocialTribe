pub struct FenwickTree {
    n: usize,
    tree: Vec<i32>,
}

impl FenwickTree {
    pub fn new(size: usize) -> Self {
        FenwickTree {
            n: size,
            tree: vec![0; size + 1],
        }
    }

    pub fn build(&mut self, arr: &[i32]) {
        for i in 0..self.n {
            self.tree[i + 1] += arr[i];
            let j = (i + 1) + ((i + 1) & (!(i + 1) + 1));
            if j <= self.n {
                self.tree[j] += self.tree[i + 1];
            }
        }
    }

    pub fn update(&mut self, idx: usize, delta: i32) {
        let mut i = idx + 1;
        while i <= self.n {
            self.tree[i] += delta;
            i += i & (!i + 1);
        }
    }

    pub fn query(&self, idx: usize) -> i32 {
        let mut result = 0;
        let mut i = idx + 1;
        while i > 0 {
            result += self.tree[i];
            i -= i & (!i + 1);
        }
        result
    }

    pub fn range_query(&self, left: usize, right: usize) -> i32 {
        if left > 0 {
            return self.query(right) - self.query(left - 1);
        }
        self.query(right)
    }
}