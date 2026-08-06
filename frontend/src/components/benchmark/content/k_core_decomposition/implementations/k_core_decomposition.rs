use std::collections::{HashMap, HashSet};

pub struct KCoreDecomposition {
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl KCoreDecomposition {
    pub fn new() -> Self {
        KCoreDecomposition {
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

    pub fn k_core_decomposition(&self) -> HashMap<i32, i32> {
        let mut core = HashMap::new();
        let mut degree: HashMap<i32, usize> = HashMap::new();

        for &node in &self.nodes {
            degree.insert(node, self.adjacency[&node].len());
        }

        let max_degree = *degree.values().max().unwrap_or(&0);
        let mut buckets: Vec<Vec<i32>> = vec![Vec::new(); max_degree + 1];

        for &node in &self.nodes {
            buckets[degree[&node]].push(node);
        }

        let mut removed = HashSet::new();
        let mut k = 0;

        for i in 0..=max_degree {
            let mut idx = 0;
            while idx < buckets[i].len() {
                let node = buckets[i][idx];
                idx += 1;

                if removed.contains(&node) {
                    continue;
                }

                if i > k {
                    k = i;
                }
                core.insert(node, k);
                removed.insert(node);

                for &neighbor in &self.adjacency[&node] {
                    if !removed.contains(&neighbor) {
                        let deg = degree.get_mut(&neighbor).unwrap();
                        *deg -= 1;
                        if *deg <= i {
                            buckets[*deg].push(neighbor);
                        }
                    }
                }
            }
        }

        for &node in &self.nodes {
            if !core.contains_key(&node) {
                core.insert(node, 0);
            }
        }

        core
    }

    pub fn get_k_core(&self, k: i32) -> Vec<i32> {
        let core = self.k_core_decomposition();
        let mut result = Vec::new();

        for &node in &self.nodes {
            if core[&node] >= k {
                result.push(node);
            }
        }

        result
    }
}