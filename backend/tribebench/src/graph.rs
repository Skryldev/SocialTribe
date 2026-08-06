// src/graph.rs

use rand::Rng;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub node: usize,
    pub weight: u32,
}

#[derive(Default)]
pub struct GraphGenerator;

impl GraphGenerator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Generates a random connected undirected weighted graph.
    ///
    /// Connectivity is guaranteed via a spanning tree seeded before random
    /// edges are added. `density` controls the edge-to-vertex ratio:
    /// - `"sparse"`   → ~1.5× edges per vertex
    /// - `"moderate"` → ~3×
    /// - `"dense"`    → ~6×
    pub fn generate_connected_graph(&self, size: usize, density: &str) -> Vec<Vec<Edge>> {
        assert!(size >= 2, "graph must have at least 2 vertices");

        let mut graph = vec![vec![]; size];
        let mut rng = rand::thread_rng();

        // Phase 1: spanning tree — guarantees full connectivity
        for i in 0..size - 1 {
            let weight = rng.gen_range(1..=100);
            graph[i].push(Edge { node: i + 1, weight });
            graph[i + 1].push(Edge { node: i, weight });
        }

        // Phase 2: additional random edges up to target density
        let target_edges = match density {
            "sparse"   => size * 3 / 2,
            "dense"    => size * 6,
            _          => size * 3, // "moderate" + unknown → moderate
        };

        let needed = target_edges.saturating_sub(size - 1);
        let max_attempts = needed * 10;
        let mut added = 0;

        for _ in 0..max_attempts {
            if added >= needed {
                break;
            }
            let u = rng.gen_range(0..size);
            let v = rng.gen_range(0..size);

            if u != v && !graph[u].iter().any(|e| e.node == v) {
                let weight = rng.gen_range(1..=100);
                graph[u].push(Edge { node: v, weight });
                graph[v].push(Edge { node: u, weight });
                added += 1;
            }
        }

        tracing::debug!(
            vertices = size,
            edges = (size - 1) + added,
            density,
            "graph generated"
        );

        graph
    }
}