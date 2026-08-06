use std::collections::{HashMap, HashSet};

pub struct CommonNeighbors {
    adjacency_list: HashMap<i32, HashSet<i32>>,
}

impl CommonNeighbors {
    pub fn new() -> Self {
        CommonNeighbors {
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

    pub fn common_neighbors(&self, u: i32, v: i32) -> HashSet<i32> {
        if let (Some(neighbors_u), Some(neighbors_v)) = (self.adjacency_list.get(&u), self.adjacency_list.get(&v)) {
            neighbors_u.intersection(neighbors_v).cloned().collect()
        } else {
            HashSet::new()
        }
    }

    pub fn common_neighbors_count(&self, u: i32, v: i32) -> usize {
        self.common_neighbors(u, v).len()
    }

    pub fn predict_link(&self, u: i32, v: i32, threshold: usize) -> bool {
        self.common_neighbors_count(u, v) >= threshold
    }

    pub fn score_all_pairs(&self) -> Vec<((i32, i32), usize)> {
        let mut scores = Vec::new();
        let nodes: Vec<i32> = self.adjacency_list.keys().cloned().collect();

        for i in 0..nodes.len() {
            for j in (i + 1)..nodes.len() {
                let u = nodes[i];
                let v = nodes[j];
                let count = self.common_neighbors_count(u, v);
                if count > 0 {
                    scores.push(((u, v), count));
                }
            }
        }

        scores.sort_by(|a, b| b.1.cmp(&a.1));
        scores
    }

    pub fn top_k_predictions(&self, k: usize) -> Vec<((i32, i32), usize)> {
        let scores = self.score_all_pairs();
        scores.into_iter().take(k).collect()
    }
}