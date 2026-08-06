use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, log_warn, fields,
};
use std::time::Instant;

pub struct FloydWarshall;

impl AlgorithmRunner for FloydWarshall {
    fn aliases(&self) -> &'static [&'static str] {
        &["floyd-warshall", "floyd-warshall algorithm", "fw"]
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
        // ✅ Step 1: Initialize distance matrix
        // ============================================================
        let mut dist = vec![vec![i64::MAX; n]; n];
        
        for i in 0..n {
            dist[i][i] = 0;
            operations += 1;
            
            for edge in &graph[i] {
                let w = edge.weight as i64;
                if w < dist[i][edge.node] {
                    dist[i][edge.node] = w;
                }
                operations += 1;
            }
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Calculate total work for sampling
        // ============================================================
        let total_work = n * n * n; // Floyd-Warshall has O(V^3) complexity
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 10000));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0usize;
        let mut negative_cycle_detected = false;

        // ============================================================
        // ✅ Step 3: Floyd-Warshall main loop
        // ============================================================
        for k in 0..n {
            for i in 0..n {
                if dist[i][k] == i64::MAX {
                    work_done += n;
                    operations += n as u64;
                    continue;
                }
                
                for j in 0..n {
                    operations += 1; // Check edge
                    work_done += 1;
                    
                    if dist[k][j] == i64::MAX {
                        continue;
                    }
                    
                    let through_k = dist[i][k].saturating_add(dist[k][j]);
                    if through_k < dist[i][j] {
                        dist[i][j] = through_k;
                        operations += 1; // Update distance
                    }

                    // ============================================================
                    // ✅ Sample based on work done
                    // ============================================================
                    if sample && work_done % sample_interval == 0 {
                        let progress = (work_done as f64 / total_work as f64) * 100.0;
                        samples.push(MetricsPoint { 
                            x: progress, 
                            y: operations as f64
                        });
                    }
                }
            }

            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = ((k + 1) as f64 / n as f64) * 100.0;
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
        // ✅ Step 4: Check for negative cycles
        // ============================================================
        for i in 0..n {
            operations += 1;
            if dist[i][i] < 0 {
                negative_cycle_detected = true;
                log_warn!("floyd_warshall", &format!(
                    "Negative cycle detected in graph! dist[{}][{}] = {}",
                    i, i, dist[i][i]
                ));
                break;
            }
        }

        // ============================================================
        // ✅ Step 5: Calculate statistics
        // ============================================================
        let mut total_distance = 0_i64;
        let mut reachable_pairs = 0_usize;
        let mut max_distance = 0_i64;
        let mut min_distance = i64::MAX;

        for i in 0..n {
            for j in 0..n {
                operations += 1;
                if dist[i][j] != i64::MAX {
                    total_distance += dist[i][j];
                    reachable_pairs += 1;
                    if dist[i][j] > max_distance {
                        max_distance = dist[i][j];
                    }
                    if dist[i][j] < min_distance {
                        min_distance = dist[i][j];
                    }
                }
            }
        }

        let avg_distance = if reachable_pairs > 0 {
            total_distance as f64 / reachable_pairs as f64
        } else {
            0.0
        };

        // ============================================================
        // ✅ Step 6: Final sample with 100% progress
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
            log_debug_fields!("floyd_warshall", "Floyd-Warshall sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "reachable_pairs" => reachable_pairs as i64,
                "avg_distance" => avg_distance,
                "max_distance" => max_distance,
                "negative_cycle" => negative_cycle_detected,
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
// ✅ Helper functions for testing and analysis
// ============================================================

#[cfg(test)]
impl FloydWarshall {
    /// Get the distance matrix (for testing)
    pub fn get_distances(&self, graph: &[Vec<Edge>]) -> Vec<Vec<i64>> {
        let n = graph.len();
        let mut dist = vec![vec![i64::MAX; n]; n];
        
        for i in 0..n {
            dist[i][i] = 0;
            for edge in &graph[i] {
                let w = edge.weight as i64;
                if w < dist[i][edge.node] {
                    dist[i][edge.node] = w;
                }
            }
        }

        for k in 0..n {
            for i in 0..n {
                if dist[i][k] == i64::MAX {
                    continue;
                }
                for j in 0..n {
                    if dist[k][j] == i64::MAX {
                        continue;
                    }
                    let through_k = dist[i][k].saturating_add(dist[k][j]);
                    if through_k < dist[i][j] {
                        dist[i][j] = through_k;
                    }
                }
            }
        }
        
        dist
    }

    /// Check if there is a negative cycle
    pub fn has_negative_cycle(&self, graph: &[Vec<Edge>]) -> bool {
        let dist = self.get_distances(graph);
        for i in 0..graph.len() {
            if dist[i][i] < 0 {
                return true;
            }
        }
        false
    }
}