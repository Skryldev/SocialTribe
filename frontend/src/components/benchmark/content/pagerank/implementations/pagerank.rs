use std::collections::{HashMap, HashSet};

pub struct PageRank {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl PageRank {
    pub fn new() -> Self {
        PageRank {
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32) {
        self.adjacency.entry(u).or_insert_with(HashSet::new).insert(v);
        self.nodes.insert(u);
        self.nodes.insert(v);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)]) {
        for &(u, v) in edges {
            self.add_edge(u, v);
        }
    }

    pub fn pagerank(&self, damping: f64, max_iter: usize, tol: f64) -> HashMap<i32, f64> {
        let mut pr = HashMap::new();
        let n = self.nodes.len();

        if n == 0 {
            return pr;
        }

        for &node in &self.nodes {
            pr.insert(node, 1.0 / n as f64);
        }

        for _ in 0..max_iter {
            let mut new_pr = HashMap::new();
            let mut diff = 0.0;

            for &node in &self.nodes {
                let mut rank = (1.0 - damping) / n as f64;

                for &neighbor in &self.nodes {
                    if let Some(neighbors) = self.adjacency.get(&neighbor) {
                        if neighbors.contains(&node) {
                            let out_degree = neighbors.len();
                            if out_degree > 0 {
                                rank += damping * (pr[&neighbor] / out_degree as f64);
                            }
                        }
                    }
                }

                new_pr.insert(node, rank);
                diff += (new_pr[&node] - pr[&node]).abs();
            }

            pr = new_pr;
            if diff < tol {
                break;
            }
        }

        pr
    }

    pub fn top_k_nodes(&self, k: usize, damping: f64) -> Vec<(i32, f64)> {
        let pr = self.pagerank(damping, 100, 1e-6);
        let mut result: Vec<(i32, f64)> = pr.into_iter().collect();
        result.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        result.truncate(k);
        result
    }
}