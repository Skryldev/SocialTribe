use std::collections::{HashMap, HashSet};

#[derive(Clone)]
struct Edge {
    u: i32,
    v: i32,
    weight: i32,
}

pub struct BellmanFord {
    edges: Vec<Edge>,
    vertices: HashSet<i32>,
}

impl BellmanFord {
    pub fn new() -> Self {
        BellmanFord {
            edges: Vec::new(),
            vertices: HashSet::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.edges.push(Edge { u, v, weight });
        self.vertices.insert(u);
        self.vertices.insert(v);
    }

    pub fn build_from_edges(&mut self, edge_list: &[(i32, i32, i32)]) {
        for &(u, v, weight) in edge_list {
            self.add_edge(u, v, weight);
        }
    }

    pub fn shortest_path(&self, source: i32) -> Option<HashMap<i32, i32>> {
        if !self.vertices.contains(&source) {
            return None;
        }

        let mut dist: HashMap<i32, i32> = HashMap::new();
        for &v in &self.vertices {
            dist.insert(v, i32::MAX);
        }
        dist.insert(source, 0);

        for _ in 0..self.vertices.len() - 1 {
            let mut updated = false;
            for edge in &self.edges {
                if let (Some(&du), Some(&dv)) = (dist.get(&edge.u), dist.get(&edge.v)) {
                    if du != i32::MAX && du + edge.weight < dv {
                        dist.insert(edge.v, du + edge.weight);
                        updated = true;
                    }
                }
            }
            if !updated {
                break;
            }
        }

        for edge in &self.edges {
            if let (Some(&du), Some(&dv)) = (dist.get(&edge.u), dist.get(&edge.v)) {
                if du != i32::MAX && du + edge.weight < dv {
                    return None;
                }
            }
        }

        Some(dist)
    }

    pub fn has_negative_cycle(&self) -> bool {
        let start = *self.vertices.iter().next().unwrap();
        self.shortest_path(start).is_none()
    }
}