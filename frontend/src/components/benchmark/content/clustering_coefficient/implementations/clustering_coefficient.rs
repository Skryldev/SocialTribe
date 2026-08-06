use std::collections::{HashMap, HashSet};

pub struct ClusteringCoefficient {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl ClusteringCoefficient {
    pub fn new() -> Self {
        ClusteringCoefficient {
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

    pub fn local_clustering_coefficient(&self, node: i32) -> f64 {
        if let Some(neighbors) = self.adjacency.get(&node) {
            let degree = neighbors.len();
            if degree < 2 {
                return 0.0;
            }

            let neighbor_list: Vec<i32> = neighbors.iter().cloned().collect();
            let mut triangles = 0;

            for i in 0..neighbor_list.len() {
                for j in (i + 1)..neighbor_list.len() {
                    let u = neighbor_list[i];
                    let v = neighbor_list[j];
                    if let Some(neighbors_u) = self.adjacency.get(&u) {
                        if neighbors_u.contains(&v) {
                            triangles += 1;
                        }
                    }
                }
            }

            let max_possible = degree * (degree - 1) / 2;
            return triangles as f64 / max_possible as f64;
        }
        0.0
    }

    pub fn all_local_clustering_coefficients(&self) -> HashMap<i32, f64> {
        let mut result = HashMap::new();
        for &node in &self.nodes {
            result.insert(node, self.local_clustering_coefficient(node));
        }
        result
    }

    pub fn average_clustering_coefficient(&self) -> f64 {
        if self.nodes.is_empty() {
            return 0.0;
        }

        let total: f64 = self.nodes.iter()
            .map(|&node| self.local_clustering_coefficient(node))
            .sum();
        total / self.nodes.len() as f64
    }

    pub fn global_clustering_coefficient(&self) -> f64 {
        let mut triangles = 0;
        let mut triplets = 0;

        for &node in &self.nodes {
            if let Some(neighbors) = self.adjacency.get(&node) {
                let degree = neighbors.len();
                if degree >= 2 {
                    triplets += degree * (degree - 1) / 2;
                }

                let neighbor_list: Vec<i32> = neighbors.iter().cloned().collect();
                for i in 0..neighbor_list.len() {
                    for j in (i + 1)..neighbor_list.len() {
                        let u = neighbor_list[i];
                        let v = neighbor_list[j];
                        if let Some(neighbors_u) = self.adjacency.get(&u) {
                            if neighbors_u.contains(&v) {
                                triangles += 1;
                            }
                        }
                    }
                }
            }
        }

        if triplets == 0 {
            return 0.0;
        }

        triangles as f64 / triplets as f64
    }
}