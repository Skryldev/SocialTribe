use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::{HashMap, HashSet};
use std::time::Instant;

pub struct TriangleDetection;

impl AlgorithmRunner for TriangleDetection {
    fn aliases(&self) -> &'static [&'static str] {
        &["triangle-detection", "triangles", "td"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
                operations += 1;
            }
            adjacency_sets.push(set);
        }

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let mut vertex_order: Vec<usize> = (0..n).collect();
        vertex_order.sort_by_key(|&v| adjacency_sets[v].len());
        
        operations += n as u64;

        let mut triangles: Vec<(usize, usize, usize)> = Vec::new();
        let mut total_triangles = 0_usize;
        
        let mut oriented: HashSet<(usize, usize, usize)> = HashSet::new();
        
        let total_work = n * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        for i in 0..n {
            operations += 1;
            
            let neighbors_i: Vec<usize> = adjacency_sets[i].iter().copied().collect();
            
            for j in 0..neighbors_i.len() {
                for k in (j + 1)..neighbors_i.len() {
                    operations += 1;
                    work_done += 1;
                    
                    let u = neighbors_i[j];
                    let v = neighbors_i[k];
                    
                    if adjacency_sets[u].contains(&v) {
                        let mut triangle = [i, u, v];
                        triangle.sort();
                        
                        if !oriented.contains(&(triangle[0], triangle[1], triangle[2])) {
                            oriented.insert((triangle[0], triangle[1], triangle[2]));
                            triangles.push((triangle[0], triangle[1], triangle[2]));
                            total_triangles += 1;
                            operations += 1;
                        }
                    }
                }
            }

            if sample && work_done % sample_interval == 0 {
                let progress = ((i + 1) as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if sample {
                let percent = ((i + 1) as f64 / n as f64) * 100.0;
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

        let mut triangle_counts: HashMap<usize, usize> = HashMap::new();
        for (a, b, c) in &triangles {
            *triangle_counts.entry(*a).or_insert(0) += 1;
            *triangle_counts.entry(*b).or_insert(0) += 1;
            *triangle_counts.entry(*c).or_insert(0) += 1;
            operations += 3;
        }

        let max_triangles = triangle_counts.values().max().copied().unwrap_or(0);
        let avg_triangles = if n > 0 {
            triangle_counts.values().sum::<usize>() as f64 / n as f64
        } else {
            0.0
        };

        let mut top_nodes: Vec<(usize, usize)> = triangle_counts.iter().map(|(&k, &v)| (k, v)).collect();
        top_nodes.sort_by(|a, b| b.1.cmp(&a.1));
        let _top_5: Vec<(usize, usize)> = top_nodes.iter().take(5).copied().collect();

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
            log_debug_fields!("triangle_detection", "Triangle Detection sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "total_triangles" => total_triangles as i64,
                "avg_triangles" => avg_triangles,
                "max_triangles" => max_triangles as i64,
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

#[cfg(test)]
impl TriangleDetection {
    pub fn get_triangles(&self, graph: &[Vec<Edge>]) -> Vec<(usize, usize, usize)> {
        let n = graph.len();
        
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
            }
            adjacency_sets.push(set);
        }
        
        let mut triangles: Vec<(usize, usize, usize)> = Vec::new();
        let mut oriented: HashSet<(usize, usize, usize)> = HashSet::new();
        
        for i in 0..n {
            let neighbors_i: Vec<usize> = adjacency_sets[i].iter().copied().collect();
            
            for j in 0..neighbors_i.len() {
                for k in (j + 1)..neighbors_i.len() {
                    let u = neighbors_i[j];
                    let v = neighbors_i[k];
                    
                    if adjacency_sets[u].contains(&v) {
                        let mut triangle = [i, u, v];
                        triangle.sort();
                        
                        if !oriented.contains(&(triangle[0], triangle[1], triangle[2])) {
                            oriented.insert((triangle[0], triangle[1], triangle[2]));
                            triangles.push((triangle[0], triangle[1], triangle[2]));
                        }
                    }
                }
            }
        }
        
        triangles
    }

    pub fn count_triangles(&self, graph: &[Vec<Edge>]) -> usize {
        self.get_triangles(graph).len()
    }
}