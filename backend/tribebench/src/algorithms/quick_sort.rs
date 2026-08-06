use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct QuickSort;

impl AlgorithmRunner for QuickSort {
    fn aliases(&self) -> &'static [&'static str] {
        &["quick-sort", "quicksort", "qs"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        let mut arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let total_work = n * (n as f64).log2().ceil() as usize;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut iter_count = 0_usize;

        fn quick_sort_with_sampling(
            arr: &mut [usize],
            operations: &mut u64,
            samples: &mut Vec<MetricsPoint>,
            sample_interval: usize,
            work_done: &mut usize,
            iter_count: &mut usize,
        ) {
            if arr.len() <= 1 {
                return;
            }

            *iter_count += 1;
            let pivot_index = partition(arr, operations);
            *operations += 1;

            *work_done += arr.len();
            
            if *work_done % sample_interval == 0 {
                let progress = (*work_done as f64 / (sample_interval * 200) as f64).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: *operations as f64 
                });
            }

            let (left, right) = arr.split_at_mut(pivot_index);
            
            if left.len() > 1 {
                quick_sort_with_sampling(
                    left, 
                    operations, 
                    samples, 
                    sample_interval, 
                    work_done, 
                    iter_count
                );
            }
            
            if right.len() > 1 {
                quick_sort_with_sampling(
                    &mut right[1..], 
                    operations, 
                    samples, 
                    sample_interval, 
                    work_done, 
                    iter_count
                );
            }
        }

        fn partition(arr: &mut [usize], operations: &mut u64) -> usize {
            let len = arr.len();
            if len == 0 {
                return 0;
            }

            let pivot_idx = choose_pivot(arr);
            arr.swap(pivot_idx, len - 1);
            *operations += 1;

            let pivot = arr[len - 1];
            let mut i = 0;

            for j in 0..len - 1 {
                *operations += 1;
                if arr[j] <= pivot {
                    arr.swap(i, j);
                    *operations += 1;
                    i += 1;
                }
            }

            arr.swap(i, len - 1);
            *operations += 1;
            i
        }

        fn choose_pivot(arr: &[usize]) -> usize {
            let len = arr.len();
            if len <= 2 {
                return len - 1;
            }

            let mid = len / 2;
            let mut candidates = vec![(0, arr[0]), (mid, arr[mid]), (len - 1, arr[len - 1])];
            candidates.sort_by(|a, b| a.1.cmp(&b.1));
            candidates[1].0
        }

        quick_sort_with_sampling(
            &mut arr,
            &mut operations,
            &mut samples,
            sample_interval,
            &mut work_done,
            &mut iter_count,
        );

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

        if sample {
            log_debug_fields!("quick_sort", "Quick Sort sampling completed", fields!(
                "array_size" => n as i64,
                "iterations" => iter_count as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "sorted" => is_sorted(&arr),
            ));
        }

        RunOutput::new(
            time_ms,
            operations,
            n,
            samples,
        )
    }
}

fn is_sorted(arr: &[usize]) -> bool {
    arr.windows(2).all(|w| w[0] <= w[1])
}

#[cfg(test)]
impl QuickSort {
    pub fn sort(&self, arr: &mut [usize]) {
        if arr.len() <= 1 {
            return;
        }

        let pivot_index = partition_test(arr);
        let (left, right) = arr.split_at_mut(pivot_index);
        
        if left.len() > 1 {
            self.sort(left);
        }
        if right.len() > 1 {
            self.sort(&mut right[1..]);
        }
    }

    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }
}

#[cfg(test)]
fn partition_test(arr: &mut [usize]) -> usize {
    let len = arr.len();
    if len == 0 {
        return 0;
    }

    let pivot = arr[len - 1];
    let mut i = 0;

    for j in 0..len - 1 {
        if arr[j] <= pivot {
            arr.swap(i, j);
            i += 1;
        }
    }

    arr.swap(i, len - 1);
    i
}