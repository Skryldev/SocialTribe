use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::{HashSet, HashMap};
use std::time::Instant;

pub struct CommonNeighbors;

impl AlgorithmRunner for CommonNeighbors {
    fn aliases(&self) -> &'static [&'static str] {
        &["common-neighbors", "cn", "common-neighbors-index"]
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
        // ✅ Step 1: Build adjacency sets for O(1) lookup
        // ============================================================
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
                operations += 1;
            }
            adjacency_sets.push(set);
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Compute Common Neighbors for all pairs
        // ============================================================
        let mut total_common = 0_usize;
        let mut pairs_processed = 0usize;
        let mut max_common = 0_usize;
        let mut visited_nodes = 0usize;

        // Calculate total work for sampling
        let total_work = n * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        // Track common neighbor counts for statistics
        let mut common_counts: HashMap<usize, usize> = HashMap::new();

        // For each pair of nodes (i, j) with i < j
        for i in 0..n {
            visited_nodes += 1;
            
            // Sample based on progress
            if sample && visited_nodes % sample_interval == 0 {
                let progress = (visited_nodes as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            // Skip isolated nodes
            if adjacency_sets[i].is_empty() {
                continue;
            }

            // Get neighbors of i
            let neighbors_i: Vec<usize> = adjacency_sets[i].iter().copied().collect();
            
            for &j in &neighbors_i {
                // Only process if j > i to avoid duplicates
                if j <= i {
                    continue;
                }
                
                // Skip if j has no neighbors
                if adjacency_sets[j].is_empty() {
                    continue;
                }

                // Find intersection of neighbors: N(i) ∩ N(j)
                let mut common_count = 0_usize;
                
                // Iterate over smaller set for efficiency
                let (smaller, larger) = if adjacency_sets[i].len() <= adjacency_sets[j].len() {
                    (&adjacency_sets[i], &adjacency_sets[j])
                } else {
                    (&adjacency_sets[j], &adjacency_sets[i])
                };

                for &neighbor in smaller {
                    operations += 1;
                    if larger.contains(&neighbor) {
                        common_count += 1;
                        operations += 1;
                    }
                }

                if common_count > 0 {
                    total_common += common_count;
                    pairs_processed += 1;
                    *common_counts.entry(common_count).or_insert(0) += 1;
                    
                    if common_count > max_common {
                        max_common = common_count;
                    }
                    operations += 1;
                }
            }

            work_done += n;

            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = (visited_nodes as f64 / n as f64) * 100.0;
                if (percent - 25.0).abs() < 1.0 {
                    samples.push(MetricsPoint { 
                        x: 25.0, 
                        y: operations as f64 
                    });
                }
                if (percent - 50.0).abs() < 1.0 {
                    samples.push(MetricsPoint { 
                        x: 50.0, 
                        y: operations as f64 
                    });
                }
                if (percent - 75.0).abs() < 1.0 {
                    samples.push(MetricsPoint { 
                        x: 75.0, 
                        y: operations as f64 
                    });
                }
            }
        }

        // ============================================================
        // ✅ Step 3: Calculate statistics
        // ============================================================
        let avg_common = if pairs_processed > 0 {
            total_common as f64 / pairs_processed as f64
        } else {
            0.0
        };

        let mut distribution: Vec<(usize, usize)> = common_counts
            .iter()
            .map(|(&k, &v)| (k, v))
            .collect();
        distribution.sort_by(|a, b| a.0.cmp(&b.0));

        operations += 5;

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
            log_debug_fields!("common_neighbors", "Common Neighbors sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "pairs_processed" => pairs_processed as i64,
                "total_common" => total_common as i64,
                "avg_common" => avg_common,
                "max_common" => max_common as i64,
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            visited_nodes,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl CommonNeighbors {
    /// Compute Common Neighbors between two nodes (for testing)
    pub fn count(&self, graph: &[Vec<Edge>], u: usize, v: usize) -> usize {
        let n = graph.len();
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
            }
            adjacency_sets.push(set);
        }

        let (smaller, larger) = if adjacency_sets[u].len() <= adjacency_sets[v].len() {
            (&adjacency_sets[u], &adjacency_sets[v])
        } else {
            (&adjacency_sets[v], &adjacency_sets[u])
        };

        let mut count = 0_usize;
        for &neighbor in smaller {
            if larger.contains(&neighbor) {
                count += 1;
            }
        }

        count
    }

    /// Get all common neighbor counts (for testing)
    pub fn get_all_counts(&self, graph: &[Vec<Edge>]) -> Vec<(usize, usize, usize)> {
        let n = graph.len();
        let mut results = Vec::new();
        
        for u in 0..n {
            for v in (u + 1)..n {
                let count = self.count(graph, u, v);
                if count > 0 {
                    results.push((u, v, count));
                }
            }
        }
        
        results.sort_by(|a, b| b.2.cmp(&a.2));
        results
    }
}