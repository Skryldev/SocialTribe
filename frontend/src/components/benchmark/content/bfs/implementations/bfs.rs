use std::collections::{HashMap, HashSet, VecDeque};

pub struct BFS {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl BFS {
    pub fn new() -> Self {
        BFS {
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

    pub fn bfs(&self, start: i32) -> HashMap<i32, i32> {
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

    pub fn bfs_path(&self, start: i32, goal: i32) -> Vec<i32> {
        let mut parent = HashMap::new();
        let mut queue = VecDeque::new();

        parent.insert(start, -1);
        queue.push_back(start);

        while let Some(node) = queue.pop_front() {
            if node == goal {
                let mut path = Vec::new();
                let mut current = node;
                while current != -1 {
                    path.push(current);
                    current = *parent.get(&current).unwrap_or(&-1);
                }
                path.reverse();
                return path;
            }

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    if !parent.contains_key(&neighbor) {
                        parent.insert(neighbor, node);
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        Vec::new()
    }

    pub fn bfs_order(&self, start: i32) -> Vec<i32> {
        let mut order = Vec::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();

        visited.insert(start);
        queue.push_back(start);

        while let Some(node) = queue.pop_front() {
            order.push(node);

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    if !visited.contains(&neighbor) {
                        visited.insert(neighbor);
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        order
    }

    pub fn is_connected(&self) -> bool {
        if self.nodes.is_empty() {
            return true;
        }

        let start = *self.nodes.iter().next().unwrap();
        let distances = self.bfs(start);
        distances.len() == self.nodes.len()
    }
}