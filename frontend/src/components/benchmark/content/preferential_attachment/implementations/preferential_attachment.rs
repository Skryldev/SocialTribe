use std::collections::{HashMap, HashSet};

pub struct PreferentialAttachment {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl PreferentialAttachment {
    pub fn new() -> Self {
        PreferentialAttachment {
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

    pub fn preferential_attachment_score(&self, u: i32, v: i32) -> f64 {
        if let (Some(neighbors_u), Some(neighbors_v)) = (self.adjacency.get(&u), self.adjacency.get(&v)) {
            return (neighbors_u.len() * neighbors_v.len()) as f64;
        }
        0.0
    }

    pub fn score_all_pairs(&self) -> Vec<((i32, i32), f64)> {
        let mut scores = Vec::new();
        let node_list: Vec<i32> = self.nodes.iter().cloned().collect();

        for i in 0..node_list.len() {
            for j in (i + 1)..node_list.len() {
                let u = node_list[i];
                let v = node_list[j];
                let score = self.preferential_attachment_score(u, v);
                if score > 0.0 {
                    scores.push(((u, v), score));
                }
            }
        }

        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scores
    }

    pub fn top_k_predictions(&self, k: usize) -> Vec<((i32, i32), f64)> {
        let scores = self.score_all_pairs();
        scores.into_iter().take(k).collect()
    }
}