use std::collections::{HashMap, HashSet, VecDeque};

pub struct ClosenessCentrality {
    adjacency_list: HashMap<i32, HashSet<i32>>,
}

impl ClosenessCentrality {
    pub fn new() -> Self {
        ClosenessCentrality {
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

    pub fn bfs_distances(&self, start: i32) -> HashMap<i32, i32> {
        let mut distances = HashMap::new();
        let mut queue = VecDeque::new();
        
        distances.insert(start, 0);
        queue.push_back(start);
        
        while let Some(node) = queue.pop_front() {
            if let Some(neighbors) = self.adjacency_list.get(&node) {
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

    pub fn closeness_centrality(&self, node: i32) -> f64 {
        if !self.adjacency_list.contains_key(&node) {
            return 0.0;
        }
        
        let distances = self.bfs_distances(node);
        let reachable_nodes = distances.len() - 1;
        
        if reachable_nodes == 0 {
            return 0.0;
        }
        
        let total_distance: i32 = distances.values().sum();
        reachable_nodes as f64 / total_distance as f64
    }

    pub fn all_closeness_centralities(&self) -> Vec<(i32, f64)> {
        let mut result = Vec::new();
        
        for &node in self.adjacency_list.keys() {
            result.push((node, self.closeness_centrality(node)));
        }
        
        result.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        result
    }

    pub fn top_k_central_nodes(&self, k: usize) -> Vec<(i32, f64)> {
        let centralities = self.all_closeness_centralities();
        centralities.into_iter().take(k).collect()
    }

    pub fn normalized_closeness_centrality(&self, node: i32) -> f64 {
        if !self.adjacency_list.contains_key(&node) {
            return 0.0;
        }
        
        let distances = self.bfs_distances(node);
        let reachable_nodes = distances.len() - 1;
        let total_nodes = self.adjacency_list.len();
        
        if reachable_nodes == 0 || total_nodes <= 1 {
            return 0.0;
        }
        
        let total_distance: i32 = distances.values().sum();
        (reachable_nodes as f64 / total_distance as f64) * ((total_nodes - 1) as f64 / reachable_nodes as f64)
    }
}