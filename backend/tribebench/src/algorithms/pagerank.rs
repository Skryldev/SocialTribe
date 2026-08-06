use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct PageRank;

impl AlgorithmRunner for PageRank {
    fn aliases(&self) -> &'static [&'static str] {
        &["pagerank", "page-rank", "pr"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        let damping_factor = 0.85;
        let max_iterations = 100;
        let tolerance = 1e-8;
        
        let initial_pr = 1.0 / n as f64;
        let mut pr = vec![initial_pr; n];
        let mut new_pr = vec![0.0; n];
        
        operations += n as u64;

        let mut out_degree = vec![0_usize; n];
        for i in 0..n {
            out_degree[i] = graph[i].len();
            operations += 1;
        }

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let mut outgoing: Vec<Vec<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
                operations += 1;
            }
            outgoing.push(neighbors);
        }

        let mut iter = 0;
        let mut converged = false;
        
        let total_work = max_iterations * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        while iter < max_iterations && !converged {
            iter += 1;
            
            for v in 0..n {
                new_pr[v] = 0.0;
                operations += 1;
            }

            let teleport = (1.0 - damping_factor) / n as f64;
            
            for u in 0..n {
                operations += 1;
                
                if out_degree[u] > 0 {
                    let pr_u = pr[u];
                    let contribution = pr_u / out_degree[u] as f64;
                    
                    for &v in &outgoing[u] {
                        new_pr[v] += contribution;
                        operations += 1;
                    }
                }
            }

            let mut diff = 0.0_f64;
            for v in 0..n {
                new_pr[v] = teleport + damping_factor * new_pr[v];
                diff += (new_pr[v] - pr[v]).abs();
                operations += 1;
            }

            if diff < tolerance {
                converged = true;
                log_debug_fields!("pagerank", "PageRank converged", fields!(
                    "iterations" => iter as i64,
                    "diff" => diff,
                ));
            }

            std::mem::swap(&mut pr, &mut new_pr);

            work_done += n;

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
        }

        let max_pr = pr.iter().fold(0.0_f64, |a, &b| a.max(b));
        let _min_pr = pr.iter().fold(f64::MAX, |a, &b| a.min(b));
        let avg_pr = if n > 0 {
            pr.iter().sum::<f64>() / n as f64
        } else {
            0.0
        };

        let mut top_nodes: Vec<(usize, f64)> = pr
            .iter()
            .enumerate()
            .map(|(i, &v)| (i, v))
            .collect();
        top_nodes.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let _top_5: Vec<(usize, f64)> = top_nodes.iter().take(5).map(|&(i, v)| (i, v)).collect();

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
            log_debug_fields!("pagerank", "PageRank sampling completed", fields!(
                "vertices" => n as i64,
                "iterations" => iter as i64,
                "converged" => converged,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "avg_pr" => avg_pr,
                "max_pr" => max_pr,
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
impl PageRank {
    pub fn get_pagerank(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let damping_factor = 0.85;
        let max_iterations = 100;
        let tolerance = 1e-8;
        
        let mut pr = vec![1.0 / n as f64; n];
        let mut new_pr = vec![0.0; n];
        let mut out_degree = vec![0_usize; n];
        
        for i in 0..n {
            out_degree[i] = graph[i].len();
        }
        
        let mut outgoing: Vec<Vec<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut neighbors = Vec::with_capacity(graph[i].len());
            for edge in &graph[i] {
                neighbors.push(edge.node);
            }
            outgoing.push(neighbors);
        }
        
        let mut iter = 0;
        while iter < max_iterations {
            iter += 1;
            
            for v in 0..n {
                new_pr[v] = 0.0;
            }
            
            let teleport = (1.0 - damping_factor) / n as f64;
            
            for u in 0..n {
                if out_degree[u] > 0 {
                    let pr_u = pr[u];
                    let contribution = pr_u / out_degree[u] as f64;
                    
                    for &v in &outgoing[u] {
                        new_pr[v] += contribution;
                    }
                }
            }
            
            let mut diff = 0.0_f64;
            for v in 0..n {
                new_pr[v] = teleport + damping_factor * new_pr[v];
                diff += (new_pr[v] - pr[v]).abs();
            }
            
            std::mem::swap(&mut pr, &mut new_pr);
            
            if diff < tolerance {
                break;
            }
        }
        
        pr
    }
}