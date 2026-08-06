use std::collections::{HashMap, HashSet, VecDeque};
use std::cmp::Ordering;

#[derive(Hash, Eq, PartialEq, Clone, Debug)]
struct Edge {
    u: i32,
    v: i32,
}

impl Edge {
    fn new(u: i32, v: i32) -> Self {
        if u < v {
            Edge { u, v }
        } else {
            Edge { u: v, v: u }
        }
    }
}

pub struct GirvanNewman {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
    edge_betweenness: HashMap<Edge, f64>,
    communities: Vec<Vec<i32>>,
}

impl GirvanNewman {
    pub fn new() -> Self {
        GirvanNewman {
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
            edge_betweenness: HashMap::new(),
            communities: Vec::new(),
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

    fn bfs_distances(&self, start: i32) -> (HashMap<i32, i32>, HashMap<i32, Vec<i32>>) {
        let mut dist = HashMap::new();
        let mut predecessors = HashMap::new();
        let mut queue = VecDeque::new();

        dist.insert(start, 0);
        queue.push_back(start);

        while let Some(node) = queue.pop_front() {
            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    if !dist.contains_key(&neighbor) {
                        dist.insert(neighbor, dist[&node] + 1);
                        queue.push_back(neighbor);
                    }
                    if dist[&neighbor] == dist[&node] + 1 {
                        predecessors.entry(neighbor).or_insert_with(Vec::new).push(node);
                    }
                }
            }
        }

        (dist, predecessors)
    }

    fn compute_edge_betweenness(&mut self) {
        self.edge_betweenness.clear();

        for (&u, neighbors) in &self.adjacency {
            for &v in neighbors {
                let edge = Edge::new(u, v);
                self.edge_betweenness.entry(edge).or_insert(0.0);
            }
        }

        for &source in &self.nodes {
            let (dist, predecessors) = self.bfs_distances(source);

            let mut dependency = HashMap::new();
            for &node in &self.nodes {
                dependency.insert(node, 0.0);
            }

            let mut sorted_nodes: Vec<i32> = dist.keys().cloned().collect();
            sorted_nodes.sort_by(|a, b| dist[b].cmp(&dist[a]));

            for &node in &sorted_nodes {
                if let Some(preds) = predecessors.get(&node) {
                    for &pred in preds {
                        let contrib = (1.0 + dependency[&node]) / preds.len() as f64;
                        *dependency.get_mut(&pred).unwrap() += contrib;
                    }
                }
            }

            for &node in &sorted_nodes {
                if let Some(preds) = predecessors.get(&node) {
                    for &pred in preds {
                        let edge = Edge::new(pred, node);
                        *self.edge_betweenness.get_mut(&edge).unwrap() +=
                            dependency[&node] / preds.len() as f64;
                    }
                }
            }
        }

        for (_, value) in self.edge_betweenness.iter_mut() {
            *value /= 2.0;
        }
    }

    fn remove_edge_with_max_betweenness(&mut self) {
        let mut max_edge = Edge::new(0, 0);
        let mut max_betweenness = -1.0;

        for (edge, &betweenness) in &self.edge_betweenness {
            if betweenness > max_betweenness {
                max_betweenness = betweenness;
                max_edge = edge.clone();
            }
        }

        if let Some(neighbors) = self.adjacency.get_mut(&max_edge.u) {
            neighbors.remove(&max_edge.v);
        }
        if let Some(neighbors) = self.adjacency.get_mut(&max_edge.v) {
            neighbors.remove(&max_edge.u);
        }
    }

    fn find_components(&self) -> Vec<Vec<i32>> {
        let mut components = Vec::new();
        let mut visited = HashSet::new();

        for &node in &self.nodes {
            if visited.contains(&node) {
                continue;
            }

            let mut component = Vec::new();
            let mut queue = VecDeque::new();
            queue.push_back(node);
            visited.insert(node);

            while let Some(current) = queue.pop_front() {
                component.push(current);

                if let Some(neighbors) = self.adjacency.get(&current) {
                    for &neighbor in neighbors {
                        if !visited.contains(&neighbor) {
                            visited.insert(neighbor);
                            queue.push_back(neighbor);
                        }
                    }
                }
            }

            if !component.is_empty() {
                components.push(component);
            }
        }

        components
    }

    fn modularity(&self, communities: &[Vec<i32>]) -> f64 {
        let mut community_map = HashMap::new();
        for (i, community) in communities.iter().enumerate() {
            for &node in community {
                community_map.insert(node, i);
            }
        }

        let mut m = 0.0;
        for neighbors in self.adjacency.values() {
            m += neighbors.len() as f64;
        }
        m /= 2.0;

        let mut degrees = HashMap::new();
        for &node in &self.nodes {
            degrees.insert(node, self.adjacency[&node].len() as f64);
        }

        let mut q = 0.0;
        for (&u, neighbors) in &self.adjacency {
            for &v in neighbors {
                if community_map[&u] == community_map[&v] {
                    q += 1.0 - (degrees[&u] * degrees[&v]) / (2.0 * m);
                }
            }
        }

        q / (2.0 * m)
    }

    pub fn detect_communities(&mut self, num_communities: usize) -> Vec<Vec<i32>> {
        while {
            self.compute_edge_betweenness();
            self.remove_edge_with_max_betweenness();

            let current_components = self.find_components();
            if current_components.len() >= num_communities {
                self.communities = current_components;
                break;
            }

            if self.adjacency.is_empty() {
                break;
            }

            true
        } {}

        self.communities.clone()
    }

    pub fn detect_communities_by_modularity(&mut self) -> Vec<Vec<i32>> {
        let mut best_communities = Vec::new();
        let mut best_modularity = -1.0;
        let mut iterations = 0;

        while {
            self.compute_edge_betweenness();
            self.remove_edge_with_max_betweenness();

            let current_components = self.find_components();
            let current_modularity = self.modularity(&current_components);

            if current_modularity > best_modularity {
                best_modularity = current_modularity;
                best_communities = current_components.clone();
            }

            if current_components.len() == 1 {
                break;
            }

            iterations += 1;
            if iterations > 1000 {
                break;
            }

            true
        } {}

        best_communities
    }
}