use std::collections::{HashMap, HashSet, BinaryHeap};
use std::cmp::Ordering;

#[derive(Clone)]
struct Edge {
    u: i32,
    v: i32,
    weight: i32,
}

#[derive(Copy, Clone, Eq, PartialEq)]
struct State {
    cost: i32,
    node: i32,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.cmp(&self.cost)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct Johnson {
    edges: Vec<Edge>,
    adjacency: HashMap<i32, HashSet<i32>>,
    nodes: HashSet<i32>,
}

impl Johnson {
    pub fn new() -> Self {
        Johnson {
            edges: Vec::new(),
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.edges.push(Edge { u, v, weight });
        self.adjacency.entry(u).or_insert_with(HashSet::new).insert(v);
        self.nodes.insert(u);
        self.nodes.insert(v);
    }

    pub fn build_from_edges(&mut self, edge_list: &[(i32, i32, i32)]) {
        for &(u, v, weight) in edge_list {
            self.add_edge(u, v, weight);
        }
    }

    fn bellman_ford(&self, source: i32) -> Option<HashMap<i32, i32>> {
        let mut dist: HashMap<i32, i32> = HashMap::new();
        for &node in &self.nodes {
            dist.insert(node, i32::MAX);
        }
        dist.insert(source, 0);

        for _ in 0..self.nodes.len() - 1 {
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

    fn dijkstra(&self, source: i32, h: &HashMap<i32, i32>) -> HashMap<i32, i32> {
        let mut dist: HashMap<i32, i32> = HashMap::new();
        for &node in &self.nodes {
            dist.insert(node, i32::MAX);
        }
        dist.insert(source, 0);

        let mut heap = BinaryHeap::new();
        heap.push(State { cost: 0, node: source });

        while let Some(State { cost, node }) = heap.pop() {
            if cost != dist[&node] {
                continue;
            }

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &v in neighbors {
                    let weight = self.edges.iter()
                        .find(|e| e.u == node && e.v == v)
                        .map(|e| e.weight)
                        .unwrap_or(0);
                    
                    let new_cost = dist[&node] + weight + h[&node] - h[&v];
                    if new_cost < dist[&v] {
                        dist.insert(v, new_cost);
                        heap.push(State { cost: new_cost, node: v });
                    }
                }
            }
        }

        let mut result = HashMap::new();
        for &node in &self.nodes {
            result.insert(node, dist[&node] - h[&source] + h[&node]);
        }
        result
    }

    pub fn all_pairs_shortest_paths(&self) -> Option<HashMap<i32, HashMap<i32, i32>>> {
        let max_node = *self.nodes.iter().max().unwrap();
        let new_node = max_node + 1;

        let mut temp_johnson = self.clone();
        for &node in &self.nodes {
            temp_johnson.add_edge(new_node, node, 0);
        }

        let h = temp_johnson.bellman_ford(new_node)?;

        let mut result = HashMap::new();
        for &node in &self.nodes {
            if node == new_node {
                continue;
            }
            result.insert(node, self.dijkstra(node, &h));
        }

        Some(result)
    }
}

impl Clone for Johnson {
    fn clone(&self) -> Self {
        Johnson {
            edges: self.edges.clone(),
            adjacency: self.adjacency.clone(),
            nodes: self.nodes.clone(),
        }
    }
}