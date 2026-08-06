use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::VecDeque;
use std::time::Instant;

pub struct ClosenessCentrality;

impl AlgorithmRunner for ClosenessCentrality {
    fn aliases(&self) -> &'static [&'static str] {
        &["closeness-centrality", "closeness", "cc"]
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
        // ✅ Step 1: Initialize centrality scores
        // ============================================================
        let mut centrality = vec![0.0_f64; n];
        let mut reachable_nodes = vec![0; n];

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
        let total_work = n * n; // BFS from each node
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        // ============================================================
        // ✅ Step 3: BFS from each node to calculate closeness
        // ============================================================
        for source in 0..n {
            // BFS to find shortest paths
            let mut visited = vec![false; n];
            let mut distance = vec![0; n];
            let mut queue = VecDeque::new();
            
            visited[source] = true;
            queue.push_back(source);
            operations += 2; // Mark visited + push to queue

            let mut total_distance: u64 = 0;
            let mut nodes_reached = 0;

            while let Some(current) = queue.pop_front() {
                nodes_reached += 1;
                
                for edge in &graph[current] {
                    operations += 1; // Check edge
                    if !visited[edge.node] {
                        visited[edge.node] = true;
                        distance[edge.node] = distance[current] + 1;
                        total_distance += distance[edge.node] as u64;
                        queue.push_back(edge.node);
                        operations += 2; // Mark visited + push to queue
                    }
                }
            }

            // ============================================================
            // ✅ Step 4: Calculate closeness centrality for this node
            // ============================================================
            if nodes_reached > 1 && total_distance > 0 {
                let reachable = (nodes_reached - 1) as f64;
                let raw_centrality = reachable / total_distance as f64;
                centrality[source] = raw_centrality * (nodes_reached - 1) as f64 / (n - 1) as f64;
                reachable_nodes[source] = nodes_reached - 1;
            } else {
                centrality[source] = 0.0;
                reachable_nodes[source] = 0;
            }

            operations += 2; // Calculate centrality

            work_done += n;

            // ============================================================
            // ✅ Sample based on progress
            // ============================================================
            if sample && work_done % sample_interval == 0 {
                let progress = ((source + 1) as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = ((source + 1) as f64 / n as f64) * 100.0;
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
        // ✅ Step 5: Calculate final statistics
        // ============================================================
        let avg_centrality = if n > 0 {
            centrality.iter().sum::<f64>() / n as f64
        } else {
            0.0
        };

        let max_centrality = centrality.iter().fold(0.0_f64, |a, &b| a.max(b));
        let _min_centrality = centrality.iter().fold(f64::MAX, |a, &b| a.min(b));

        operations += 3; // Calculate stats

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
            log_debug_fields!("closeness_centrality", "Closeness Centrality sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
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
impl ClosenessCentrality {
    /// Get closeness centrality scores (for testing)
    pub fn get_centrality(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let mut centrality = vec![0.0_f64; n];
        let mut ops = 0;

        for source in 0..n {
            let mut visited = vec![false; n];
            let mut distance = vec![0; n];
            let mut queue = VecDeque::new();
            
            visited[source] = true;
            queue.push_back(source);

            let mut total_distance: u64 = 0;
            let mut nodes_reached = 0;

            while let Some(current) = queue.pop_front() {
                nodes_reached += 1;
                
                for edge in &graph[current] {
                    ops += 1;
                    if !visited[edge.node] {
                        visited[edge.node] = true;
                        distance[edge.node] = distance[current] + 1;
                        total_distance += distance[edge.node] as u64;
                        queue.push_back(edge.node);
                    }
                }
            }

            if nodes_reached > 1 && total_distance > 0 {
                let reachable = (nodes_reached - 1) as f64;
                let raw_centrality = reachable / total_distance as f64;
                centrality[source] = raw_centrality * (nodes_reached - 1) as f64 / (n - 1) as f64;
            } else {
                centrality[source] = 0.0;
            }
        }

        centrality
    }
}