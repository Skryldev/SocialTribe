use std::collections::{HashMap, HashSet};

pub struct EigenvectorCentrality {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl EigenvectorCentrality {
    pub fn new() -> Self {
        EigenvectorCentrality {
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32) {
        self.adjacency.entry(u).or_insert_with(HashSet::new).insert(v);
        self.adjacency.entry(v).or_insert_with(HashSet::new).insert(u);
        self.nodes.insert(u);
        self.nodes.insert(v);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)]) {
        for &(u, v) in edges {
            self.add_edge(u, v);
        }
    }

    pub fn eigenvector_centrality(&self, max_iter: usize, tol: f64) -> HashMap<i32, f64> {
        let mut centrality = HashMap::new();
        let n = self.nodes.len() as f64;

        for &node in &self.nodes {
            centrality.insert(node, 1.0 / n);
        }

        for _ in 0..max_iter {
            let mut new_centrality = HashMap::new();
            let mut norm = 0.0;

            for &node in &self.nodes {
                let mut sum = 0.0;
                if let Some(neighbors) = self.adjacency.get(&node) {
                    for &neighbor in neighbors {
                        sum += centrality[&neighbor];
                    }
                }
                new_centrality.insert(node, sum);
                norm += sum * sum;
            }

            norm = norm.sqrt();
            let mut diff = 0.0;

            for &node in &self.nodes {
                let val = new_centrality[&node] / norm;
                new_centrality.insert(node, val);
                diff += (val - centrality[&node]).abs();
            }

            centrality = new_centrality;

            if diff < tol {
                break;
            }
        }

        centrality
    }

    pub fn top_k_central_nodes(&self, k: usize, max_iter: usize, tol: f64) -> Vec<(i32, f64)> {
        let mut centrality: Vec<(i32, f64)> = self.eigenvector_centrality(max_iter, tol)
            .into_iter()
            .collect();
        centrality.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        centrality.truncate(k);
        centrality
    }

    pub fn normalized_eigenvector_centrality(&self, max_iter: usize, tol: f64) -> HashMap<i32, f64> {
        let mut centrality = self.eigenvector_centrality(max_iter, tol);
        let max_val = centrality.values().cloned().fold(0.0, f64::max);

        if max_val > 0.0 {
            for value in centrality.values_mut() {
                *value /= max_val;
            }
        }

        centrality
    }
}