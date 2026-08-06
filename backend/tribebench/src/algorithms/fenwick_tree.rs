use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct FenwickTree;

impl AlgorithmRunner for FenwickTree {
    fn aliases(&self) -> &'static [&'static str] {
        &["fenwick-tree", "bit", "binary-indexed-tree", "fenwick"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Build array from graph degrees
        // ============================================================
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Fenwick Tree (Binary Indexed Tree) Implementation
        // ============================================================
        struct FenwickTreeImpl {
            tree: Vec<usize>,
            size: usize,
            operations: u64,
        }

        impl FenwickTreeImpl {
            fn build_from_array(arr: &[usize]) -> Self {
                let size = arr.len();
                let mut tree = vec![0; size + 1];
                let mut ops = 0;

                for i in 0..size {
                    tree[i + 1] = arr[i];
                    ops += 1;
                }

                for i in 1..=size {
                    let parent = i + (i & (!i + 1));
                    if parent <= size {
                        tree[parent] += tree[i];
                        ops += 1;
                    }
                }

                Self {
                    tree,
                    size,
                    operations: ops,
                }
            }

            fn prefix_sum(&mut self, idx: usize) -> usize {
                self.operations += 1;
                let mut sum = 0;
                let mut i = idx;
                
                while i > 0 {
                    self.operations += 1;
                    sum += self.tree[i];
                    self.operations += 1;
                    i -= i & (!i + 1);
                }
                
                sum
            }

            fn range_sum(&mut self, left: usize, right: usize) -> usize {
                self.operations += 1;
                self.prefix_sum(right) - self.prefix_sum(left)
            }

            fn update(&mut self, pos: usize, delta: isize) {
                self.operations += 1;
                let mut i = pos + 1;
                
                while i <= self.size {
                    self.operations += 1;
                    if delta >= 0 {
                        self.tree[i] += delta as usize;
                    } else {
                        self.tree[i] = self.tree[i].saturating_sub((-delta) as usize);
                    }
                    self.operations += 1;
                    i += i & (!i + 1);
                }
            }

            fn get(&mut self, pos: usize) -> usize {
                self.operations += 1;
                self.prefix_sum(pos + 1) - self.prefix_sum(pos)
            }

            fn set(&mut self, pos: usize, value: usize) {
                self.operations += 1;
                let current = self.get(pos);
                let delta = value as isize - current as isize;
                self.update(pos, delta);
            }

            fn lower_bound(&mut self, target: usize) -> usize {
                self.operations += 1;
                let mut idx = 0;
                let mut bit_mask = 1 << ((self.size as f64).log2().floor() as usize);
                
                while bit_mask > 0 {
                    self.operations += 1;
                    let next = idx + bit_mask;
                    if next <= self.size && self.tree[next] < target {
                        idx = next;
                        self.operations += 1;
                    }
                    bit_mask >>= 1;
                    self.operations += 1;
                }
                
                idx + 1
            }

            fn get_operations(&self) -> u64 {
                self.operations
            }
        }

        // ============================================================
        // ✅ Build and query Fenwick Tree
        // ============================================================
        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut bit = FenwickTreeImpl::build_from_array(&arr);
        operations += bit.get_operations();

        // Perform prefix sum queries
        let num_queries = std::cmp::min(n, 100);
        for i in 0..num_queries {
            let idx = (i * 7) % n + 1;
            let _sum = bit.prefix_sum(idx);
            operations += bit.get_operations();
            operations += 1;

            work_done += 1;

            if sample && work_done % sample_interval == 0 {
                let progress = (work_done as f64 / num_queries as f64 * 100.0).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        // Perform range sum queries
        for i in 0..std::cmp::min(n, 50) {
            let l = (i * 3) % n;
            let r = std::cmp::min(l + 10, n);
            if l < r {
                let _sum = bit.range_sum(l, r);
                operations += bit.get_operations();
                operations += 1;
            }
        }

        // Perform point updates
        for i in 0..std::cmp::min(n, 30) {
            let pos = (i * 5) % n;
            let delta = (i % 5) as isize + 1;
            bit.update(pos, delta);
            operations += bit.get_operations();
            
            if sample {
                let progress = 50.0 + (i as f64 / 30.0 * 25.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        // Test lower_bound
        for i in 0..std::cmp::min(n, 10) {
            let _pos = bit.lower_bound(i + 1);
            operations += bit.get_operations();
        }

        // Final sample at 100%
        if sample {
            let last_sample = samples.last();
            if last_sample.is_none() || last_sample.unwrap().x < 99.9 {
                samples.push(MetricsPoint { 
                    x: 100.0, 
                    y: operations as f64 
                });
            } else if let Some(last) = samples.last_mut() {
                last.x = 100.0;
            }
        }

        let time_ms = start.elapsed().as_secs_f64() * 1000.0;

        // ============================================================
        // ✅ Debug: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("fenwick_tree", "Fenwick Tree sampling completed", fields!(
                "array_size" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "tree_size" => bit.tree.len() as i64,
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl FenwickTree {
    /// Build a Fenwick Tree from array (for testing)
    pub fn build(&self, arr: &[usize]) -> Vec<usize> {
        let size = arr.len();
        let mut tree = vec![0; size + 1];

        for (i, &val) in arr.iter().enumerate() {
            let mut idx = i + 1;
            while idx <= size {
                tree[idx] += val;
                idx += idx & (!idx + 1);
            }
        }

        tree
    }

    /// Prefix sum query (for testing)
    pub fn prefix_sum(&self, arr: &[usize], idx: usize) -> usize {
        let tree = self.build(arr);
        let mut sum = 0;
        let mut i = idx;
        
        while i > 0 {
            sum += tree[i];
            i -= i & (!i + 1);
        }
        
        sum
    }

    /// Range sum query (for testing)
    pub fn range_sum(&self, arr: &[usize], left: usize, right: usize) -> usize {
        self.prefix_sum(arr, right) - self.prefix_sum(arr, left)
    }

    /// Point update (for testing)
    pub fn update(&self, arr: &mut [usize], pos: usize, delta: isize) -> Vec<usize> {
        let size = arr.len();
        let mut tree = self.build(arr);
        
        if delta >= 0 {
            arr[pos] += delta as usize;
        } else {
            arr[pos] = arr[pos].saturating_sub((-delta) as usize);
        }
        
        let mut i = pos + 1;
        while i <= size {
            if delta >= 0 {
                tree[i] += delta as usize;
            } else {
                tree[i] = tree[i].saturating_sub((-delta) as usize);
            }
            i += i & (!i + 1);
        }
        
        tree
    }
}