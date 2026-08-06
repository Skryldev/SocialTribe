use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct Dfs;

impl AlgorithmRunner for Dfs {
    fn aliases(&self) -> &'static [&'static str] {
        &["dfs", "depth-first search"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ FIX 1: Better sampling interval - consistent with BFS
        // ============================================================
        let sample_interval = if sample {
            let target_points = std::cmp::min(200, std::cmp::max(10, n / 50));
            std::cmp::max(1, n / target_points)
        } else {
            n + 1
        };

        let mut visited = vec![false; n];
        let mut stack = Vec::with_capacity(n);
        
        // ============================================================
        // ✅ FIX 2: Track cumulative operations correctly
        // ============================================================
        let mut operations: u64 = 0;
        let mut visited_nodes = 0usize;
        let mut iterations = 0usize;
        let mut samples = Vec::new();

        let start = Instant::now();

        // Start DFS from vertex 0
        if n > 0 {
            visited[0] = true;
            stack.push(0usize);
            operations += 1; // Mark visited
            operations += 1; // Push to stack
            
            // Initial sample at 0% progress
            if sample {
                samples.push(MetricsPoint { 
                    x: 0.0, 
                    y: operations as f64 
                });
            }
        }

        while let Some(vertex) = stack.pop() {
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
            for edge in &graph[vertex] {
                operations += 1; // Check edge
                if !visited[edge.node] {
                    visited[edge.node] = true;
                    stack.push(edge.node);
                    operations += 1; // Mark visited
                    operations += 1; // Push to stack
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
            log_debug_fields!("dfs", "DFS sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
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