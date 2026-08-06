use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::VecDeque;
use std::time::Instant;

pub struct BetweennessCentrality;

impl AlgorithmRunner for BetweennessCentrality {
    fn aliases(&self) -> &'static [&'static str] {
        &["betweenness-centrality", "betweenness", "bc"]
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
        // ✅ Step 1: Initialize betweenness scores
        // ============================================================
        let mut betweenness = vec![0.0_f64; n];

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
        let total_work = n * (n - 1); // BFS from each node
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        // ============================================================
        // ✅ Step 3: For each source node, run BFS and accumulate betweenness
        // ============================================================
        for source in 0..n {
            // BFS from source
            let (distances, predecessors, sp_count) = self.bfs_shortest_paths(graph, source, &mut operations);
            
            // Accumulate betweenness using dependency accumulation
            let dependency = self.accumulate_dependencies(&distances, &predecessors, &sp_count, source, &mut operations);
            
            // Add dependency to betweenness
            for v in 0..n {
                if v != source {
                    betweenness[v] += dependency[v];
                }
            }

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
        // ✅ Step 4: Normalize betweenness scores
        // ============================================================
        let normalization = if n > 2 {
            ((n - 1) * (n - 2)) as f64
        } else {
            1.0
        };

        let max_betweenness = betweenness
            .iter()
            .fold(0.0_f64, |max, &val| max.max(val));

        // Normalize scores
        for v in 0..n {
            operations += 1;
            if normalization > 0.0 {
                betweenness[v] /= normalization;
            }
        }

        // Calculate statistics
        let avg_betweenness = if n > 0 {
            betweenness.iter().sum::<f64>() / n as f64
        } else {
            0.0
        };

        let _max_betweenness = max_betweenness / normalization;
        let _min_betweenness = betweenness
            .iter()
            .fold(f64::MAX, |min, &val| min.min(val));

        operations += 3;

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
            log_debug_fields!("betweenness_centrality", "Betweenness Centrality sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "avg_betweenness" => avg_betweenness,
                "max_betweenness" => max_betweenness / normalization,
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

impl BetweennessCentrality {
    /// BFS to find shortest paths from source
    fn bfs_shortest_paths(
        &self,
        graph: &[Vec<Edge>],
        source: usize,
        operations: &mut u64,
    ) -> (Vec<i64>, Vec<Vec<usize>>, Vec<f64>) {
        let n = graph.len();
        
        // Distance from source
        let mut dist = vec![-1_i64; n];
        dist[source] = 0;
        *operations += 1;

        // Number of shortest paths from source to each node
        let mut sp_count = vec![0.0_f64; n];
        sp_count[source] = 1.0;
        *operations += 1;

        // Predecessors on shortest paths
        let mut predecessors = vec![Vec::new(); n];

        // BFS queue
        let mut queue = VecDeque::new();
        queue.push_back(source);
        *operations += 1;

        while let Some(v) = queue.pop_front() {
            *operations += 1;

            for edge in &graph[v] {
                *operations += 1; // Check edge
                let w = edge.node;

                // First time visiting w
                if dist[w] < 0 {
                    dist[w] = dist[v] + 1;
                    queue.push_back(w);
                    *operations += 1;
                }

                // If w is on a shortest path from source
                if dist[w] == dist[v] + 1 {
                    sp_count[w] += sp_count[v];
                    predecessors[w].push(v);
                    *operations += 1;
                }
            }
        }

        (dist, predecessors, sp_count)
    }

    /// Accumulate dependencies for betweenness centrality
    fn accumulate_dependencies(
        &self,
        dist: &[i64],
        predecessors: &[Vec<usize>],
        sp_count: &[f64],
        source: usize,
        operations: &mut u64,
    ) -> Vec<f64> {
        let n = dist.len();
        let mut dependency = vec![0.0_f64; n];

        // Get vertices sorted by distance descending
        let mut order: Vec<usize> = (0..n).collect();
        order.sort_by_key(|&v| -dist[v]);

        for &v in &order {
            if v == source {
                continue;
            }

            for &pred in &predecessors[v] {
                *operations += 1;
                let contrib = (sp_count[pred] / sp_count[v]) * (1.0 + dependency[v]);
                dependency[pred] += contrib;
                *operations += 1;
            }
        }

        dependency
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl BetweennessCentrality {
    /// Get betweenness scores (for testing)
    pub fn get_betweenness(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let mut betweenness = vec![0.0_f64; n];
        let mut ops = 0;

        for source in 0..n {
            let (dist, pred, sp_count) = self.bfs_shortest_paths(graph, source, &mut ops);
            let dependency = self.accumulate_dependencies(&dist, &pred, &sp_count, source, &mut ops);
            
            for v in 0..n {
                if v != source {
                    betweenness[v] += dependency[v];
                }
            }
        }

        // Normalize
        let normalization = if n > 2 {
            ((n - 1) * (n - 2)) as f64
        } else {
            1.0
        };

        for v in 0..n {
            betweenness[v] /= normalization;
        }

        betweenness
    }
}