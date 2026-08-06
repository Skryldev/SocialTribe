use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::HashMap;
use std::time::Instant;

pub struct Louvain;

impl AlgorithmRunner for Louvain {
    fn aliases(&self) -> &'static [&'static str] {
        &["louvain", "community-detection", "louvain-algorithm"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        let mut degrees = vec![0.0_f64; n];
        
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
                degrees[i] += 1.0;
                operations += 1;
            }
            adjacency.push(neighbors);
        }
        
        let total_edges = degrees.iter().sum::<f64>() / 2.0;

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let mut community: Vec<usize> = (0..n).collect();
        let mut community_weights: HashMap<usize, f64> = HashMap::new();
        for i in 0..n {
            community_weights.insert(i, degrees[i]);
            operations += 1;
        }

        let mut improved = true;
        let mut iteration = 0;
        let max_iterations = 100;

        let total_work = max_iterations * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        while improved && iteration < max_iterations {
            improved = false;
            iteration += 1;
            
            for node in 0..n {
                operations += 1;
                
                let current_comm = community[node];
                
                let mut neighbor_comms: HashMap<usize, f64> = HashMap::new();
                for &neighbor in &adjacency[node] {
                    let comm = community[neighbor];
                    *neighbor_comms.entry(comm).or_insert(0.0) += 1.0;
                    operations += 1;
                }
                
                if neighbor_comms.is_empty() || (neighbor_comms.len() == 1 && neighbor_comms.contains_key(&current_comm)) {
                    continue;
                }

                let mut best_comm = current_comm;
                let mut best_gain = 0.0_f64;
                
                let k_i = degrees[node];
                let sum_in = self.get_community_internal_edges(node, current_comm, &community, &adjacency, &mut operations);
                let sum_tot = community_weights.get(&current_comm).copied().unwrap_or(0.0);

                for (&comm, &edge_weight) in &neighbor_comms {
                    if comm == current_comm {
                        continue;
                    }
                    
                    let sum_in_comm = self.get_community_internal_edges(node, comm, &community, &adjacency, &mut operations);
                    let sum_tot_comm = community_weights.get(&comm).copied().unwrap_or(0.0);
                    
                    let gain = (sum_in_comm + edge_weight) / (2.0 * total_edges) 
                        - ((sum_tot_comm + k_i) / (2.0 * total_edges)).powi(2)
                        - (sum_in / (2.0 * total_edges) - (sum_tot / (2.0 * total_edges)).powi(2))
                        - (edge_weight / (2.0 * total_edges) - (k_i / (2.0 * total_edges)).powi(2));
                    
                    operations += 5;
                    
                    if gain > best_gain {
                        best_gain = gain;
                        best_comm = comm;
                    }
                }

                if best_comm != current_comm && best_gain > 1e-8 {
                    *community_weights.entry(current_comm).or_insert(0.0) -= degrees[node];
                    *community_weights.entry(best_comm).or_insert(0.0) += degrees[node];
                    
                    community[node] = best_comm;
                    improved = true;
                    operations += 2;
                }
            }

            work_done += n;

            if sample && work_done % sample_interval == 0 {
                let progress = (iteration as f64 / max_iterations as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if sample {
                let percent = (iteration as f64 / max_iterations as f64) * 100.0;
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

        let mut community_sizes: HashMap<usize, usize> = HashMap::new();
        for &comm in &community {
            *community_sizes.entry(comm).or_insert(0) += 1;
            operations += 1;
        }

        let num_communities = community_sizes.len();
        let avg_community_size = if num_communities > 0 {
            community_sizes.values().sum::<usize>() as f64 / num_communities as f64
        } else {
            0.0
        };
        
        let _max_community_size = community_sizes.values().max().copied().unwrap_or(0);
        let _min_community_size = community_sizes.values().min().copied().unwrap_or(0);

        let final_modularity = self.calculate_modularity(&community, &adjacency, total_edges, &mut operations);

        let mut community_list: Vec<(usize, usize)> = community_sizes.iter().map(|(&k, &v)| (k, v)).collect();
        community_list.sort_by(|a, b| b.1.cmp(&a.1));
        let _top_5: Vec<(usize, usize)> = community_list.iter().take(5).copied().collect();

        operations += 5 + n as u64;

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

        if sample {
            log_debug_fields!("louvain", "Louvain sampling completed", fields!(
                "vertices" => n as i64,
                "iterations" => iteration as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "num_communities" => num_communities as i64,
                "avg_community_size" => avg_community_size,
                "modularity" => final_modularity,
            ));
        }

        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

impl Louvain {
    fn get_community_internal_edges(
        &self,
        node: usize,
        comm: usize,
        community: &[usize],
        adjacency: &[Vec<usize>],
        operations: &mut u64,
    ) -> f64 {
        let mut internal_edges = 0.0_f64;
        
        for &neighbor in &adjacency[node] {
            *operations += 1;
            if community[neighbor] == comm {
                internal_edges += 1.0;
            }
        }
        
        internal_edges
    }

    fn calculate_modularity(
        &self,
        community: &[usize],
        adjacency: &[Vec<usize>],
        total_edges: f64,
        operations: &mut u64,
    ) -> f64 {
        let _n = community.len();
        let mut modularity = 0.0_f64;
        
        let mut comm_nodes: HashMap<usize, Vec<usize>> = HashMap::new();
        for (node, &comm) in community.iter().enumerate() {
            comm_nodes.entry(comm).or_insert_with(Vec::new).push(node);
            *operations += 1;
        }
        
        for nodes in comm_nodes.values() {
            let mut internal_edges = 0.0_f64;
            let mut total_degree = 0.0_f64;
            
            for &u in nodes {
                total_degree += adjacency[u].len() as f64;
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

#[cfg(test)]
impl Louvain {
    pub fn get_communities(&self, graph: &[Vec<Edge>]) -> Vec<usize> {
        let n = graph.len();
        let mut adjacency: Vec<Vec<usize>> = Vec::with_capacity(n);
        
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
            }
            adjacency.push(neighbors);
        }
        
        let mut community: Vec<usize> = (0..n).collect();
        let mut community_weights: HashMap<usize, f64> = HashMap::new();
        let mut degrees = vec![0.0_f64; n];
        
        for i in 0..n {
            degrees[i] = adjacency[i].len() as f64;
            community_weights.insert(i, degrees[i]);
        }
        
        let total_edges = degrees.iter().sum::<f64>() / 2.0;
        let mut improved = true;
        let max_iterations = 50;
        let mut iteration = 0;
        let mut ops = 0;
        
        while improved && iteration < max_iterations {
            improved = false;
            iteration += 1;
            
            for node in 0..n {
                let current_comm = community[node];
                let mut neighbor_comms: HashMap<usize, f64> = HashMap::new();
                
                for &neighbor in &adjacency[node] {
                    let comm = community[neighbor];
                    *neighbor_comms.entry(comm).or_insert(0.0) += 1.0;
                }
                
                if neighbor_comms.is_empty() || (neighbor_comms.len() == 1 && neighbor_comms.contains_key(&current_comm)) {
                    continue;
                }
                
                let mut best_comm = current_comm;
                let mut best_gain = 0.0_f64;
                
                let k_i = degrees[node];
                let sum_in = self.get_community_internal_edges(node, current_comm, &community, &adjacency, &mut ops);
                let sum_tot = community_weights.get(&current_comm).copied().unwrap_or(0.0);
                
                for (&comm, &edge_weight) in &neighbor_comms {
                    if comm == current_comm {
                        continue;
                    }
                    
                    let sum_in_comm = self.get_community_internal_edges(node, comm, &community, &adjacency, &mut ops);
                    let sum_tot_comm = community_weights.get(&comm).copied().unwrap_or(0.0);
                    
                    let gain = (sum_in_comm + edge_weight) / (2.0 * total_edges) 
                        - ((sum_tot_comm + k_i) / (2.0 * total_edges)).powi(2)
                        - (sum_in / (2.0 * total_edges) - (sum_tot / (2.0 * total_edges)).powi(2))
                        - (edge_weight / (2.0 * total_edges) - (k_i / (2.0 * total_edges)).powi(2));
                    
                    if gain > best_gain {
                        best_gain = gain;
                        best_comm = comm;
                    }
                }
                
                if best_comm != current_comm && best_gain > 1e-8 {
                    *community_weights.entry(current_comm).or_insert(0.0) -= degrees[node];
                    *community_weights.entry(best_comm).or_insert(0.0) += degrees[node];
                    
                    community[node] = best_comm;
                    improved = true;
                }
            }
        }
        
        community
    }
}