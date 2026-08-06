use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct EigenvectorCentrality;

impl AlgorithmRunner for EigenvectorCentrality {
    fn aliases(&self) -> &'static [&'static str] {
        &["eigenvector-centrality", "eigenvector", "ec"]
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
        // ✅ Step 1: Build adjacency matrix (as sparse representation)
        // ============================================================
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
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
        // ✅ Step 2: Initialize eigenvector centrality
        // ============================================================
        let max_iterations = 100;
        let tolerance = 1e-8;
        
        // Initial guess: uniform vector
        let mut centrality = vec![1.0 / (n as f64).sqrt(); n];
        let mut new_centrality = vec![0.0; n];
        
        operations += n as u64; // Initialize vectors

        // ============================================================
        // ✅ Step 3: Power iteration method
        // ============================================================
        let mut iter = 0;
        let mut converged = false;
        
        // Calculate total work for sampling
        let total_work = max_iterations * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        while iter < max_iterations && !converged {
            iter += 1;
            
            // Reset new_centrality
            for v in 0..n {
                new_centrality[v] = 0.0;
                operations += 1;
            }

            // Multiply adjacency matrix by centrality vector
            for u in 0..n {
                operations += 1;
                let cu = centrality[u];
                
                for &v in &adjacency[u] {
                    new_centrality[v] += cu;
                    operations += 1;
                }
            }

            // Normalize (L2 norm)
            let mut norm = 0.0_f64;
            for v in 0..n {
                norm += new_centrality[v] * new_centrality[v];
                operations += 1;
            }
            norm = norm.sqrt();

            // Apply normalization and check convergence
            let mut diff = 0.0_f64;
            for v in 0..n {
                if norm > 0.0 {
                    new_centrality[v] /= norm;
                }
                diff += (new_centrality[v] - centrality[v]).abs();
                operations += 1;
            }

            // Check convergence
            if diff < tolerance {
                converged = true;
                log_debug_fields!("eigenvector_centrality", "Eigenvector centrality converged", fields!(
                    "iterations" => iter as i64,
                    "diff" => diff,
                ));
            }

            // Swap centrality and new_centrality
            std::mem::swap(&mut centrality, &mut new_centrality);

            work_done += n;

            // ============================================================
            // ✅ Sample based on progress
            // ============================================================
            if sample && work_done % sample_interval == 0 {
                let progress = (iter as f64 / max_iterations as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = (iter as f64 / max_iterations as f64) * 100.0;
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
        // ✅ Step 4: Calculate final statistics
        // ============================================================
        let max_centrality = centrality.iter().fold(0.0_f64, |a, &b| a.max(b));
        let _min_centrality = centrality.iter().fold(f64::MAX, |a, &b| a.min(b));
        let avg_centrality = if n > 0 {
            centrality.iter().sum::<f64>() / n as f64
        } else {
            0.0
        };

        // Find top 5 nodes
        let mut top_nodes: Vec<(usize, f64)> = centrality
            .iter()
            .enumerate()
            .map(|(i, &v)| (i, v))
            .collect();
        top_nodes.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let _top_5: Vec<(usize, f64)> = top_nodes.iter().take(5).map(|&(i, v)| (i, v)).collect();

        operations += 5 + n as u64; // Calculate statistics

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
            log_debug_fields!("eigenvector_centrality", "Eigenvector Centrality sampling completed", fields!(
                "vertices" => n as i64,
                "iterations" => iter as i64,
                "converged" => converged,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "avg_centrality" => avg_centrality,
                "max_centrality" => max_centrality,
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
impl EigenvectorCentrality {
    /// Get eigenvector centrality scores (for testing)
    pub fn get_centrality(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let max_iterations = 100;
        let tolerance = 1e-8;
        
        // Build adjacency matrix
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
            }
            adjacency.push(neighbors);
        }
        
        // Initial guess
        let mut centrality = vec![1.0 / (n as f64).sqrt(); n];
        let mut new_centrality = vec![0.0; n];
        
        let mut iter = 0;
        while iter < max_iterations {
            iter += 1;
            
            for v in 0..n {
                new_centrality[v] = 0.0;
            }
            
            for u in 0..n {
                let cu = centrality[u];
                for &v in &adjacency[u] {
                    new_centrality[v] += cu;
                }
            }
            
            // Normalize
            let mut norm = 0.0_f64;
            for v in 0..n {
                norm += new_centrality[v] * new_centrality[v];
            }
            norm = norm.sqrt();
            
            let mut diff = 0.0_f64;
            for v in 0..n {
                if norm > 0.0 {
                    new_centrality[v] /= norm;
                }
                diff += (new_centrality[v] - centrality[v]).abs();
            }
            
            std::mem::swap(&mut centrality, &mut new_centrality);
            
            if diff < tolerance {
                break;
            }
        }
        
        centrality
    }
}