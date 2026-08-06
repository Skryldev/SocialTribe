use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct BinarySearch;

impl AlgorithmRunner for BinarySearch {
    fn aliases(&self) -> &'static [&'static str] {
        &["binary-search", "binarysearch", "bs"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        // ============================================================
        // ✅ Build a sorted array from graph degrees
        // ============================================================
        let mut arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();
        arr.sort_unstable();
        
        // Choose a target value to search for (median of degrees)
        let target = if n > 0 {
            arr[n / 2]
        } else {
            0
        };

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
        // ✅ Binary Search Algorithm
        // ============================================================
        let mut left = 0;
        let mut right = n.saturating_sub(1);
        let mut found = false;
        let mut found_index = 0;
        let mut iterations = 0;

        // Calculate total work for sampling
        let max_iterations = (n as f64).log2().ceil() as usize + 1;
        let total_work = max_iterations;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(100, std::cmp::max(5, total_work / 5));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        while left <= right {
            iterations += 1;
            operations += 1;

            let mid = left + (right - left) / 2;
            operations += 1;

            if sample && iterations % sample_interval == 0 {
                let progress = (iterations as f64 / max_iterations as f64) * 100.0;
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            if arr[mid] == target {
                found = true;
                found_index = mid;
                operations += 1;
                break;
            } else if arr[mid] < target {
                left = mid + 1;
                operations += 1;
            } else {
                if mid == 0 {
                    break;
                }
                right = mid - 1;
                operations += 1;
            }
        }

        // ============================================================
        // ✅ Final sample with 100% progress
        // ============================================================
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
            log_debug_fields!("binary_search", "Binary Search sampling completed", fields!(
                "array_size" => n as i64,
                "target" => target as i64,
                "found" => found,
                "found_index" => found_index as i64,
                "iterations" => iterations as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
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

#[cfg(test)]
impl BinarySearch {
    /// Perform binary search on a sorted array
    pub fn search(&self, arr: &[usize], target: usize) -> Option<usize> {
        let mut left = 0;
        let mut right = arr.len().saturating_sub(1);

        while left <= right {
            let mid = left + (right - left) / 2;

            if arr[mid] == target {
                return Some(mid);
            } else if arr[mid] < target {
                left = mid + 1;
            } else {
                if mid == 0 {
                    break;
                }
                right = mid - 1;
            }
        }
        None
    }

    /// Get sorted array and target (for testing)
    pub fn prepare_data(&self, graph: &[Vec<Edge>]) -> (Vec<usize>, usize) {
        let n = graph.len();
        let mut arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();
        arr.sort_unstable();
        let target = if n > 0 { arr[n / 2] } else { 0 };
        (arr, target)
    }
}