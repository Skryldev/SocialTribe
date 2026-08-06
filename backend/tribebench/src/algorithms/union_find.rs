use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct UnionFind;

impl AlgorithmRunner for UnionFind {
    fn aliases(&self) -> &'static [&'static str] {
        &["union-find", "disjoint-set", "dsu", "unionfind"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        let _arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        struct UnionFindImpl {
            parent: Vec<usize>,
            rank: Vec<usize>,
            size: Vec<usize>,
            components: usize,
            operations: u64,
        }

        impl UnionFindImpl {
            fn new(n: usize) -> Self {
                let parent: Vec<usize> = (0..n).collect();
                let rank = vec![0; n];
                let size = vec![1; n];
                
                Self {
                    parent,
                    rank,
                    size,
                    components: n,
                    operations: 0,
                }
            }

            fn find(&mut self, x: usize) -> usize {
                self.operations += 1;
                if self.parent[x] != x {
                    self.operations += 1;
                    self.parent[x] = self.find(self.parent[x]);
                }
                self.parent[x]
            }

            fn find_iterative(&mut self, x: usize) -> usize {
                self.operations += 1;
                let mut root = x;
                
                while root != self.parent[root] {
                    self.operations += 1;
                    root = self.parent[root];
                }
                
                let mut current = x;
                while current != root {
                    self.operations += 1;
                    let next = self.parent[current];
                    self.parent[current] = root;
                    current = next;
                }
                
                root
            }

            fn union(&mut self, a: usize, b: usize) -> bool {
                self.operations += 1;
                let root_a = self.find(a);
                let root_b = self.find(b);
                
                if root_a == root_b {
                    return false;
                }
                
                if self.rank[root_a] < self.rank[root_b] {
                    self.parent[root_a] = root_b;
                    self.size[root_b] += self.size[root_a];
                    self.operations += 1;
                } else if self.rank[root_a] > self.rank[root_b] {
                    self.parent[root_b] = root_a;
                    self.size[root_a] += self.size[root_b];
                    self.operations += 1;
                } else {
                    self.parent[root_b] = root_a;
                    self.size[root_a] += self.size[root_b];
                    self.rank[root_a] += 1;
                    self.operations += 2;
                }
                
                self.components -= 1;
                self.operations += 1;
                true
            }

            fn connected(&mut self, a: usize, b: usize) -> bool {
                self.operations += 1;
                self.find(a) == self.find(b)
            }

            fn count_components(&self) -> usize {
                self.components
            }

            fn set_size(&mut self, x: usize) -> usize {
                self.operations += 1;
                let root = self.find(x);
                self.size[root]
            }

            fn get_components(&mut self) -> Vec<Vec<usize>> {
                self.operations += 1;
                let mut map: std::collections::HashMap<usize, Vec<usize>> = 
                    std::collections::HashMap::new();
                
                for i in 0..self.parent.len() {
                    self.operations += 1;
                    let root = self.find(i);
                    map.entry(root).or_insert_with(Vec::new).push(i);
                }
                
                map.into_values().collect()
            }

            fn get_operations(&self) -> u64 {
                self.operations
            }
        }

        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let _work_done = 0_usize;
        let mut uf = UnionFindImpl::new(n);
        operations += uf.get_operations();

        let mut edge_count = 0;
        for u in 0..n {
            for edge in &graph[u] {
                operations += 1;
                if u < edge.node {
                    let merged = uf.union(u, edge.node);
                    operations += uf.get_operations();
                    edge_count += 1;
                    
                    if merged && sample && edge_count % sample_interval == 0 {
                        let progress = (edge_count as f64 / (n * 2) as f64 * 100.0).min(50.0);
                        samples.push(MetricsPoint { 
                            x: progress, 
                            y: operations as f64 
                        });
                    }
                }
            }
        }

        let num_finds = std::cmp::min(n, 100);
        for i in 0..num_finds {
            let a = (i * 7) % n;
            let b = (i * 13) % n;
            let _connected = uf.connected(a, b);
            operations += uf.get_operations();
            
            if sample && i % sample_interval == 0 {
                let progress = 50.0 + (i as f64 / num_finds as f64 * 25.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        let components = uf.get_components();
        operations += uf.get_operations();
        
        let num_components = components.len();
        let max_component_size = components.iter().map(|c| c.len()).max().unwrap_or(0);
        let avg_component_size = if num_components > 0 {
            components.iter().map(|c| c.len()).sum::<usize>() as f64 / num_components as f64
        } else {
            0.0
        };

        operations += 5;

        for i in 0..std::cmp::min(n, 20) {
            let a = (i * 3) % n;
            let b = (i * 7) % n;
            if a != b {
                let _merged = uf.union(a, b);
                operations += uf.get_operations();
                
                if sample {
                    let progress = 75.0 + (i as f64 / 20.0 * 25.0);
                    samples.push(MetricsPoint { 
                        x: progress, 
                        y: operations as f64 
                    });
                }
            }
        }

        let final_components = uf.count_components();
        operations += 1;

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
            log_debug_fields!("union_find", "Union-Find sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "initial_components" => n as i64,
                "final_components" => final_components as i64,
                "max_component_size" => max_component_size as i64,
                "avg_component_size" => avg_component_size,
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
impl UnionFind {
    pub fn new(n: usize) -> UnionFind {
        let parent: Vec<usize> = (0..n).collect();
        let rank = vec![0; n];
        let size = vec![1; n];
        
        UnionFind {
            parent,
            rank,
            size,
            components: n,
            operations: 0,
        }
    }

    pub fn find(&mut self, x: usize) -> usize {
        self.operations += 1;
        if self.parent[x] != x {
            self.operations += 1;
            self.parent[x] = self.find(self.parent[x]);
        }
        self.parent[x]
    }

    pub fn union(&mut self, a: usize, b: usize) -> bool {
        self.operations += 1;
        let root_a = self.find(a);
        let root_b = self.find(b);
        
        if root_a == root_b {
            return false;
        }
        
        if self.rank[root_a] < self.rank[root_b] {
            self.parent[root_a] = root_b;
            self.size[root_b] += self.size[root_a];
        } else if self.rank[root_a] > self.rank[root_b] {
            self.parent[root_b] = root_a;
            self.size[root_a] += self.size[root_b];
        } else {
            self.parent[root_b] = root_a;
            self.size[root_a] += self.size[root_b];
            self.rank[root_a] += 1;
        }
        
        self.components -= 1;
        true
    }

    pub fn connected(&mut self, a: usize, b: usize) -> bool {
        self.find(a) == self.find(b)
    }

    pub fn count_components(&self) -> usize {
        self.components
    }
}