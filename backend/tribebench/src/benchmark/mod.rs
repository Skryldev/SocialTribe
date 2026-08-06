pub mod metrics;
pub mod stats;

use crate::{
    algorithms::{AlgorithmRegistry, RunOutput},
    error::BenchmarkError,
    graph::GraphGenerator,
    log_debug_fields, log_error, log_info, log_info_fields, log_warn, fields,
};
use metrics::{BenchmarkMetrics, BenchmarkStats, DetailedRunData, MetricsPoint};
use stats::{aggregate_metrics, calculate_stats};
use sysinfo::System;

pub struct BenchmarkConfig {
    pub algorithm: String,
    pub input_size: usize,
    pub iterations: usize,
    pub warmup_runs: usize,
    pub graph_density: String,
}

impl BenchmarkConfig {
    pub fn new(algorithm: impl Into<String>, input_size: usize) -> Self {
        Self {
            algorithm: algorithm.into(),
            input_size,
            iterations: 7,
            warmup_runs: 3,
            graph_density: "moderate".into(),
        }
    }

    pub fn with_iterations(mut self, n: usize) -> Self {
        self.iterations = n;
        self
    }
    pub fn with_warmup(mut self, n: usize) -> Self {
        self.warmup_runs = n;
        self
    }
}

pub struct BenchmarkEngine<'a> {
    config: BenchmarkConfig,
    registry: &'a AlgorithmRegistry,
}

impl<'a> BenchmarkEngine<'a> {
    pub fn new(config: BenchmarkConfig, registry: &'a AlgorithmRegistry) -> Self {
        Self { config, registry }
    }

