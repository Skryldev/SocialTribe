use std::collections::{HashMap, HashSet, BinaryHeap};
use std::cmp::Ordering;

#[derive(Copy, Clone, Eq, PartialEq)]
struct State {
    cost: f64,
    node: i32,
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.partial_cmp(&self.cost).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

pub struct AStar {
    graph: HashMap<i32, HashSet<i32>>,
}

impl AStar {
    pub fn new() -> Self {
        AStar {
            graph: HashMap::new(),
        }
    }

    pub fn add_edge(&mut self, u: i32, v: i32) {
        self.graph.entry(u).or_insert_with(HashSet::new).insert(v);
        self.graph.entry(v).or_insert_with(HashSet::new).insert(u);
    }

    pub fn build_from_edges(&mut self, edges: &[(i32, i32)]) {
        for &(u, v) in edges {
            self.add_edge(u, v);
        }
    }

    fn heuristic(&self, node: i32, goal: i32) -> f64 {
        (node - goal).abs() as f64
    }

    pub fn search(&self, start: i32, goal: i32) -> Option<Vec<i32>> {
        if !self.graph.contains_key(&start) || !self.graph.contains_key(&goal) {
            return None;
        }

        let mut open_set = BinaryHeap::new();
        let mut came_from = HashMap::new();
        let mut g_score = HashMap::new();
        let mut f_score = HashMap::new();

        open_set.push(State { cost: 0.0, node: start });
        came_from.insert(start, start);
        g_score.insert(start, 0.0);
        f_score.insert(start, self.heuristic(start, goal));

        while let Some(State { node: current, .. }) = open_set.pop() {
            if current == goal {
                let mut path = Vec::new();
                let mut node = current;
                while node != start {
                    path.push(node);
                    node = *came_from.get(&node)?;
                }
                path.push(start);
                path.reverse();
                return Some(path);
            }

            if let Some(neighbors) = self.graph.get(&current) {
                for &neighbor in neighbors {
                    let tentative_g = g_score.get(&current).unwrap_or(&f64::INFINITY) + 1.0;

                    if tentative_g < *g_score.get(&neighbor).unwrap_or(&f64::INFINITY) {
                        came_from.insert(neighbor, current);
                        g_score.insert(neighbor, tentative_g);
                        let f = tentative_g + self.heuristic(neighbor, goal);
                        f_score.insert(neighbor, f);
                        open_set.push(State { cost: f, node: neighbor });
                    }
                }
            }
        }

        None
    }
}