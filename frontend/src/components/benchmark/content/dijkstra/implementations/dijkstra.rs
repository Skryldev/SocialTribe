use std::collections::{HashMap, HashSet, BinaryHeap};
use std::cmp::Ordering;

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

pub struct Dijkstra {
    adjacency: HashMap<i32, Vec<(i32, i32)>>,
    nodes: HashSet<i32>,
}

impl Dijkstra {
    pub fn new() -> Self {
        Dijkstra {
            adjacency: HashMap::new(),
            nodes: HashSet::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.adjacency.entry(u).or_insert_with(Vec::new).push((v, weight));
        self.adjacency.entry(v).or_insert_with(Vec::new).push((u, weight));
        self.nodes.insert(u);
        self.nodes.insert(v);
    }

    pub fn add_directed_edge(&mut self, u: i32, v: i32, weight: i32) {
        self.adjacency.entry(u).or_insert_with(Vec::new).push((v, weight));
        self.nodes.insert(u);
        self.nodes.insert(v);
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

    pub fn shortest_path(&self, source: i32) -> HashMap<i32, i32> {
        let mut dist = HashMap::new();
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
                for &(v, weight) in neighbors {
                    let next_cost = cost + weight;
                    if next_cost < dist[&v] {
                        dist.insert(v, next_cost);
                        heap.push(State { cost: next_cost, node: v });
                    }
                }
            }
        }

        dist
    }

    pub fn shortest_path_with_path(&self, source: i32, target: i32) -> Vec<i32> {
        let mut dist = HashMap::new();
        let mut parent = HashMap::new();

        for &node in &self.nodes {
            dist.insert(node, i32::MAX);
        }
        dist.insert(source, 0);
        parent.insert(source, -1);

        let mut heap = BinaryHeap::new();
        heap.push(State { cost: 0, node: source });

        while let Some(State { cost, node }) = heap.pop() {
            if cost != dist[&node] {
                continue;
            }

            if node == target {
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
                for &(v, weight) in neighbors {
                    let next_cost = cost + weight;
                    if next_cost < dist[&v] {
                        dist.insert(v, next_cost);
                        parent.insert(v, node);
                        heap.push(State { cost: next_cost, node: v });
                    }
                }
            }
        }

        Vec::new()
    }

    pub fn all_shortest_paths(&self, source: i32) -> HashMap<i32, Vec<i32>> {
        let mut paths = HashMap::new();
        let mut dist = HashMap::new();

        for &node in &self.nodes {
            dist.insert(node, i32::MAX);
        }
        dist.insert(source, 0);
        paths.insert(source, vec![source]);

        let mut heap = BinaryHeap::new();
        heap.push(State { cost: 0, node: source });

        while let Some(State { cost, node }) = heap.pop() {
            if cost != dist[&node] {
                continue;
            }

            if let Some(neighbors) = self.adjacency.get(&node) {
                for &(v, weight) in neighbors {
                    let next_cost = cost + weight;
                    if next_cost < dist[&v] {
                        dist.insert(v, next_cost);
                        let mut new_path = paths[&node].clone();
                        new_path.push(v);
                        paths.insert(v, new_path);
                        heap.push(State { cost: next_cost, node: v });
                    }
                }
            }
        }

        paths
    }
}