    pub async fn run(&self, generator: &GraphGenerator) -> Result<BenchmarkStats, BenchmarkError> {
        let runner = self.registry.resolve(&self.config.algorithm)?;
        let cfg = &self.config;

        log_info_fields!("benchmark", "Benchmark started", fields!(
            "algorithm" => cfg.algorithm.clone(),
            "input_size" => cfg.input_size as i64,
            "iterations" => cfg.iterations as i64,
            "warmup_runs" => cfg.warmup_runs as i64,
            "graph_density" => cfg.graph_density.clone(),
        ));

        let graph = generator.generate_connected_graph(cfg.input_size, &cfg.graph_density);

        // Warmup — results discarded
        log_debug_fields!("benchmark", "Running warmup", fields!(
            "warmup_runs" => cfg.warmup_runs as i64,
        ));
        for _ in 0..cfg.warmup_runs {
            runner.run(&graph, false);
        }

        let mut times = Vec::with_capacity(cfg.iterations);
        let mut memories = Vec::with_capacity(cfg.iterations);
        let mut operations_vec = Vec::with_capacity(cfg.iterations);
        let mut detailed_runs = Vec::with_capacity(cfg.iterations);
        let mut peak_memory = 0.0_f64;

        let mut all_iter_metrics: Vec<Vec<MetricsPoint>> = Vec::new();
        let mut all_mem_metrics: Vec<Vec<MetricsPoint>> = Vec::new();
        let mut all_ops_metrics: Vec<Vec<MetricsPoint>> = Vec::new();
        let mut all_ts_metrics: Vec<Vec<MetricsPoint>> = Vec::new();

        for run_num in 0..cfg.iterations {
            let fresh_graph = generator.generate_connected_graph(cfg.input_size, &cfg.graph_density);

            let mut sys = System::new_all();
            sys.refresh_memory();
            let start_mem = sys.used_memory();

            let output: RunOutput = runner.run(&fresh_graph, true);

            sys.refresh_memory();
            let mem_used = (sys.used_memory().saturating_sub(start_mem)) as f64 / 1024.0;
            peak_memory = peak_memory.max(mem_used);

            times.push(output.time_ms);
            memories.push(mem_used);
            operations_vec.push(output.operations);

            let samples = output.samples.clone();

            detailed_runs.push(DetailedRunData {
                run_number: run_num + 1,
                time_ms: output.time_ms,
                memory_kb: mem_used,
                operations: output.operations,
                visited_nodes: output.visited_nodes,
                progress_samples: samples.clone(),
            });

            let num_samples = samples.len();
            
            if num_samples > 0 {
                let ops_series: Vec<MetricsPoint> = samples
                    .iter()
                    .enumerate()
                    .map(|(i, p)| {
                        let cum_ops = output.cumulative_ops.get(i).copied().unwrap_or(p.y as u64);
                        MetricsPoint {
                            x: p.x,
                            y: cum_ops as f64,
                        }
                    })
                    .collect();

                let ts_series: Vec<MetricsPoint> = samples
                    .iter()
                    .enumerate()
                    .map(|(i, p)| {
                        let cum_time = output.cumulative_time.get(i).copied().unwrap_or_else(|| {
                            output.time_ms * (p.x / 100.0)
                        });
                        MetricsPoint {
                            x: p.x,
                            y: cum_time,
                        }
                    })
                    .collect();

                let mem_series: Vec<MetricsPoint> = samples
                    .iter()
                    .map(|p| MetricsPoint {
                        x: p.x,
                        y: mem_used,
                    })
                    .collect();

                all_iter_metrics.push(samples.clone());
                all_mem_metrics.push(mem_series);
                all_ops_metrics.push(ops_series);
                all_ts_metrics.push(ts_series);
            } else {
                let fallback_points = vec![
                    MetricsPoint { x: 0.0, y: 0.0 },
                    MetricsPoint { x: 50.0, y: (output.operations as f64) / 2.0 },
                    MetricsPoint { x: 100.0, y: output.operations as f64 },
                ];

                let ops_series: Vec<MetricsPoint> = fallback_points
                    .iter()
                    .map(|p| MetricsPoint {
                        x: p.x,
                        y: p.y,
                    })
                    .collect();

                let ts_series: Vec<MetricsPoint> = fallback_points
                    .iter()
                    .map(|p| MetricsPoint {
                        x: p.x,
                        y: output.time_ms * (p.x / 100.0),
                    })
                    .collect();

                let mem_series: Vec<MetricsPoint> = fallback_points
                    .iter()
                    .map(|_| MetricsPoint {
                        x: 0.0,
                        y: mem_used,
                    })
                    .collect();

                all_iter_metrics.push(fallback_points);
                all_mem_metrics.push(mem_series);
                all_ops_metrics.push(ops_series);
                all_ts_metrics.push(ts_series);
            }

            log_debug_fields!("benchmark", "Run complete", fields!(
                "run" => (run_num + 1) as i64,
                "time_ms" => output.time_ms,
                "mem_kb" => mem_used,
                "ops" => output.operations as i64,
                "samples" => samples.len() as i64,
            ));
        }

        let metrics: BenchmarkMetrics = if all_iter_metrics.is_empty() || all_iter_metrics.iter().all(|v| v.is_empty()) {
            log_warn!("benchmark", "No sample data available - creating synthetic metrics");
            BenchmarkMetrics {
                iterations: vec![
                    MetricsPoint { x: 0.0, y: 1.0 },
                    MetricsPoint { x: 50.0, y: 50.0 },
                    MetricsPoint { x: 100.0, y: 100.0 },
                ],
                memory_snapshots: vec![
                    MetricsPoint { x: 0.0, y: memories.first().unwrap_or(&0.0).clone() },
                    MetricsPoint { x: 50.0, y: memories.first().unwrap_or(&0.0).clone() },
                    MetricsPoint { x: 100.0, y: memories.first().unwrap_or(&0.0).clone() },
                ],
                operation_counts: vec![
                    MetricsPoint { x: 0.0, y: 0.0 },
                    MetricsPoint { x: 50.0, y: (operations_vec.first().unwrap_or(&0) / 2) as f64 },
                    MetricsPoint { x: 100.0, y: operations_vec.first().unwrap_or(&0).clone() as f64 },
                ],
                timestamps: vec![
                    MetricsPoint { x: 0.0, y: 0.0 },
                    MetricsPoint { x: 50.0, y: times.first().unwrap_or(&0.0) / 2.0 },
                    MetricsPoint { x: 100.0, y: times.first().unwrap_or(&0.0).clone() },
                ],
            }
        } else {
            aggregate_metrics(&all_iter_metrics, &all_mem_metrics, &all_ops_metrics, &all_ts_metrics)
        };

        let stats = calculate_stats(
            &cfg.algorithm,
            cfg.input_size,
            cfg.iterations,
            times,
            memories,
            operations_vec,
            metrics,
            detailed_runs,
            peak_memory,
        );

        log_info_fields!("benchmark", "Benchmark complete", fields!(
            "algorithm" => cfg.algorithm.clone(),
            "mean_ms" => stats.time.mean,
            "p99_ms" => stats.time.percentiles.p99,
            "min_ms" => stats.time.min,
            "max_ms" => stats.time.max,
            "peak_mem_kb" => peak_memory,
        ));

        Ok(stats)
    }
}