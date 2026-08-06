use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::{VecDeque, HashMap};
use std::time::Instant;

pub struct KCoreDecomposition;

impl AlgorithmRunner for KCoreDecomposition {
    fn aliases(&self) -> &'static [&'static str] {
        &["k-core", "k-core-decomposition", "kcore", "core-decomposition"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Handle empty graph
        // ============================================================
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        // ============================================================
        // ✅ Step 1: Build adjacency list and compute degrees
        // ============================================================
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        let mut degrees = vec![0_usize; n];
        
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
                degrees[i] += 1;
                operations += 1;
            }
            adjacency.push(neighbors);
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: K-Core Decomposition algorithm
        // ============================================================
        let mut core = vec![0_usize; n];
        let mut remaining_degrees = degrees.clone();
        let mut removed = vec![false; n];
        
        let mut degree_buckets: HashMap<usize, VecDeque<usize>> = HashMap::new();
        for i in 0..n {
            degree_buckets.entry(degrees[i]).or_insert_with(VecDeque::new).push_back(i);
            operations += 1;
        }

        let _max_degree = *degrees.iter().max().unwrap_or(&0);
        let mut current_core = 0_usize;

        let total_work = n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 10));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut processed = 0_usize;

        while processed < n {
            let mut min_degree = usize::MAX;
            for i in 0..n {
                operations += 1;
                if !removed[i] && remaining_degrees[i] < min_degree {
                    min_degree = remaining_degrees[i];
                }
            }

            if min_degree == usize::MAX {
                break;
            }

            current_core = min_degree;

            let mut queue = VecDeque::new();
            for i in 0..n {
                operations += 1;
                if !removed[i] && remaining_degrees[i] <= current_core {
                    queue.push_back(i);
                }
            }

            while let Some(node) = queue.pop_front() {
                operations += 1;
                if removed[node] || remaining_degrees[node] > current_core {
                    continue;
                }

                removed[node] = true;
                core[node] = current_core;
                processed += 1;

                for &neighbor in &adjacency[node] {
                    operations += 1;
                    if !removed[neighbor] && remaining_degrees[neighbor] > current_core {
                        remaining_degrees[neighbor] -= 1;
                        if remaining_degrees[neighbor] <= current_core {
                            queue.push_back(neighbor);
                            operations += 1;
                        }
                    }
                }
            }

            if sample && processed % sample_interval == 0 {
                let progress = (processed as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if sample {
                let percent = (processed as f64 / n as f64) * 100.0;
                if (percent - 25.0).abs() < 1.0 {
                    samples.push(MetricsPoint { x: 25.0, y: operations as f64 });
                }
                if (percent - 50.0).abs() < 1.0 {
                    samples.push(MetricsPoint { x: 50.0, y: operations as f64 });
                }
                if (percent - 75.0).abs() < 1.0 {
                    samples.push(MetricsPoint { x: 75.0, y: operations as f64 });
                }
            }
        }

        // ============================================================
        // ✅ Step 3: Calculate statistics
        // ============================================================
        let max_core = core.iter().max().copied().unwrap_or(0);
        let _min_core = core.iter().min().copied().unwrap_or(0);
        let avg_core = if n > 0 {
            core.iter().sum::<usize>() as f64 / n as f64
        } else {
            0.0
        };

        let mut core_counts: HashMap<usize, usize> = HashMap::new();
        for &c in &core {
            *core_counts.entry(c).or_insert(0) += 1;
            operations += 1;
        }

        let mut high_core_nodes: Vec<(usize, usize)> = core
            .iter()
            .enumerate()
            .filter(|(_, &c)| c == max_core)
            .map(|(i, &c)| (i, c))
            .collect();
        high_core_nodes.sort_by(|a, b| b.1.cmp(&a.1));
        let _top_core_nodes: Vec<usize> = high_core_nodes
            .iter()
            .take(5)
            .map(|(i, _)| *i)
            .collect();

        operations += 5 + n as u64;

        // ============================================================
        // ✅ Step 4: Final sample with 100% progress
        // ============================================================
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
            log_debug_fields!("k_core_decomposition", "K-Core Decomposition sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "max_core" => max_core as i64,
                "avg_core" => avg_core,
                "nodes_in_max_core" => high_core_nodes.len() as i64,
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
impl KCoreDecomposition {
    /// Get core numbers for all nodes (for testing)
    pub fn get_core_numbers(&self, graph: &[Vec<Edge>]) -> Vec<usize> {
        let n = graph.len();
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        let mut degrees = vec![0_usize; n];
        
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
                degrees[i] += 1;
            }
            adjacency.push(neighbors);
        }

        let mut core = vec![0_usize; n];
        let mut remaining_degrees = degrees.clone();
        let mut removed = vec![false; n];
        let mut processed = 0_usize;
        let mut current_core = 0_usize;

        while processed < n {
            let mut min_degree = usize::MAX;
            for i in 0..n {
                if !removed[i] && remaining_degrees[i] < min_degree {
                    min_degree = remaining_degrees[i];
                }
            }

            if min_degree == usize::MAX {
                break;
            }

            current_core = min_degree;

            let mut queue = VecDeque::new();
            for i in 0..n {
                if !removed[i] && remaining_degrees[i] <= current_core {
                    queue.push_back(i);
                }
            }

            while let Some(node) = queue.pop_front() {
                if removed[node] || remaining_degrees[node] > current_core {
                    continue;
                }

                removed[node] = true;
                core[node] = current_core;
                processed += 1;

                for &neighbor in &adjacency[node] {
                    if !removed[neighbor] && remaining_degrees[neighbor] > current_core {
                        remaining_degrees[neighbor] -= 1;
                        if remaining_degrees[neighbor] <= current_core {
                            queue.push_back(neighbor);
                        }
                    }
                }
            }
        }

        core
    }

    /// Get nodes in the maximum core (for testing)
    pub fn get_max_core_nodes(&self, graph: &[Vec<Edge>]) -> Vec<usize> {
        let core = self.get_core_numbers(graph);
        let max_core = core.iter().max().copied().unwrap_or(0);
        
        core.iter()
            .enumerate()
            .filter(|(_, &c)| c == max_core)
            .map(|(i, _)| i)
            .collect()
    }
}