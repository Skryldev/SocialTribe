use std::collections::{HashMap, HashSet};
use rand::seq::SliceRandom;
use rand::thread_rng;

pub struct Leiden {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
    communities: HashMap<i32, i32>,
    weights: HashMap<(i32, i32), f64>,
    m: f64,
}

impl Leiden {
    pub fn new() -> Self {
        Leiden {
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
            communities: HashMap::new(),
            weights: HashMap::new(),
            m: 0.0,
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32, weight: f64) {
        self.adjacency.entry(u).or_insert_with(HashSet::new).insert(v);
        self.adjacency.entry(v).or_insert_with(HashSet::new).insert(u);

        self.nodes.insert(u);
        self.nodes.insert(v);

        let key = if u < v { (u, v) } else { (v, u) };
        *self.weights.entry(key).or_insert(0.0) += weight;
        self.m += weight;
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)]) {
        for &(u, v) in edges {
            self.add_edge(u, v, 1.0);
        }
    }

    fn degree(&self, node: i32) -> f64 {
        let mut deg = 0.0;
        if let Some(neighbors) = self.adjacency.get(&node) {
            for &neighbor in neighbors {
                deg += self.weight(node, neighbor);
            }
        }
        deg
    }

    fn weight(&self, u: i32, v: i32) -> f64 {
        let key = if u < v { (u, v) } else { (v, u) };
        *self.weights.get(&key).unwrap_or(&0.0)
    }

    fn community_degree(&self, node: i32, community: i32) -> f64 {
        let mut deg = 0.0;
        if let Some(neighbors) = self.adjacency.get(&node) {
            for &neighbor in neighbors {
                if let Some(&comm) = self.communities.get(&neighbor) {
                    if comm == community {
                        deg += self.weight(node, neighbor);
                    }
                }
            }
        }
        deg
    }

    fn total_degree(&self, community: i32) -> f64 {
        let mut total = 0.0;
        for &node in &self.nodes {
            if let Some(&comm) = self.communities.get(&node) {
                if comm == community {
                    total += self.degree(node);
                }
            }
        }
        total
    }

    fn modularity_gain(&self, node: i32, community: i32) -> f64 {
        let ki = self.degree(node);
        let kic = self.community_degree(node, community);
        let total = self.total_degree(community);
        (kic - (total * ki) / (2.0 * self.m)) / self.m
    }

    fn initialize_communities(&mut self) {
        for &node in &self.nodes {
            self.communities.insert(node, node);
        }
    }

    fn refine_partition(&mut self) -> bool {
        let mut changed = false;
        let mut node_list: Vec<i32> = self.nodes.iter().cloned().collect();
        let mut rng = thread_rng();
        node_list.shuffle(&mut rng);

        for &node in &node_list {
            let current_community = self.communities[&node];
            let mut best_community = current_community;
            let mut best_gain = 0.0;

            let mut communities_seen = HashSet::new();
            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    let community = self.communities[&neighbor];
                    if communities_seen.contains(&community) {
                        continue;
                    }
                    communities_seen.insert(community);

                    if community == current_community {
                        continue;
                    }

                    let gain = self.modularity_gain(node, community);
                    if gain > best_gain {
                        best_gain = gain;
                        best_community = community;
                    }
                }
            }

            if best_community != current_community {
                self.communities.insert(node, best_community);
                changed = true;
            }
        }

        changed
    }

    fn aggregate_network(&mut self) {
        let mut new_adjacency: HashMap<i32, HashSet<i32>> = HashMap::new();
        let mut new_nodes: HashSet<i32> = HashSet::new();
        let mut new_weights: HashMap<(i32, i32), f64> = HashMap::new();
        let mut new_m = 0.0;

        let mut community_map: HashMap<i32, i32> = HashMap::new();
        let mut next_id = 0;
        let mut seen = HashSet::new();
        for &community in self.communities.values() {
            if seen.insert(community) {
                community_map.insert(community, next_id);
                next_id += 1;
            }
        }

        for &node in &self.nodes {
            let new_community = community_map[&self.communities[&node]];
            new_adjacency.entry(new_community).or_insert_with(HashSet::new);
            new_nodes.insert(new_community);
        }

        for (&(u, v), &weight) in &self.weights {
            let cu = community_map[&self.communities[&u]];
            let cv = community_map[&self.communities[&v]];

            if cu == cv {
                new_m += weight;
                continue;
            }

            let key = if cu < cv { (cu, cv) } else { (cv, cu) };
            *new_weights.entry(key).or_insert(0.0) += weight;
            
            new_adjacency.entry(cu).or_insert_with(HashSet::new).insert(cv);
            new_adjacency.entry(cv).or_insert_with(HashSet::new).insert(cu);
            new_m += weight;
        }

        for &community in &new_nodes {
            new_adjacency.entry(community).or_insert_with(HashSet::new);
        }

        self.adjacency = new_adjacency;
        self.nodes = new_nodes;
        self.weights = new_weights;
        self.m = new_m;

        let mut new_communities = HashMap::new();
        for &node in self.communities.keys() {
            new_communities.insert(node, community_map[&self.communities[&node]]);
        }
        self.communities = new_communities;
    }

    fn fast_local_move(&mut self) -> bool {
        let mut changed = false;
        let mut node_list: Vec<i32> = self.nodes.iter().cloned().collect();
        let mut rng = thread_rng();
        node_list.shuffle(&mut rng);

        for &node in &node_list {
            let mut best_community = self.communities[&node];
            let mut best_gain = 0.0;

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    let community = self.communities[&neighbor];
                    if community == self.communities[&node] {
                        continue;
                    }
                    let gain = self.modularity_gain(node, community);
                    if gain > best_gain {
                        best_gain = gain;
                        best_community = community;
                    }
                }
            }

            if best_community != self.communities[&node] {
                self.communities.insert(node, best_community);
                changed = true;
            }
        }

        changed
    }

    pub fn detect_communities(&mut self) -> HashMap<i32, i32> {
        self.initialize_communities();

        loop {
            let mut improved = false;

            while self.refine_partition() {
                improved = true;
            }

            if !improved {
                break;
            }

            while self.fast_local_move() {
                improved = true;
            }

            if !improved {
                break;
            }

            self.aggregate_network();
        }

        self.communities.clone()
    }
}