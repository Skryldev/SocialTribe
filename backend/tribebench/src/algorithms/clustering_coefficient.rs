use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::collections::HashSet;
use std::time::Instant;

pub struct ClusteringCoefficient;

impl AlgorithmRunner for ClusteringCoefficient {
    fn aliases(&self) -> &'static [&'static str] {
        &["clustering-coefficient", "clustering", "cc"]
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
        // ✅ Step 2: Calculate total work for sampling
        // ============================================================
        let total_work = n; // One pass through all nodes
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 10));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        // ============================================================
        // ✅ Step 3: Calculate clustering coefficient for each node
        // ============================================================
        let mut local_clustering = vec![0.0_f64; n];
        let mut triangles = vec![0_usize; n];
        let mut possible_triangles = vec![0_usize; n];
        
        let mut total_triangles = 0_usize;
        let mut total_possible = 0_usize;
        let mut nodes_with_edges = 0_usize;

        for v in 0..n {
            operations += 1;
            
            let degree = adjacency_sets[v].len();
            
            if degree < 2 {
                local_clustering[v] = 0.0;
                triangles[v] = 0;
                possible_triangles[v] = 0;
                continue;
            }

            // Get neighbors of v
            let neighbors: Vec<usize> = adjacency_sets[v].iter().copied().collect();
            
            // Count triangles (edges between neighbors)
            let mut triangle_count = 0_usize;
            
            // For each pair of neighbors, check if they're connected
            for i in 0..neighbors.len() {
                for j in (i + 1)..neighbors.len() {
                    operations += 1;
                    let u = neighbors[i];
                    let w = neighbors[j];
                    
                    // Check if u and w are connected
                    if adjacency_sets[u].contains(&w) {
                        triangle_count += 1;
                        operations += 1;
                    }
                }
            }

            let max_possible = (degree * (degree - 1)) / 2;
            
            triangles[v] = triangle_count;
            possible_triangles[v] = max_possible;
            
            if max_possible > 0 {
                let actual_triangles = triangle_count / 3;
                local_clustering[v] = actual_triangles as f64 / max_possible as f64;
                
                total_triangles += actual_triangles;
                total_possible += max_possible;
                nodes_with_edges += 1;
            } else {
                local_clustering[v] = 0.0;
            }

            // Sample based on progress
            if sample && (v + 1) % sample_interval == 0 {
                let progress = ((v + 1) as f64 / n as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            // Sample at 25%, 50%, 75% for better granularity
            if sample {
                let percent = ((v + 1) as f64 / n as f64) * 100.0;
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
        // ✅ Step 4: Calculate global clustering coefficient
        // ============================================================
        let global_clustering = if total_possible > 0 {
            total_triangles as f64 / total_possible as f64
        } else {
            0.0
        };

        // Average local clustering coefficient
        let avg_local_clustering = if nodes_with_edges > 0 {
            local_clustering.iter().sum::<f64>() / nodes_with_edges as f64
        } else {
            0.0
        };

        let _max_clustering = local_clustering.iter().fold(0.0_f64, |a, &b| a.max(b));
        let _min_clustering = local_clustering.iter().fold(f64::MAX, |a, &b| a.min(b));

        operations += 5; // Calculate statistics

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
            log_debug_fields!("clustering_coefficient", "Clustering Coefficient sampling completed", fields!(
                "vertices" => n as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "global_clustering" => global_clustering,
                "avg_local_clustering" => avg_local_clustering,
                "total_triangles" => total_triangles as i64,
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

// ============================================================
// ✅ Helper functions for testing
// ============================================================

#[cfg(test)]
impl ClusteringCoefficient {
    /// Get local clustering coefficients (for testing)
    pub fn get_local_clustering(&self, graph: &[Vec<Edge>]) -> Vec<f64> {
        let n = graph.len();
        let mut result = vec![0.0_f64; n];
        
        // Build adjacency sets
        let mut adjacency_sets: Vec<HashSet<usize>> = Vec::with_capacity(n);
        for i in 0..n {
            let mut set = HashSet::new();
            for edge in &graph[i] {
                set.insert(edge.node);
            }
            adjacency_sets.push(set);
        }
        
        for v in 0..n {
            let degree = adjacency_sets[v].len();
            if degree < 2 {
                result[v] = 0.0;
                continue;
            }
            
            let neighbors: Vec<usize> = adjacency_sets[v].iter().copied().collect();
            let mut triangle_count = 0_usize;
            
            for i in 0..neighbors.len() {
                for j in (i + 1)..neighbors.len() {
                    let u = neighbors[i];
                    let w = neighbors[j];
                    if adjacency_sets[u].contains(&w) {
                        triangle_count += 1;
                    }
                }
            }
            
            let max_possible = (degree * (degree - 1)) / 2;
            if max_possible > 0 {
                let actual_triangles = triangle_count / 3;
                result[v] = actual_triangles as f64 / max_possible as f64;
            } else {
                result[v] = 0.0;
            }
        }
        
        result
    }

    /// Get global clustering coefficient (for testing)
    pub fn get_global_clustering(&self, graph: &[Vec<Edge>]) -> f64 {
        let local = self.get_local_clustering(graph);
        let n = graph.len();
        
        let mut total_clustering = 0.0_f64;
        let mut count = 0_usize;
        
        for v in 0..n {
            if graph[v].len() >= 2 {
                total_clustering += local[v];
                count += 1;
            }
        }
        
        if count > 0 {
            total_clustering / count as f64
        } else {
            0.0
        }
    }
}