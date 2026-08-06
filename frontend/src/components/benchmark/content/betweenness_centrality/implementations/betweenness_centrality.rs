use std::collections::{HashMap, HashSet, VecDeque};

pub struct BetweennessCentrality {
    adjacency_list: HashMap<i32, HashSet<i32>>,
}

impl BetweennessCentrality {
    pub fn new() -> Self {
        BetweennessCentrality {
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

    pub fn betweenness_centrality(&self) -> HashMap<i32, f64> {
        let mut centrality: HashMap<i32, f64> = HashMap::new();
        for &node in self.adjacency_list.keys() {
            centrality.insert(node, 0.0);
        }

        for &s in self.adjacency_list.keys() {
            let mut stack = Vec::new();
            let mut pred: HashMap<i32, Vec<i32>> = HashMap::new();
            let mut dist: HashMap<i32, i32> = HashMap::new();
            let mut sigma: HashMap<i32, i32> = HashMap::new();

            for &node in self.adjacency_list.keys() {
                pred.insert(node, Vec::new());
                dist.insert(node, -1);
                sigma.insert(node, 0);
            }

            dist.insert(s, 0);
            sigma.insert(s, 1);
            let mut queue = VecDeque::new();
            queue.push_back(s);

            while let Some(v) = queue.pop_front() {
                stack.push(v);

                if let Some(neighbors) = self.adjacency_list.get(&v) {
                    for &w in neighbors {
                        if dist[&w] < 0 {
                            dist.insert(w, dist[&v] + 1);
                            queue.push_back(w);
                        }
                        if dist[&w] == dist[&v] + 1 {
                            sigma.insert(w, sigma[&w] + sigma[&v]);
                            pred.get_mut(&w).unwrap().push(v);
                        }
                    }
                }
            }

            let mut delta: HashMap<i32, f64> = HashMap::new();
            for &node in self.adjacency_list.keys() {
                delta.insert(node, 0.0);
            }

            while let Some(w) = stack.pop() {
                if let Some(predecessors) = pred.get(&w) {
                    for &v in predecessors {
                        let sigma_v = *sigma.get(&v).unwrap_or(&0) as f64;
                        let sigma_w = *sigma.get(&w).unwrap_or(&1) as f64;
                        let delta_w = *delta.get(&w).unwrap_or(&0.0);
                        delta.insert(v, delta[&v] + (sigma_v / sigma_w) * (1.0 + delta_w));
                    }
                }

                if w != s {
                    centrality.insert(w, centrality[&w] + delta[&w]);
                }
            }
        }

        centrality
    }

    pub fn top_k_central_nodes(&self, k: usize) -> Vec<(i32, f64)> {
        let mut centrality = self.betweenness_centrality();
        let mut result: Vec<(i32, f64)> = centrality.drain().collect();
        result.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        result.truncate(k);
        result
    }
}