use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, log_warn, fields,
};
use std::collections::BinaryHeap;
use std::cmp::Ordering;
use std::time::Instant;

// ============================================================
// ✅ Helper structures for priority queue
// ============================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct State {
    cost: u64,
    node: usize,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
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
// ✅ Johnson Algorithm Implementation
// ============================================================

pub struct Johnson;

impl AlgorithmRunner for Johnson {
    fn aliases(&self) -> &'static [&'static str] {
        &["johnson", "johnson-algorithm", "johnsons-algorithm"]
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
        // ✅ Step 1: Add a new source node connected to all nodes with weight 0
        // ============================================================
        let mut augmented_graph = graph.to_vec();
        let source = n;
        
        let zero_edges: Vec<Edge> = (0..n).map(|i| Edge { node: i, weight: 0 }).collect();
        augmented_graph.push(zero_edges);
        
        operations += n as u64;

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Run Bellman-Ford from source to compute potentials
        // ============================================================
        let (potentials, negative_cycle) = self.bellman_ford_potentials(&augmented_graph, source);
        
        if negative_cycle {
            log_warn!("johnson", "Negative cycle detected in graph! Johnson's algorithm cannot proceed.");
            let time_ms = start.elapsed().as_secs_f64() * 1000.0;
            return RunOutput::new(time_ms, operations, 0, samples);
        }

        operations += n as u64;

        // ============================================================
        // ✅ Step 3: Re-weight edges
        // ============================================================
        let mut reweighted_graph = Vec::with_capacity(n);
        for u in 0..n {
            let mut edges = Vec::with_capacity(graph[u].len());
            for edge in &graph[u] {
                let v = edge.node;
                let new_weight = edge.weight as i64 + potentials[u] - potentials[v];
                let weight_u32 = if new_weight < 0 {
                    0
                } else {
                    new_weight as u32
                };
                edges.push(Edge { 
                    node: v, 
                    weight: weight_u32 
                });
                operations += 1;
            }
            reweighted_graph.push(edges);
        }

        // ============================================================
        // ✅ Step 4: Run Dijkstra from each node to find all-pairs shortest paths
        // ============================================================
        let mut all_distances = Vec::with_capacity(n);
        let mut total_reachable = 0_usize;
        let mut total_distance = 0_i64;

        let total_work = n * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        for src in 0..n {
            let distances = self.dijkstra(&reweighted_graph, src, &mut operations);
            
            let mut original_distances = Vec::with_capacity(n);
            for v in 0..n {
                if distances[v] == u64::MAX {
                    original_distances.push(i64::MAX);
                } else {
                    let original_dist = distances[v] as i64 - potentials[src] + potentials[v];
                    original_distances.push(original_dist);
                    if original_dist != i64::MAX {
                        total_distance += original_dist;
                        total_reachable += 1;
                    }
                }
                operations += 1;
            }
            all_distances.push(original_distances);

            work_done += n;

            if sample && work_done % sample_interval == 0 {
                let progress = ((src + 1) as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if sample {
                let percent = ((src + 1) as f64 / n as f64) * 100.0;
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

        let _avg_distance = if total_reachable > 0 {
            total_distance as f64 / total_reachable as f64
        } else {
            0.0
        };

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
            log_debug_fields!("johnson", "Johnson's algorithm sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "sample_interval" => sample_interval as i64,
                "total_ops" => operations as i64,
                "reachable_pairs" => total_reachable as i64,
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

impl Johnson {
    fn bellman_ford_potentials(&self, graph: &[Vec<Edge>], source: usize) -> (Vec<i64>, bool) {
        let n = graph.len();
        let mut dist = vec![i64::MAX; n];
        dist[source] = 0;

        let mut edges = Vec::new();
        for (u, neighbors) in graph.iter().enumerate() {
            for edge in neighbors {
                edges.push((u, edge.node, edge.weight as i64));
            }
        }

        for _ in 0..n.saturating_sub(1) {
            let mut updated = false;
            for &(u, v, w) in &edges {
                if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                    dist[v] = dist[u] + w;
                    updated = true;
                }
            }
            if !updated {
                break;
            }
        }

        for &(u, v, w) in &edges {
            if dist[u] != i64::MAX && dist[u] + w < dist[v] {
                return (dist, true);
            }
        }

        (dist, false)
    }

    fn dijkstra(&self, graph: &[Vec<Edge>], src: usize, operations: &mut u64) -> Vec<u64> {
        let n = graph.len();
        let mut dist = vec![u64::MAX; n];
        let mut heap = BinaryHeap::new();

        dist[src] = 0;
        heap.push(State { cost: 0, node: src });
        *operations += 1;

        while let Some(State { cost, node }) = heap.pop() {
            if cost > dist[node] {
                continue;
            }

            for edge in &graph[node] {
                *operations += 1;
                let next_cost = cost + edge.weight as u64;
                if next_cost < dist[edge.node] {
                    dist[edge.node] = next_cost;
                    heap.push(State { cost: next_cost, node: edge.node });
                    *operations += 1;
                }
            }
        }

        dist
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl Johnson {
    pub fn get_distances(&self, graph: &[Vec<Edge>]) -> Vec<Vec<i64>> {
        let n = graph.len();
        
        if n == 0 {
            return Vec::new();
        }

        let mut augmented_graph = graph.to_vec();
        let source = n;
        let zero_edges: Vec<Edge> = (0..n).map(|i| Edge { node: i, weight: 0 }).collect();
        augmented_graph.push(zero_edges);

        let (potentials, negative_cycle) = self.bellman_ford_potentials(&augmented_graph, source);
        
        if negative_cycle {
            return vec![vec![i64::MAX; n]; n];
        }

        let mut reweighted_graph = Vec::with_capacity(n);
        for u in 0..n {
            let mut edges = Vec::with_capacity(graph[u].len());
            for edge in &graph[u] {
                let v = edge.node;
                let new_weight = edge.weight as i64 + potentials[u] - potentials[v];
                let weight_u32 = if new_weight < 0 { 0 } else { new_weight as u32 };
                edges.push(Edge { node: v, weight: weight_u32 });
            }
            reweighted_graph.push(edges);
        }

        let mut all_distances = Vec::with_capacity(n);
        let mut ops = 0;

        for src in 0..n {
            let dist = self.dijkstra(&reweighted_graph, src, &mut ops);
            let mut original = Vec::with_capacity(n);
            for v in 0..n {
                if dist[v] == u64::MAX {
                    original.push(i64::MAX);
                } else {
                    original.push(dist[v] as i64 - potentials[src] + potentials[v]);
                }
            }
            all_distances.push(original);
        }

        all_distances
    }

    pub fn has_negative_cycle(&self, graph: &[Vec<Edge>]) -> bool {
        let n = graph.len();
        let mut augmented_graph = graph.to_vec();
        let source = n;
        let zero_edges: Vec<Edge> = (0..n).map(|i| Edge { node: i, weight: 0 }).collect();
        augmented_graph.push(zero_edges);

        let (_, negative_cycle) = self.bellman_ford_potentials(&augmented_graph, source);
        negative_cycle
    }
}