use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::HashSet;
use std::time::Instant;

pub struct JaccardSimilarity;

impl AlgorithmRunner for JaccardSimilarity {
    fn aliases(&self) -> &'static [&'static str] {
        &["jaccard", "jaccard-similarity", "jaccard-index"]
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
        // ✅ Step 1: Build adjacency sets for O(1) lookup
        // ============================================================
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
                operations += 1;
            }
            adjacency_sets.push(set);
        }

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Step 2: Compute Jaccard Similarity for all pairs
        // ============================================================
        let mut total_similarity = 0.0_f64;
        let mut pairs_processed = 0usize;
        let mut max_similarity = 0.0_f64;
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

            if adjacency_sets[i].is_empty() {
                continue;
            }

            let neighbors_i: Vec<usize> = adjacency_sets[i].iter().copied().collect();
            
            for &j in &neighbors_i {
                if j <= i {
                    continue;
                }
                
                if adjacency_sets[j].is_empty() {
                    continue;
                }

                let (smaller, larger) = if adjacency_sets[i].len() <= adjacency_sets[j].len() {
                    (&adjacency_sets[i], &adjacency_sets[j])
                } else {
                    (&adjacency_sets[j], &adjacency_sets[i])
                };

                let mut intersection = 0_usize;
                for &neighbor in smaller {
                    operations += 1;
                    if larger.contains(&neighbor) {
                        intersection += 1;
                        operations += 1;
                    }
                }

                if intersection > 0 {
                    let union = adjacency_sets[i].len() + adjacency_sets[j].len() - intersection;
                    let similarity = intersection as f64 / union as f64;
                    
                    total_similarity += similarity;
                    pairs_processed += 1;
                    
                    if similarity > max_similarity {
                        max_similarity = similarity;
                    }
                    operations += 1;
                }
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

        // ============================================================
        // ✅ Step 3: Calculate statistics
        // ============================================================
        let avg_similarity = if pairs_processed > 0 {
            total_similarity / pairs_processed as f64
        } else {
            0.0
        };

        let _min_similarity = 0.0;

        operations += 3;

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
            log_debug_fields!("jaccard_similarity", "Jaccard Similarity sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "pairs_processed" => pairs_processed as i64,
                "total_similarity" => total_similarity,
                "avg_similarity" => avg_similarity,
                "max_similarity" => max_similarity,
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            visited_nodes,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl JaccardSimilarity {
    pub fn similarity(&self, graph: &[Vec<Edge>], u: usize, v: usize) -> f64 {
        let n = graph.len();
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
            }
            adjacency_sets.push(set);
        }

        if adjacency_sets[u].is_empty() || adjacency_sets[v].is_empty() {
            return 0.0;
        }

        let (smaller, larger) = if adjacency_sets[u].len() <= adjacency_sets[v].len() {
            (&adjacency_sets[u], &adjacency_sets[v])
        } else {
            (&adjacency_sets[v], &adjacency_sets[u])
        };

        let mut intersection = 0_usize;
        for &neighbor in smaller {
            if larger.contains(&neighbor) {
                intersection += 1;
            }
        }

        if intersection == 0 {
            return 0.0;
        }

        let union = adjacency_sets[u].len() + adjacency_sets[v].len() - intersection;
        intersection as f64 / union as f64
    }

    pub fn get_all_similarities(&self, graph: &[Vec<Edge>]) -> Vec<(usize, usize, f64)> {
        let n = graph.len();
        let mut results = Vec::new();
        
        for u in 0..n {
            for v in (u + 1)..n {
                let sim = self.similarity(graph, u, v);
                if sim > 0.0 {
                    results.push((u, v, sim));
                }
            }
        }
        
        results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());
        results
    }
}