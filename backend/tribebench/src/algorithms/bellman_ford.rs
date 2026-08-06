use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, log_warn, fields,
};
use std::time::Instant;

pub struct BellmanFord;

impl AlgorithmRunner for BellmanFord {
    fn aliases(&self) -> &'static [&'static str] {
        &["bellman-ford", "bellman-ford algorithm", "bf"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Build edges list with proper operation counting
        // ============================================================
        let edges: Vec<(usize, usize, i64)> = graph
            .iter()
            .enumerate()
            .flat_map(|(u, neighbors)| neighbors.iter().map(move |e| (u, e.node, e.weight as i64)))
            .collect();
        
        let edge_count = edges.len();

        let mut dist = vec![i64::MAX; n];
        let mut operations: u64 = 0;
        let _iterations = 0usize;
        let mut samples = Vec::new();

        let start = Instant::now();

        // Initialize
        if n > 0 {
            dist[0] = 0;
            operations += 1; // Set dist[0]
            
            // Initial sample at 0% progress
            if sample {
                samples.push(MetricsPoint { 
                    x: 0.0, 
                    y: operations as f64 
                });
            }
        }

        // ============================================================
        // ✅ Sampling for Bellman-Ford
        // ============================================================
        let total_work = n.saturating_sub(1) * edge_count;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 1000));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0usize;
        let mut relaxed_edges = 0usize;
        let mut negative_cycle_detected = false;

        // ============================================================
        // ✅ Bellman-Ford main loop with cumulative operations
        // ============================================================
        for iteration in 0..n.saturating_sub(1) {
            let mut updated = false;
            
            for &(u, v, w) in &edges {
                operations += 1; // Check edge
                work_done += 1;
                
                if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                    dist[v] = dist[u] + w;
                    updated = true;
                    relaxed_edges += 1;
                    operations += 1; // Update distance
                }

                // ============================================================
                // ✅ Sample based on work done
                // ============================================================
                if sample && work_done % sample_interval == 0 {
                    let progress = ((iteration * edge_count + work_done) as f64 / total_work as f64) * 100.0;
                    samples.push(MetricsPoint { 
                        x: progress, 
                        y: operations as f64
                    });
                }
            }
            
            // Early termination if no updates
            if !updated {
                log_debug_fields!("bellman_ford", "Bellman-Ford converged early", fields!(
                    "iteration" => (iteration + 1) as i64,
                ));
                break;
            }
            
            // Sample at 50% and 75% for better granularity
            if sample && iteration == (n.saturating_sub(1)) / 2 {
                let progress = 50.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
            if sample && iteration == (n.saturating_sub(1)) * 3 / 4 {
                let progress = 75.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }
        }

        // ============================================================
        // ✅ Check for negative cycles
        // ============================================================
        for &(u, v, w) in &edges {
            operations += 1;
            if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                negative_cycle_detected = true;
                log_warn!("bellman_ford", "Negative cycle detected in graph!");
                break;
            }
        }

        // ============================================================
        // ✅ Final sample with 100% progress
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
        // ✅ Calculate statistics
        // ============================================================
        let reachable_nodes = dist.iter().filter(|&&d| d != i64::MAX).count();
        let _avg_distance = if reachable_nodes > 0 {
            let sum: i64 = dist.iter().filter(|&&d| d != i64::MAX).sum();
            sum as f64 / reachable_nodes as f64
        } else {
            0.0
        };

        // ============================================================
        // ✅ Debug: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("bellman_ford", "Bellman-Ford sampling completed", fields!(
                "vertices" => n as i64,
                "edges" => edge_count as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "relaxed_edges" => relaxed_edges as i64,
                "reachable_nodes" => reachable_nodes as i64,
                "negative_cycle" => negative_cycle_detected,
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            reachable_nodes,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper function to check for negative cycles (exposed for testing)
// ============================================================

#[cfg(test)]
impl BellmanFord {
    pub fn has_negative_cycle(&self, graph: &[Vec<Edge>]) -> bool {
        let n = graph.len();
        let edges: Vec<(usize, usize, i64)> = graph
            .iter()
            .enumerate()
            .flat_map(|(u, neighbors)| neighbors.iter().map(move |e| (u, e.node, e.weight as i64)))
            .collect();

        let mut dist = vec![i64::MAX; n];
        dist[0] = 0;

        // Relax edges V-1 times
        for _ in 0..n.saturating_sub(1) {
            let mut updated = false;
            for &(u, v, w) in &edges {
                if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                    dist[v] = dist[u] + w;
                    updated = true;
                }
            }
            if !updated {
                return false;
            }
        }

        // Check for negative cycles
        for &(u, v, w) in &edges {
            if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                return true;
            }
        }
        false
    }
}