use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::{HashMap, VecDeque};
use std::time::Instant;

pub struct GirvanNewman;

impl AlgorithmRunner for GirvanNewman {
    fn aliases(&self) -> &'static [&'static str] {
        &["girvan-newman", "gn", "girvan-newman-algorithm"]
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
        // ✅ Step 1: Build adjacency list (mutable copy of graph)
        // ============================================================
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
                operations += 1;
            }
            adjacency.push(neighbors);
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Girvan-Newman algorithm
        // ============================================================
        let max_iterations = n;
        let mut communities: Vec<Vec<usize>> = Vec::new();

        let total_work = max_iterations * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut iter = 0;

        while iter < max_iterations {
            iter += 1;
            operations += 1;

            let edge_betweenness = self.calculate_edge_betweenness(&adjacency, &mut operations);
            
            if edge_betweenness.is_empty() {
                break;
            }

            let max_betweenness = edge_betweenness
                .values()
                .fold(0.0_f64, |max, &val| if val > max { val } else { max });

            if max_betweenness < 1e-8 {
                break;
            }

            let edges_to_remove: Vec<(usize, usize)> = edge_betweenness
                .iter()
                .filter(|(_, &v)| v == max_betweenness)
                .map(|(&(u, v), _)| (u, v))
                .collect();

            for (u, v) in &edges_to_remove {
                operations += 1;
                adjacency[*u].retain(|&x| x != *v);
                adjacency[*v].retain(|&x| x != *u);
            }

            let components = self.find_connected_components(&adjacency, &mut operations);
            
            if components.len() > 1 {
                communities = components.clone();
            }

            if sample && work_done % sample_interval == 0 {
                let progress = (iter as f64 / max_iterations as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if sample {
                let percent = (iter as f64 / max_iterations as f64) * 100.0;
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

            work_done += n;

            if adjacency.iter().all(|neighbors| neighbors.is_empty()) {
                break;
            }
        }

        // ============================================================
        // ✅ Step 3: Calculate final statistics
        // ============================================================
        let num_communities = communities.len();
        let community_sizes: Vec<usize> = communities.iter().map(|c| c.len()).collect();
        
        let avg_community_size = if num_communities > 0 {
            community_sizes.iter().sum::<usize>() as f64 / num_communities as f64
        } else {
            0.0
        };
        
        let _max_community_size = community_sizes.iter().max().copied().unwrap_or(0);
        let _min_community_size = community_sizes.iter().min().copied().unwrap_or(0);

        let modularity = self.calculate_modularity(&communities, &adjacency, &mut operations);

        operations += 5 + n as u64;

        // ============================================================
        // ✅ Step 4: Final sample with 100% progress
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
            log_debug_fields!("girvan_newman", "Girvan-Newman sampling completed", fields!(
                "vertices" => n as i64,
                "iterations" => iter as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "num_communities" => num_communities as i64,
                "avg_community_size" => avg_community_size,
                "modularity" => modularity,
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

impl GirvanNewman {
    fn calculate_edge_betweenness(
        &self,
        adjacency: &[Vec<usize>],
        operations: &mut u64,
    ) -> HashMap<(usize, usize), f64> {
        let n = adjacency.len();
        let mut edge_betweenness: HashMap<(usize, usize), f64> = HashMap::new();

        for source in 0..n {
            *operations += 1;

            let mut dist = vec![-1_i64; n];
            let mut paths = vec![0.0_f64; n];
            let mut predecessors = vec![Vec::new(); n];
            let mut queue = VecDeque::new();

            dist[source] = 0;
            paths[source] = 1.0;
            queue.push_back(source);
            *operations += 3;

            while let Some(u) = queue.pop_front() {
                *operations += 1;
                for &v in &adjacency[u] {
                    *operations += 1;
                    if dist[v] < 0 {
                        dist[v] = dist[u] + 1;
                        queue.push_back(v);
                        *operations += 1;
                    }
                    if dist[v] == dist[u] + 1 {
                        paths[v] += paths[u];
                        predecessors[v].push(u);
                        *operations += 1;
                    }
                }
            }

            let mut dependency = vec![0.0_f64; n];
            let mut order: Vec<usize> = (0..n).collect();
            order.sort_by_key(|&v| -dist[v]);

            for &v in &order {
                if v == source {
                    continue;
                }
                for &pred in &predecessors[v] {
                    *operations += 1;
                    let contrib = (paths[pred] / paths[v]) * (1.0 + dependency[v]);
                    dependency[pred] += contrib;
                    *operations += 1;

                    let edge = if pred < v { (pred, v) } else { (v, pred) };
                    *edge_betweenness.entry(edge).or_insert(0.0) += contrib;
                }
            }
        }

        for value in edge_betweenness.values_mut() {
            *value /= 2.0;
            *operations += 1;
        }

        edge_betweenness
    }

    fn find_connected_components(
        &self,
        adjacency: &[Vec<usize>],
        operations: &mut u64,
    ) -> Vec<Vec<usize>> {
        let n = adjacency.len();
        let mut visited = vec![false; n];
        let mut components = Vec::new();

        for i in 0..n {
            *operations += 1;
            if !visited[i] {
                let mut component = Vec::new();
                let mut stack = vec![i];
                visited[i] = true;

                while let Some(node) = stack.pop() {
                    *operations += 1;
                    component.push(node);
                    for &neighbor in &adjacency[node] {
                        *operations += 1;
                        if !visited[neighbor] {
                            visited[neighbor] = true;
                            stack.push(neighbor);
                            *operations += 1;
                        }
                    }
                }
                components.push(component);
            }
        }

        components
    }

    fn calculate_modularity(
        &self,
        communities: &[Vec<usize>],
        adjacency: &[Vec<usize>],
        operations: &mut u64,
    ) -> f64 {
        let n = adjacency.len();
        let mut degrees = vec![0.0_f64; n];
        for i in 0..n {
            degrees[i] = adjacency[i].len() as f64;
            *operations += 1;
        }

        let total_edges = degrees.iter().sum::<f64>() / 2.0;
        if total_edges == 0.0 {
            return 0.0;
        }

        let mut modularity = 0.0_f64;
        let mut comm_nodes: HashMap<usize, Vec<usize>> = HashMap::new();

        for (comm_id, nodes) in communities.iter().enumerate() {
            for &node in nodes {
                comm_nodes.entry(comm_id).or_insert_with(Vec::new).push(node);
                *operations += 1;
            }
        }

        for nodes in comm_nodes.values() {
            let mut internal_edges = 0.0_f64;
            let mut total_degree = 0.0_f64;

            for &u in nodes {
                total_degree += degrees[u];
                for &v in nodes {
                    *operations += 1;
                    if adjacency[u].contains(&v) {
                        internal_edges += 1.0;
                    }
                }
            }

            let m = total_edges;
            modularity += (internal_edges / m) - (total_degree / (2.0 * m)).powi(2);
            *operations += 3;
        }

        modularity
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl GirvanNewman {
    pub fn get_communities(&self, graph: &[Vec<Edge>]) -> Vec<Vec<usize>> {
        let n = graph.len();
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
            }
            adjacency.push(neighbors);
        }

        let max_iterations = n;
        let mut communities: Vec<Vec<usize>> = Vec::new();
        let mut ops = 0;

        for _ in 0..max_iterations {
            let edge_betweenness = self.calculate_edge_betweenness(&adjacency, &mut ops);
            
            if edge_betweenness.is_empty() {
                break;
            }

            let max_betweenness = edge_betweenness
                .values()
                .fold(0.0_f64, |max, &val| if val > max { val } else { max });

            if max_betweenness < 1e-8 {
                break;
            }

            let edges_to_remove: Vec<(usize, usize)> = edge_betweenness
                .iter()
                .filter(|(_, &v)| v == max_betweenness)
                .map(|(&(u, v), _)| (u, v))
                .collect();

            for (u, v) in &edges_to_remove {
                adjacency[*u].retain(|&x| x != *v);
                adjacency[*v].retain(|&x| x != *u);
            }

            let components = self.find_connected_components(&adjacency, &mut ops);
            if components.len() > 1 {
                communities = components.clone();
            }

            if adjacency.iter().all(|neighbors| neighbors.is_empty()) {
                break;
            }
        }

        communities
    }
}