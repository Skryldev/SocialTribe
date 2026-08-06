use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct SegmentTree;

impl AlgorithmRunner for SegmentTree {
    fn aliases(&self) -> &'static [&'static str] {
        &["segment-tree", "segtree", "segmenttree", "st"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        struct SegTree {
            tree: Vec<usize>,
            size: usize,
            operations: u64,
        }

        impl SegTree {
            fn new(arr: &[usize]) -> Self {
                let n = arr.len();
                let size = n.next_power_of_two();
                let mut tree = vec![0; 2 * size];
                
                for i in 0..n {
                    tree[size + i] = arr[i];
                }
                
                for i in (1..size).rev() {
                    tree[i] = tree[i << 1] + tree[i << 1 | 1];
                }
                
                Self {
                    tree,
                    size,
                    operations: 0,
                }
            }

            fn query(&mut self, left: usize, right: usize) -> usize {
                self.operations += 1;
                let mut l = left + self.size;
                let mut r = right + self.size;
                let mut sum = 0;

                while l < r {
                    self.operations += 1;
                    if l & 1 == 1 {
                        sum += self.tree[l];
                        l += 1;
                        self.operations += 1;
                    }
                    if r & 1 == 1 {
                        r -= 1;
                        sum += self.tree[r];
                        self.operations += 1;
                    }
                    l >>= 1;
                    r >>= 1;
                    self.operations += 1;
                }

                sum
            }

            fn update(&mut self, pos: usize, value: usize) {
                self.operations += 1;
                let mut p = pos + self.size;
                self.tree[p] = value;
                
                while p > 1 {
                    self.operations += 1;
                    p >>= 1;
                    self.tree[p] = self.tree[p << 1] + self.tree[p << 1 | 1];
                    self.operations += 1;
                }
            }

            fn build_with_ops(arr: &[usize]) -> Self {
                let mut tree = Self::new(arr);
                tree.operations = 0;
                tree
            }

            fn get_operations(&self) -> u64 {
                self.operations
            }

            fn query_min(&mut self, left: usize, right: usize) -> usize {
                self.operations += 1;
                let mut l = left + self.size;
                let mut r = right + self.size;
                let mut min_val = usize::MAX;

                while l < r {
                    self.operations += 1;
                    if l & 1 == 1 {
                        if self.tree[l] < min_val {
                            min_val = self.tree[l];
                        }
                        l += 1;
                        self.operations += 1;
                    }
                    if r & 1 == 1 {
                        r -= 1;
                        if self.tree[r] < min_val {
                            min_val = self.tree[r];
                        }
                        self.operations += 1;
                    }
                    l >>= 1;
                    r >>= 1;
                    self.operations += 1;
                }

                min_val
            }

            fn query_max(&mut self, left: usize, right: usize) -> usize {
                self.operations += 1;
                let mut l = left + self.size;
                let mut r = right + self.size;
                let mut max_val = 0;

                while l < r {
                    self.operations += 1;
                    if l & 1 == 1 {
                        if self.tree[l] > max_val {
                            max_val = self.tree[l];
                        }
                        l += 1;
                        self.operations += 1;
                    }
                    if r & 1 == 1 {
                        r -= 1;
                        if self.tree[r] > max_val {
                            max_val = self.tree[r];
                        }
                        self.operations += 1;
                    }
                    l >>= 1;
                    r >>= 1;
                    self.operations += 1;
                }

                max_val
            }
        }

        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut seg_tree = SegTree::build_with_ops(&arr);
        operations += seg_tree.get_operations();

        let num_queries = std::cmp::min(n, 100);
        for i in 0..num_queries {
            let l = i % n;
            let r = std::cmp::min(l + 10, n);
            
            if l < r {
                let _sum = seg_tree.query(l, r);
                let _min_val = seg_tree.query_min(l, r);
                let _max_val = seg_tree.query_max(l, r);
                operations += seg_tree.get_operations();
                operations += 3;
            }

            work_done += 1;

            if sample && work_done % sample_interval == 0 {
                let progress = (work_done as f64 / num_queries as f64 * 100.0).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        for i in 0..std::cmp::min(n, 20) {
            seg_tree.update(i, arr[i] + 1);
            operations += seg_tree.get_operations();
            
            if sample {
                let progress = 50.0 + (i as f64 / 20.0 * 25.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        for i in 0..std::cmp::min(n, 10) {
            let l = i % n;
            let r = std::cmp::min(l + 5, n);
            if l < r {
                let _sum = seg_tree.query(l, r);
                operations += seg_tree.get_operations();
            }
        }

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

        if sample {
            log_debug_fields!("segment_tree", "Segment Tree sampling completed", fields!(
                "array_size" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "tree_size" => seg_tree.tree.len() as i64,
            ));
        }

        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

#[cfg(test)]
impl SegmentTree {
    pub fn build(&self, arr: &[usize]) -> Vec<usize> {
        let n = arr.len();
        let size = n.next_power_of_two();
        let mut tree = vec![0; 2 * size];
        
        for i in 0..n {
            tree[size + i] = arr[i];
        }
        
        for i in (1..size).rev() {
            tree[i] = tree[i << 1] + tree[i << 1 | 1];
        }
        
        tree
    }

    pub fn query(&self, arr: &[usize], left: usize, right: usize) -> usize {
        let mut tree = self.build(arr);
        let n = arr.len();
        let size = n.next_power_of_two();
        
        let mut l = left + size;
        let mut r = right + size;
        let mut sum = 0;

        while l < r {
            if l & 1 == 1 {
                sum += tree[l];
                l += 1;
            }
            if r & 1 == 1 {
                r -= 1;
                sum += tree[r];
            }
            l >>= 1;
            r >>= 1;
        }

        sum
    }

    pub fn update(&self, arr: &mut [usize], pos: usize, value: usize) -> Vec<usize> {
        let n = arr.len();
        let size = n.next_power_of_two();
        let mut tree = self.build(arr);
        
        arr[pos] = value;
        
        let mut p = pos + size;
        tree[p] = value;
        
        while p > 1 {
            p >>= 1;
            tree[p] = tree[p << 1] + tree[p << 1 | 1];
        }
        
        tree
    }
}