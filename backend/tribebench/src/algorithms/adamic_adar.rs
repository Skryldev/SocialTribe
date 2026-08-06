use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::HashSet;
use std::time::Instant;

pub struct AdamicAdar;

impl AlgorithmRunner for AdamicAdar {
    fn aliases(&self) -> &'static [&'static str] {
        &["adamic-adar", "aa", "adamic_adar"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Sampling interval calculation
        // ============================================================
        let sample_interval = if sample {
            let target_points = std::cmp::min(200, std::cmp::max(10, n / 50));
            std::cmp::max(1, n / target_points)
        } else {
            n + 1
        };

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        // ============================================================
        // ✅ Step 1: Build adjacency sets for O(1) lookup
        // ============================================================
        let mut adjacency: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
                operations += 1;
            }
            adjacency.push(set);
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Calculate degree of each node
        // ============================================================
        let mut degrees = vec![0; n];
        for i in 0..n {
            degrees[i] = adjacency[i].len();
            operations += 1;
        }

        // ============================================================
        // ✅ Step 3: Pre-compute Adamic-Adar weights for each node
        //         weight(v) = 1 / log(deg(v))
        // ============================================================
        let mut weights = vec![0.0_f64; n];
        for i in 0..n {
            if degrees[i] > 1 {
                weights[i] = 1.0 / (degrees[i] as f64).ln();
            } else {
                weights[i] = 0.0;
            }
            operations += 1;
        }

        // ============================================================
        // ✅ Step 4: Compute Adamic-Adar similarity for all pairs
        // ============================================================
        let mut total_similarity = 0.0_f64;
        let mut pairs_processed = 0usize;
        let mut visited_nodes = 0usize;

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

            // Only consider nodes with common neighbors possible
            if adjacency[i].len() < 2 {
                continue;
            }

            // Get neighbors of i as a vector for iteration
            let neighbors_i: Vec<usize> = adjacency[i].iter().copied().collect();
            
            for &j in &neighbors_i {
                // Only process if j > i to avoid duplicates
                if j <= i {
                    continue;
                }
                
                // Skip if j has no neighbors
                if adjacency[j].len() < 2 {
                    continue;
                }

                // Find intersection of neighbors: N(i) ∩ N(j)
                let mut similarity = 0.0_f64;
                
                // Iterate over smaller set for efficiency
                let (smaller, larger) = if adjacency[i].len() <= adjacency[j].len() {
                    (&adjacency[i], &adjacency[j])
                } else {
                    (&adjacency[j], &adjacency[i])
                };

                for &common_neighbor in smaller {
                    operations += 1;
                    if larger.contains(&common_neighbor) {
                        // Add Adamic-Adar weight
                        similarity += weights[common_neighbor];
                        operations += 1;
                    }
                }

                if similarity > 0.0 {
                    total_similarity += similarity;
                    pairs_processed += 1;
                    operations += 1;
                }
            }

            // Optional: Sample at 50% and 75% for better granularity
            if sample && visited_nodes == n / 2 {
                samples.push(MetricsPoint { 
                    x: 50.0, 
                    y: operations as f64 
                });
            }
            if sample && visited_nodes == (n * 3) / 4 {
                samples.push(MetricsPoint { 
                    x: 75.0, 
                    y: operations as f64 
                });
            }
        }

        // ============================================================
        // ✅ Step 5: Final sample with 100% progress
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
            log_debug_fields!("adamic_adar", "Adamic-Adar sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "pairs_processed" => pairs_processed as i64,
                "total_similarity" => total_similarity,
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