use std::collections::{HashMap, HashSet, VecDeque};

pub struct DFS {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl DFS {
    pub fn new() -> Self {
        DFS {
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

    pub fn add_directed_edge(&mut self, u: i32, v: i32) {
        self.adjacency.entry(u).or_insert_with(HashSet::new).insert(v);
        self.nodes.insert(u);
        self.nodes.insert(v);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)], directed: bool) {
        for &(u, v) in edges {
            if directed {
                self.add_directed_edge(u, v);
            } else {
                self.add_edge(u, v);
            }
        }
    }

    fn dfs_recursive_util(&self, node: i32, visited: &mut HashSet<i32>, order: &mut Vec<i32>) {
        visited.insert(node);
        order.push(node);

        if let Some(neighbors) = self.adjacency.get(&node) {
            for &neighbor in neighbors {
                if !visited.contains(&neighbor) {
                    self.dfs_recursive_util(neighbor, visited, order);
                }
            }
        }
    }

    pub fn dfs_recursive(&self, start: i32) -> Vec<i32> {
        let mut order = Vec::new();
        let mut visited = HashSet::new();
        self.dfs_recursive_util(start, &mut visited, &mut order);
        order
    }

    pub fn dfs_iterative(&self, start: i32) -> Vec<i32> {
        let mut order = Vec::new();
        let mut visited = HashSet::new();
        let mut stack = Vec::new();

        stack.push(start);

        while let Some(node) = stack.pop() {
            if visited.contains(&node) {
                continue;
            }

            visited.insert(node);
            order.push(node);

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &neighbor in neighbors {
                    if !visited.contains(&neighbor) {
                        stack.push(neighbor);
                    }
                }
            }
        }

        order
    }

    pub fn dfs_path(&self, start: i32, goal: i32) -> Vec<i32> {
        let mut parent = HashMap::new();
        let mut visited = HashSet::new();
        let mut stack = Vec::new();

        parent.insert(start, -1);
        stack.push(start);

        while let Some(node) = stack.pop() {
            if visited.contains(&node) {
                continue;
            }
            visited.insert(node);

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
                    if !visited.contains(&neighbor) {
                        parent.insert(neighbor, node);
                        stack.push(neighbor);
                    }
                }
            }
        }

        Vec::new()
    }

    pub fn find_components(&self) -> Vec<Vec<i32>> {
        let mut components = Vec::new();
        let mut visited = HashSet::new();

        for &node in &self.nodes {
            if !visited.contains(&node) {
                let mut component = Vec::new();
                self.dfs_recursive_util(node, &mut visited, &mut component);
                components.push(component);
            }
        }

        components
    }

    pub fn is_connected(&self) -> bool {
        if self.nodes.is_empty() {
            return true;
        }

        let start = *self.nodes.iter().next().unwrap();
        let mut visited = HashSet::new();
        let mut order = Vec::new();
        self.dfs_recursive_util(start, &mut visited, &mut order);

        visited.len() == self.nodes.len()
    }

    pub fn has_cycle(&self) -> bool {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for &node in &self.nodes {
            if !visited.contains(&node) {
                if self.has_cycle_util(node, &mut visited, &mut rec_stack, -1) {
                    return true;
                }
            }
        }
        false
    }

    fn has_cycle_util(
        &self,
        node: i32,
        visited: &mut HashSet<i32>,
        rec_stack: &mut HashSet<i32>,
        parent: i32,
    ) -> bool {
        visited.insert(node);
        rec_stack.insert(node);

        if let Some(neighbors) = self.adjacency.get(&node) {
            for &neighbor in neighbors {
                if rec_stack.contains(&neighbor) && neighbor != parent {
                    return true;
                }

                if !visited.contains(&neighbor) {
                    if self.has_cycle_util(neighbor, visited, rec_stack, node) {
                        return true;
                    }
                }
            }
        }

        rec_stack.remove(&node);
        false
    }
}