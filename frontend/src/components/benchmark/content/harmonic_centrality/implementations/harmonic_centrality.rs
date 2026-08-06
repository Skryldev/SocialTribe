use std::collections::{HashMap, HashSet, VecDeque};

pub struct HarmonicCentrality {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl HarmonicCentrality {
    pub fn new() -> Self {
        HarmonicCentrality {
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

    fn bfs_distances(&self, start: i32) -> HashMap<i32, i32> {
        let mut distances = HashMap::new();
        let mut queue = VecDeque::new();
        
        distances.insert(start, 0);
        queue.push_back(start);
        
        while let Some(node) = queue.pop_front() {
            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    if !distances.contains_key(&neighbor) {
                        distances.insert(neighbor, distances[&node] + 1);
                        queue.push_back(neighbor);
                    }
                }
            }
        }
        
        distances
    }

    pub fn harmonic_centrality(&self, node: i32) -> f64 {
        if !self.adjacency.contains_key(&node) {
            return 0.0;
        }
        
        let distances = self.bfs_distances(node);
        let mut sum = 0.0;
        
        for (&target, &dist) in distances.iter() {
            if target != node && dist > 0 {
                sum += 1.0 / dist as f64;
            }
        }
        
        sum
    }

    pub fn all_harmonic_centralities(&self) -> HashMap<i32, f64> {
        let mut result = HashMap::new();
        
        for &node in &self.nodes {
            result.insert(node, self.harmonic_centrality(node));
        }
        
        result
    }

    pub fn top_k_central_nodes(&self, k: usize) -> Vec<(i32, f64)> {
        let mut centralities: Vec<(i32, f64)> = self.all_harmonic_centralities().into_iter().collect();
        centralities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        centralities.truncate(k);
        centralities
    }
}