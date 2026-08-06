use std::collections::{HashMap, HashSet};

pub struct DegreeCentrality {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl DegreeCentrality {
    pub fn new() -> Self {
        DegreeCentrality {
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

    pub fn degree_centrality(&self, node: i32) -> usize {
        self.adjacency.get(&node).map_or(0, |neighbors| neighbors.len())
    }

    pub fn all_degree_centralities(&self) -> HashMap<i32, usize> {
        let mut result = HashMap::new();
        for &node in &self.nodes {
            result.insert(node, self.degree_centrality(node));
        }
        result
    }

    pub fn top_k_central_nodes(&self, k: usize) -> Vec<(i32, usize)> {
        let mut centralities: Vec<(i32, usize)> = self.all_degree_centralities().into_iter().collect();
        centralities.sort_by(|a, b| b.1.cmp(&a.1));
        centralities.truncate(k);
        centralities
    }

    pub fn normalized_degree_centrality(&self, node: i32) -> f64 {
        if self.nodes.len() <= 1 {
            return 0.0;
        }
        self.degree_centrality(node) as f64 / (self.nodes.len() - 1) as f64
    }

    pub fn all_normalized_degree_centralities(&self) -> HashMap<i32, f64> {
        let mut result = HashMap::new();
        for &node in &self.nodes {
            result.insert(node, self.normalized_degree_centrality(node));
        }
        result
    }
}