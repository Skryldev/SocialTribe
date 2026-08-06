use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;
use std::time::Instant;

// ============================================================
// ✅ Helper structures for A* priority queue
// ============================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct State {
    cost: u64,        // g(n) + h(n) = f(n)
    node: usize,
    g_cost: u64,      // g(n) = actual cost from start
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reverse order for min-heap (BinaryHeap is max-heap)
        other.cost.cmp(&self.cost)
            .then_with(|| self.node.cmp(&other.node))
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

// ============================================================
// ✅ A* Algorithm Implementation
// ============================================================

pub struct AStar;

impl AlgorithmRunner for AStar {
    fn aliases(&self) -> &'static [&'static str] {
        &["a-star", "astar", "a*"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // If graph is empty, return early
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        // Target is the last node
        let target = n - 1;
        
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
        // ✅ Step 1: Pre-compute heuristic (Euclidean distance approximation)
        // ============================================================
        let max_degree = graph.iter().map(|neighbors| neighbors.len()).max().unwrap_or(1);
        let heuristic = |node: usize| -> u64 {
            if node == target {
                return 0;
            }
            let remaining = (target - node) as f64;
            let avg_degree = max_degree as f64 / 2.0;
            (remaining * avg_degree) as u64
        };

        operations += n as u64; // Pre-compute heuristic

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: A* search
        // ============================================================
        let mut dist = vec![u64::MAX; n];
        let mut came_from = HashMap::new();
        let mut heap = BinaryHeap::new();
        let mut visited = vec![false; n];
        let mut visited_count = 0usize;

        dist[0] = 0;
        heap.push(State {
            cost: heuristic(0),
            node: 0,
            g_cost: 0,
        });
        operations += 3; // Initialize dist, heap, visited

        while let Some(State { cost: _, node, g_cost }) = heap.pop() {
            // Skip if already visited
            if visited[node] {
                continue;
            }

            visited[node] = true;
            visited_count += 1;
            operations += 1; // Mark visited

            // ============================================================
            // ✅ Step 3: Sample based on progress
            // ============================================================
            if sample && visited_count % sample_interval == 0 {
                let progress = (visited_count as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            // Check if we reached the target
            if node == target {
                // Reconstruct path (just for verification)
                let mut path_len = 0;
                let mut current = target;
                while let Some(&prev) = came_from.get(&current) {
                    path_len += 1;
                    current = prev;
                    operations += 1;
                }
                operations += 1;
                
                log_debug_fields!("a_star", "A* found path to target", fields!(
                    "path_length" => path_len as i64,
                    "visited_nodes" => visited_count as i64,
                ));
                break;
            }

            // Explore neighbors
            for edge in &graph[node] {
                operations += 1; // Check edge
                
                let next_node = edge.node;
                let next_g_cost = g_cost + edge.weight as u64;
                
                if next_g_cost < dist[next_node] {
                    dist[next_node] = next_g_cost;
                    came_from.insert(next_node, node);
                    operations += 2; // Update dist and came_from
                    
                    heap.push(State {
                        cost: next_g_cost + heuristic(next_node),
                        node: next_node,
                        g_cost: next_g_cost,
                    });
                    operations += 1; // Push to heap
                }
            }

            // Optional: Sample at 50% and 75% for better granularity
            if sample && visited_count == n / 2 {
                samples.push(MetricsPoint { 
                    x: 50.0, 
                    y: operations as f64 
                });
            }
            if sample && visited_count == (n * 3) / 4 {
                samples.push(MetricsPoint { 
                    x: 75.0, 
                    y: operations as f64 
                });
            }
        }

        // ============================================================
        // ✅ Step 4: Calculate final statistics
        // ============================================================
        let path_found = visited[target];
        let path_length = if path_found {
            let mut len = 0;
            let mut current = target;
            while let Some(&prev) = came_from.get(&current) {
                len += 1;
                current = prev;
            }
            len
        } else {
            0
        };

        operations += 1;

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
            log_debug_fields!("a_star", "A* sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "path_found" => path_found,
                "path_length" => path_length as i64,
                "visited_nodes" => visited_count as i64,
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            visited_count,
            samples,
        )
    }
}