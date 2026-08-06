use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct PreferentialAttachment;

impl AlgorithmRunner for PreferentialAttachment {
    fn aliases(&self) -> &'static [&'static str] {
        &["preferential-attachment", "pa", "pref-attachment"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        if n == 0 {
            return RunOutput::new(0.0, 0, 0, Vec::new());
        }

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        let mut degrees = vec![0_usize; n];
        for i in 0..n {
            degrees[i] = graph[i].len();
            operations += 1;
        }

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let mut total_pa = 0_usize;
        let mut pairs_processed = 0usize;
        let mut max_pa = 0_usize;
        let mut visited_nodes = 0usize;

        let total_work = n * n;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;

        for i in 0..n {
            visited_nodes += 1;
            
            if sample && visited_nodes % sample_interval == 0 {
                let progress = (visited_nodes as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if degrees[i] == 0 {
                continue;
            }

            let deg_i = degrees[i];
            
            for j in (i + 1)..n {
                operations += 1;
                
                if degrees[j] == 0 {
                    continue;
                }

                let pa = deg_i * degrees[j];
                
                total_pa += pa;
                pairs_processed += 1;
                
                if pa > max_pa {
                    max_pa = pa;
                }
                operations += 1;
            }

            work_done += n;

            if sample {
                let percent = (visited_nodes as f64 / n as f64) * 100.0;
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

        let avg_pa = if pairs_processed > 0 {
            total_pa as f64 / pairs_processed as f64
        } else {
            0.0
        };

        let _min_pa = 0;

        operations += 3;

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
            log_debug_fields!("preferential_attachment", "Preferential Attachment sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "pairs_processed" => pairs_processed as i64,
                "total_pa" => total_pa as i64,
                "avg_pa" => avg_pa,
                "max_pa" => max_pa as i64,
            ));
        }

        RunOutput::new(
            time_ms,
            operations,
            visited_nodes,
            samples,
        )
    }
}

#[cfg(test)]
impl PreferentialAttachment {
    pub fn score(&self, graph: &[Vec<Edge>], u: usize, v: usize) -> usize {
        let deg_u = graph[u].len();
        let deg_v = graph[v].len();
        deg_u * deg_v
    }

    pub fn get_all_scores(&self, graph: &[Vec<Edge>]) -> Vec<(usize, usize, usize)> {
        let n = graph.len();
        let mut results = Vec::new();
        
        for u in 0..n {
            for v in (u + 1)..n {
                let score = self.score(graph, u, v);
                if score > 0 {
                    results.push((u, v, score));
                }
            }
        }
        
        results.sort_by(|a, b| b.2.cmp(&a.2));
        results
    }
}