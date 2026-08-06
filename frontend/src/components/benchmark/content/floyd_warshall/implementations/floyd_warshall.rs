use std::collections::{HashMap, HashSet};

pub struct FloydWarshall {
    nodes: HashMap<i32, HashSet<i32>>,
    dist: HashMap<i32, HashMap<i32, i32>>,
    next_node: HashMap<i32, HashMap<i32, i32>>,
}

impl FloydWarshall {
    pub fn new() -> Self {
        FloydWarshall {
            nodes: HashMap::new(),
            dist: HashMap::new(),
            next_node: HashMap::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.nodes.entry(u).or_insert_with(HashSet::new).insert(v);
        self.nodes.entry(v).or_insert_with(HashSet::new).insert(u);

        self.dist.entry(u).or_insert_with(HashMap::new).insert(v, weight);
        self.dist.entry(v).or_insert_with(HashMap::new).insert(u, weight);

        self.next_node.entry(u).or_insert_with(HashMap::new).insert(v, v);
        self.next_node.entry(v).or_insert_with(HashMap::new).insert(u, u);
    }

    pub fn add_directed_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.nodes.entry(u).or_insert_with(HashSet::new).insert(v);
        self.nodes.entry(v).or_insert_with(HashSet::new);

        self.dist.entry(u).or_insert_with(HashMap::new).insert(v, weight);

        self.next_node.entry(u).or_insert_with(HashMap::new).insert(v, v);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32, i32)], directed: bool) {
        for &(u, v, weight) in edges {
            if directed {
                self.add_directed_edge(u, v, weight);
            } else {
                self.add_edge(u, v, weight);
            }
        }
    }

    fn get_all_nodes(&self) -> Vec<i32> {
        self.nodes.keys().cloned().collect()
    }

    fn initialize(&mut self) {
        let all_nodes = self.get_all_nodes();

        for &u in &all_nodes {
            self.dist.entry(u).or_insert_with(HashMap::new);
            self.next_node.entry(u).or_insert_with(HashMap::new);

            for &v in &all_nodes {
                if u == v {
                    self.dist.get_mut(&u).unwrap().insert(v, 0);
                } else if !self.dist.get(&u).unwrap().contains_key(&v) {
                    self.dist.get_mut(&u).unwrap().insert(v, i32::MAX);
                }
            }
        }
    }

    pub fn all_pairs_shortest_paths(&mut self) {
        self.initialize();
        let all_nodes = self.get_all_nodes();

        for &k in &all_nodes {
            for &i in &all_nodes {
                for &j in &all_nodes {
                    let dist_ik = *self.dist.get(&i).unwrap().get(&k).unwrap();
                    let dist_kj = *self.dist.get(&k).unwrap().get(&j).unwrap();
                    let dist_ij = *self.dist.get(&i).unwrap().get(&j).unwrap();

                    if dist_ik != i32::MAX && dist_kj != i32::MAX && dist_ik + dist_kj < dist_ij {
                        self.dist.get_mut(&i).unwrap().insert(j, dist_ik + dist_kj);
                        let next = *self.next_node.get(&i).unwrap().get(&k).unwrap();
                        self.next_node.get_mut(&i).unwrap().insert(j, next);
                    }
                }
            }
        }
    }

    pub fn shortest_path(&self, u: i32, v: i32) -> i32 {
        if let Some(dist_u) = self.dist.get(&u) {
            if let Some(&d) = dist_u.get(&v) {
                return d;
            }
        }
        i32::MAX
    }

    pub fn get_path(&self, u: i32, v: i32) -> Vec<i32> {
        if let Some(next_u) = self.next_node.get(&u) {
            if !next_u.contains_key(&v) {
                return Vec::new();
            }
        } else {
            return Vec::new();
        }

        let mut path = vec![u];
        let mut current = u;

        while current != v {
            current = *self.next_node.get(&current).unwrap().get(&v).unwrap();
            path.push(current);
        }

        path
    }

    pub fn get_all_distances(&self) -> &HashMap<i32, HashMap<i32, i32>> {
        &self.dist
    }

    pub fn has_negative_cycle(&self) -> bool {
        let all_nodes = self.get_all_nodes();

        for &i in &all_nodes {
            if let Some(dist_i) = self.dist.get(&i) {
                if let Some(&d) = dist_i.get(&i) {
                    if d < 0 {
                        return true;
                    }
                }
            }
        }
        false
    }
}