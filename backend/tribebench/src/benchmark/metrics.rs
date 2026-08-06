use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct MetricsPoint {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize)]
pub struct BenchmarkMetrics {
    pub iterations: Vec<MetricsPoint>,
    pub memory_snapshots: Vec<MetricsPoint>,
    pub operation_counts: Vec<MetricsPoint>,
    pub timestamps: Vec<MetricsPoint>,
}

#[derive(Debug, Serialize)]
pub struct DetailedRunData {
    pub run_number: usize,
    pub time_ms: f64,
    pub memory_kb: f64,
    pub operations: u64,
    pub visited_nodes: usize,
    pub progress_samples: Vec<MetricsPoint>,
}

#[derive(Debug, Serialize)]
pub struct BenchmarkStats {
    pub algorithm: String,
    pub input_size: usize,
    pub runs: usize,
    pub time: TimeStats,
    pub memory: MemoryStats,
    pub operations: OpStats,
    pub metrics: BenchmarkMetrics,
    pub detailed_runs: Vec<DetailedRunData>,
    pub verification_data: VerificationData,
}

#[derive(Debug, Serialize)]
pub struct TimeStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub median: f64,
    pub std_dev: f64,
    pub percentiles: Percentiles,
}

#[derive(Debug, Serialize)]
pub struct Percentiles {
    pub p50: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
}

#[derive(Debug, Serialize)]
pub struct MemoryStats {
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub median: f64,
    pub per_vertex: f64,
    pub peak_during_runs: f64,
}

#[derive(Debug, Serialize)]
pub struct OpStats {
    pub min: u64,
    pub max: u64,
    pub mean: u64,
    pub per_vertex: f64,
    pub throughput: u64,
    pub time_per_op_us: f64,
}

#[derive(Debug, Serialize)]
pub struct VerificationData {
    pub rust_version: String,
    pub platform: String,
    pub timestamp: String,
    pub cpu_cores: usize,
    pub total_memory_mb: u64,
}