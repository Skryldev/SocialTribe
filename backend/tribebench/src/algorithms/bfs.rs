use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct Bfs;

impl AlgorithmRunner for Bfs {
    fn aliases(&self) -> &'static [&'static str] {
        &["bfs", "breadth-first search"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ FIX 1: Better sampling interval - more granular for large graphs
        // ============================================================
        let sample_interval = if sample {
            let target_points = std::cmp::min(200, std::cmp::max(10, n / 50));
            std::cmp::max(1, n / target_points)
        } else {
            n + 1 // No sampling
        };

        let mut visited = vec![false; n];
        let mut queue = Vec::with_capacity(n);
        let mut head = 0;
        
        // ============================================================
        // ✅ FIX 2: Track cumulative operations correctly
        // ============================================================
        let mut operations: u64 = 0;
        let mut iterations = 0usize;
        let mut samples = Vec::new();

        let start = Instant::now();

        // Start BFS from vertex 0
        if n > 0 {
            visited[0] = true;
            queue.push(0usize);
            operations += 1; // Mark visited
            operations += 1; // Push to queue
            
            // Initial sample at 0% progress
            if sample {
                samples.push(MetricsPoint { 
                    x: 0.0, 
                    y: operations as f64 
                });
            }
        }

        while head < queue.len() {
            let vertex = queue[head];
            head += 1;
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
            for edge in &graph[vertex] {
                operations += 1; // Check edge
                if !visited[edge.node] {
                    visited[edge.node] = true;
                    queue.push(edge.node);
                    operations += 1; // Mark visited
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

        // ============================================================
        // ✅ FIX 5: Calculate accurate visited nodes count
        // ============================================================
        let visited_nodes = queue.len();

        // ============================================================
        // ✅ DEBUG: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("bfs", "BFS sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
            ));
        }

        // ============================================================
        // ✅ FIX 6: Use RunOutput::new() constructor
        // ============================================================
        RunOutput::new(
            start.elapsed().as_secs_f64() * 1000.0,
            operations,
            visited_nodes,
            samples,
        )
    }
}