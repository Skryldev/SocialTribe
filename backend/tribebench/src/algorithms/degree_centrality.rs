use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct DegreeCentrality;

impl AlgorithmRunner for DegreeCentrality {
    fn aliases(&self) -> &'static [&'static str] {
        &["degree-centrality", "degree", "dc"]
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
        // ✅ Step 1: Calculate degree for each node
        // ============================================================
        let mut degrees = vec![0_usize; n];
        
        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // Calculate in-degree + out-degree for undirected graphs
        for i in 0..n {
            degrees[i] = graph[i].len();
            operations += 1;
            
            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = ((i + 1) as f64 / n as f64) * 100.0;
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
        // ✅ Step 2: Calculate statistics
        // ============================================================
        let max_degree = degrees.iter().max().copied().unwrap_or(0);
        let _min_degree = degrees.iter().min().copied().unwrap_or(0);
        let sum_degree = degrees.iter().sum::<usize>();
        let avg_degree = if n > 0 {
            sum_degree as f64 / n as f64
        } else {
            0.0
        };

        // Normalize degree centrality (0-1 range)
        let max_possible_degree = if n > 1 { n - 1 } else { 1 };
        let _normalized_degrees: Vec<f64> = degrees
            .iter()
            .map(|&d| d as f64 / max_possible_degree as f64)
            .collect();

        operations += 5; // Calculate statistics

        // ============================================================
        // ✅ Step 3: Final sample with 100% progress
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
            log_debug_fields!("degree_centrality", "Degree Centrality sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "max_degree" => max_degree as i64,
                "avg_degree" => avg_degree,
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
impl DegreeCentrality {
    /// Get degree centrality scores (for testing)
    pub fn get_centrality(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let mut degrees = vec![0_usize; n];
        
        for i in 0..n {
            degrees[i] = graph[i].len();
        }
        
        let max_possible_degree = if n > 1 { n - 1 } else { 1 };
        degrees
            .iter()
            .map(|&d| d as f64 / max_possible_degree as f64)
            .collect()
    }

    /// Get raw degree values (for testing)
    pub fn get_raw_degrees(&self, graph: &[Vec<Edge>]) -> Vec<usize> {
        let n = graph.len();
        let mut degrees = vec![0_usize; n];
        
        for i in 0..n {
            degrees[i] = graph[i].len();
        }
        
        degrees
    }
}