mod bfs;
mod dfs;
mod dijkstra;
mod adamic_adar;
mod closeness_centrality;
mod a_star;
mod bellman_ford;
mod floyd_warshall;
mod johnson;
mod betweenness_centrality;
mod harmonic_centrality;
mod degree_centrality;
mod pagerank;
mod eigenvector_centrality;
mod clustering_coefficient;
mod triangle_detection;
mod louvain;
mod girvan_newman;
mod leiden;
mod k_core_decomposition;
mod resource_allocation;
mod common_neighbors;
mod jaccard_similarity;
mod preferential_attachment;
mod binary_search;
mod quick_sort;
mod merge_sort;
mod counting_sort;
mod radix_sort;
mod avl_tree;
mod red_black_tree;
mod segment_tree;
mod fenwick_tree;
mod union_find;

pub use bfs::Bfs;
pub use bellman_ford::BellmanFord;
pub use dfs::Dfs;
pub use dijkstra::Dijkstra;
pub use adamic_adar::AdamicAdar;
pub use closeness_centrality::ClosenessCentrality;
pub use a_star::AStar;
pub use floyd_warshall::FloydWarshall;
pub use johnson::Johnson;
pub use betweenness_centrality::BetweennessCentrality;
pub use harmonic_centrality::HarmonicCentrality;
pub use degree_centrality::DegreeCentrality;
pub use pagerank::PageRank;
pub use eigenvector_centrality::EigenvectorCentrality;
pub use clustering_coefficient::ClusteringCoefficient;
pub use triangle_detection::TriangleDetection;
pub use louvain::Louvain;
pub use girvan_newman::GirvanNewman;
pub use leiden::Leiden;
pub use k_core_decomposition::KCoreDecomposition;
pub use resource_allocation::ResourceAllocation;
pub use common_neighbors::CommonNeighbors;
pub use jaccard_similarity::JaccardSimilarity;
pub use preferential_attachment::PreferentialAttachment;
pub use binary_search::BinarySearch;
pub use quick_sort::QuickSort;
pub use merge_sort::MergeSort;
pub use counting_sort::CountingSort;
pub use radix_sort::RadixSort;
pub use avl_tree::AvlTree;
pub use red_black_tree::RedBlackTree;
pub use segment_tree::SegmentTree;
pub use fenwick_tree::FenwickTree;
pub use union_find::UnionFind;

use crate::{benchmark::metrics::MetricsPoint, error::BenchmarkError, graph::Edge};
use std::collections::HashMap;

/// The canonical output of a single algorithm execution.
/// Sampling is always enabled here — the engine decides what to do with it.
#[derive(Debug, Clone)]
pub struct RunOutput {
    pub time_ms: f64,
    pub operations: u64,
    pub visited_nodes: usize,
    /// Progress samples: (progress_pct 0–100, cumulative_ops)
    pub samples: Vec<MetricsPoint>,
    /// Cumulative operations at each sample point (for detailed breakdown)
    pub cumulative_ops: Vec<u64>,
    /// Cumulative time at each sample point (for detailed breakdown)
    pub cumulative_time: Vec<f64>,
}

impl RunOutput {
    /// Create a new RunOutput with empty cumulative fields
    pub fn new(
        time_ms: f64,
        operations: u64,
        visited_nodes: usize,
        samples: Vec<MetricsPoint>,
    ) -> Self {
        let cumulative_ops: Vec<u64> = samples
            .iter()
            .map(|p| p.y as u64)
            .collect();
        
        let cumulative_time: Vec<f64> = samples
            .iter()
            .map(|p| (p.x / 100.0) * time_ms)
            .collect();

        Self {
            time_ms,
            operations,
            visited_nodes,
            samples,
            cumulative_ops,
            cumulative_time,
        }
    }

    /// Create a new RunOutput with custom cumulative data
    pub fn with_cumulative(
        time_ms: f64,
        operations: u64,
        visited_nodes: usize,
        samples: Vec<MetricsPoint>,
        cumulative_ops: Vec<u64>,
        cumulative_time: Vec<f64>,
    ) -> Self {
        Self {
            time_ms,
            operations,
            visited_nodes,
            samples,
            cumulative_ops,
            cumulative_time,
        }
    }
}

/// Every graph algorithm must implement this. That's the entire contract.
pub trait AlgorithmRunner: Send + Sync {
    /// Canonical names this algorithm responds to (first entry is canonical).
    fn aliases(&self) -> &'static [&'static str];

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

pub struct AlgorithmRegistry {
    /// alias → runner index in `runners`
    index: HashMap<String, usize>,
    runners: Vec<Box<dyn AlgorithmRunner>>,
}

impl AlgorithmRegistry {
    pub fn new() -> Self {
        Self {
            index: HashMap::new(),
            runners: Vec::new(),
        }
    }

    pub fn register(&mut self, runner: impl AlgorithmRunner + 'static) {
        let idx = self.runners.len();
        for &alias in runner.aliases() {
            self.index.insert(alias.to_lowercase(), idx);
        }
        self.runners.push(Box::new(runner));
    }

    pub fn resolve(&self, name: &str) -> Result<&dyn AlgorithmRunner, BenchmarkError> {
        self.index
            .get(&name.to_lowercase())
            .and_then(|&i| self.runners.get(i))
            .map(|b| b.as_ref())
            .ok_or_else(|| BenchmarkError::UnknownAlgorithm(name.to_string()))
    }

    /// Get all registered algorithm names (for API endpoints)
    pub fn list_algorithms(&self) -> Vec<String> {
        let mut names: Vec<String> = self.index.keys().cloned().collect();
        names.sort();
        names.dedup();
        names
    }
}

impl Default for AlgorithmRegistry {
    fn default() -> Self {
        default_registry()
    }
}

/// Build the default registry with all known algorithms.
/// To add a new algorithm: implement AlgorithmRunner, then add one line here.
pub fn default_registry() -> AlgorithmRegistry {
    let mut r = AlgorithmRegistry::new();
    r.register(Bfs);
    r.register(Dfs);
    r.register(Dijkstra);
    r.register(BellmanFord);
    r.register(AdamicAdar);
    r.register(ClosenessCentrality);
    r.register(AStar);
    r.register(FloydWarshall);
    r.register(Johnson);
    r.register(BetweennessCentrality);
    r.register(HarmonicCentrality);
    r.register(DegreeCentrality);
    r.register(PageRank);
    r.register(EigenvectorCentrality);
    r.register(ClusteringCoefficient);
    r.register(TriangleDetection);
    r.register(Louvain);
    r.register(GirvanNewman);
    r.register(Leiden);
    r.register(KCoreDecomposition);
    r.register(ResourceAllocation);
    r.register(CommonNeighbors);
    r.register(JaccardSimilarity);
    r.register(PreferentialAttachment);
    r.register(BinarySearch);
    r.register(QuickSort);
    r.register(MergeSort);
    r.register(CountingSort);
    r.register(RadixSort);
    r.register(AvlTree);
    r.register(RedBlackTree);
    r.register(SegmentTree);
    r.register(FenwickTree);
    r.register(UnionFind);
    r
}