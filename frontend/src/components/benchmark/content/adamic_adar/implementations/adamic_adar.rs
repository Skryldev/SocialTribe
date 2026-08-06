use std::collections::{HashMap, HashSet};

pub struct AdamicAdar {
    adjacency_list: HashMap<i32, HashSet<i32>>,
}

impl AdamicAdar {
    pub fn new() -> Self {
        AdamicAdar {
            adjacency_list: HashMap::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32) {
        self.adjacency_list.entry(u).or_insert_with(HashSet::new).insert(v);
        self.adjacency_list.entry(v).or_insert_with(HashSet::new).insert(u);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)]) {
        for &(u, v) in edges {
            self.add_edge(u, v);
        }
    }

    pub fn adamic_adar_score(&self, u: i32, v: i32) -> f64 {
        if let (Some(neighbors_u), Some(neighbors_v)) = (self.adjacency_list.get(&u), self.adjacency_list.get(&v)) {
            let mut score = 0.0;
            for &node in neighbors_u {
                if neighbors_v.contains(&node) {
                    if let Some(neighbors) = self.adjacency_list.get(&node) {
                        let degree = neighbors.len();
                        if degree > 1 {
                            score += 1.0 / (degree as f64).ln();
                        }
                    }
                }
            }
            return score;
        }
        0.0
    }

    pub fn score_all_pairs(&self) -> Vec<((i32, i32), f64)> {
        let mut scores = Vec::new();
        let nodes: Vec<i32> = self.adjacency_list.keys().cloned().collect();

        for i in 0..nodes.len() {
            for j in (i + 1)..nodes.len() {
                let u = nodes[i];
                let v = nodes[j];
                let score = self.adamic_adar_score(u, v);
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