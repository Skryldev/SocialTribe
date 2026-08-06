use std::collections::{HashMap, HashSet};

pub struct TriangleDetection {
    adjacency_list: HashMap<i32, HashSet<i32>>,
}

impl TriangleDetection {
    pub fn new() -> Self {
        TriangleDetection {
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

    pub fn count_triangles(&self) -> usize {
        let mut count = 0;
        for (&u, neighbors) in &self.adjacency_list {
            for &v in neighbors {
                if v > u {
                    for &w in neighbors {
                        if w > v {
                            if let Some(neighbors_v) = self.adjacency_list.get(&v) {
                                if neighbors_v.contains(&w) {
                                    count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
        count
    }

    pub fn find_triangles(&self) -> Vec<(i32, i32, i32)> {
        let mut triangles = Vec::new();
        for (&u, neighbors) in &self.adjacency_list {
            for &v in neighbors {
                if v > u {
                    for &w in neighbors {
                        if w > v {
                            if let Some(neighbors_v) = self.adjacency_list.get(&v) {
                                if neighbors_v.contains(&w) {
                                    triangles.push((u, v, w));
                                }
                            }
                        }
                    }
                }
            }
        }
        triangles
    }

    pub fn has_triangle(&self) -> bool {
        for (&u, neighbors) in &self.adjacency_list {
            for &v in neighbors {
                if v > u {
                    for &w in neighbors {
                        if w > v {
                            if let Some(neighbors_v) = self.adjacency_list.get(&v) {
                                if neighbors_v.contains(&w) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        false
    }
}