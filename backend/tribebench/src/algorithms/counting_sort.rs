use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct CountingSort;

impl AlgorithmRunner for CountingSort {
    fn aliases(&self) -> &'static [&'static str] {
        &["counting-sort", "countingsort", "cs"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Build an array from graph degrees
        // ============================================================
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();
        
        // Find max value
        let max_val = *arr.iter().max().unwrap_or(&0);

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        // Initial sample at 0% progress
        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        // ============================================================
        // ✅ Counting Sort Algorithm
        // ============================================================
        let total_work = n + max_val + 1;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut result = vec![0; n];

        // Step 1: Count occurrences of each value
        let mut count = vec![0; max_val + 1];
        for &val in &arr {
            count[val] += 1;
            operations += 1;
        }
        work_done += n;

        // Sample after counting
        if sample && work_done % sample_interval == 0 {
            let progress = (work_done as f64 / total_work as f64 * 100.0).min(100.0);
            samples.push(MetricsPoint { 
                x: progress, 
                y: operations as f64 
            });
        }

        // Step 2: Cumulative count
        for i in 1..=max_val {
            count[i] += count[i - 1];
            operations += 1;
        }
        work_done += max_val + 1;

        // Sample after cumulative
        if sample && work_done % sample_interval == 0 {
            let progress = (work_done as f64 / total_work as f64 * 100.0).min(100.0);
            samples.push(MetricsPoint { 
                x: progress, 
                y: operations as f64 
            });
        }

        // Step 3: Build output array (stable sort)
        for &val in arr.iter().rev() {
            operations += 1;
            count[val] -= 1;
            result[count[val]] = val;
            operations += 1;
        }
        work_done += n;

        // Final sample at 100%
        if sample {
            let last_sample = samples.last();
            if last_sample.is_none() || last_sample.unwrap().x < 99.9 {
                samples.push(MetricsPoint { 
                    x: 100.0, 
                    y: operations as f64 
                });
            } else if let Some(last) = samples.last_mut() {
                last.x = 100.0;
            }
        }

        let time_ms = start.elapsed().as_secs_f64() * 1000.0;

        // ============================================================
        // ✅ Debug: Log sampling info
        // ============================================================
        if sample {
            log_debug_fields!("counting_sort", "Counting Sort sampling completed", fields!(
                "array_size" => n as i64,
                "max_value" => max_val as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "sorted" => is_sorted(&result),
            ));
        }

        // ============================================================
        // ✅ Return result
        // ============================================================
        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

// ============================================================
// ✅ Helper functions for testing
// ============================================================

fn is_sorted(arr: &[usize]) -> bool {
    arr.windows(2).all(|w| w[0] <= w[1])
}

#[cfg(test)]
impl CountingSort {
    /// Sort an array using counting sort (for testing)
    pub fn sort(&self, arr: &[usize]) -> Vec<usize> {
        if arr.is_empty() {
            return vec![];
        }

        let max_val = *arr.iter().max().unwrap();
        let mut count = vec![0; max_val + 1];
        
        for &val in arr {
            count[val] += 1;
        }

        for i in 1..=max_val {
            count[i] += count[i - 1];
        }

        let mut result = vec![0; arr.len()];
        for &val in arr.iter().rev() {
            count[val] -= 1;
            result[count[val]] = val;
        }

        result
    }

    /// Check if array is sorted (for testing)
    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }
}