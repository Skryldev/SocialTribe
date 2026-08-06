use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct Dijkstra;

impl AlgorithmRunner for Dijkstra {
    fn aliases(&self) -> &'static [&'static str] {
        &["dijkstra", "dijkstra's algorithm"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ FIX 1: Better sampling interval for Dijkstra
        // ============================================================
        let sample_interval = if sample {
            let target_points = std::cmp::min(200, std::cmp::max(10, n / 50));
            std::cmp::max(1, n / target_points)
        } else {
            n + 1
        };

        let mut dist = vec![u64::MAX; n];
        let mut visited = vec![false; n];
        let mut queue: Vec<(usize, u64)> = Vec::with_capacity(n);
        
        // ============================================================
        // ✅ FIX 2: Track cumulative operations correctly
        // ============================================================
        let mut operations: u64 = 0;
        let mut visited_nodes = 0usize;
        let mut iterations = 0usize;
        let mut samples = Vec::new();

        let start = Instant::now();

        // Start Dijkstra from vertex 0
        if n > 0 {
            dist[0] = 0;
            queue.push((0, 0));
            operations += 1; // Set dist[0]
            operations += 1; // Push to queue
            
            // Initial sample at 0% progress
            if sample {
                samples.push(MetricsPoint { 
                    x: 0.0, 
                    y: operations as f64 
                });
            }
        }

        while let Some(pos) = queue
            .iter()
            .enumerate()
            .min_by_key(|(_, (_, d))| d)
            .map(|(i, _)| i)
        {
            let (u, d_u) = queue.remove(pos);
            
            // Skip if already visited
            if visited[u] {
                continue;
            }
            
            visited[u] = true;
            visited_nodes += 1;
            iterations += 1;

            // ============================================================
            // ✅ FIX 3: Sample with cumulative operations count
            // ============================================================
            if sample && iterations % sample_interval == 0 {
                let progress = (iterations as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64
                });
            }

            // Process all edges
            for edge in &graph[u] {
                operations += 1; // Check edge
                let new_dist = d_u + edge.weight as u64;
                if new_dist < dist[edge.node] {
                    dist[edge.node] = new_dist;
                    queue.push((edge.node, new_dist));
                    operations += 1; // Update distance
                    operations += 1; // Push to queue
                }
            }
        }

        // ============================================================
        // ✅ FIX 4: Final sample with 100% progress
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
        // ✅ DEBUG: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("dijkstra", "Dijkstra sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "visited_nodes" => visited_nodes as i64,
            ));
        }

        // ============================================================
        // ✅ FIX 5: Use RunOutput::new() constructor
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            visited_nodes,
            samples,
        )
    }
}