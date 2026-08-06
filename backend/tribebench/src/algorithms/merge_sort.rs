use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct MergeSort;

impl AlgorithmRunner for MergeSort {
    fn aliases(&self) -> &'static [&'static str] {
        &["merge-sort", "mergesort", "ms"]
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
        let mut merge_count = 0_usize;

        fn merge_sort_with_sampling(
            arr: &mut [usize],
            operations: &mut u64,
            samples: &mut Vec<MetricsPoint>,
            sample_interval: usize,
            work_done: &mut usize,
            merge_count: &mut usize,
        ) {
            let len = arr.len();
            if len <= 1 {
                return;
            }

            let mid = len / 2;
            *operations += 1;

            let (left, right) = arr.split_at_mut(mid);
            
            merge_sort_with_sampling(
                left,
                operations,
                samples,
                sample_interval,
                work_done,
                merge_count,
            );
            
            merge_sort_with_sampling(
                right,
                operations,
                samples,
                sample_interval,
                work_done,
                merge_count,
            );

            let mut temp = vec![0; len];
            *operations += len as u64;

            let mut i = 0;
            let mut j = 0;
            let mut k = 0;

            while i < left.len() && j < right.len() {
                *operations += 1;
                if left[i] <= right[j] {
                    temp[k] = left[i];
                    i += 1;
                } else {
                    temp[k] = right[j];
                    j += 1;
                }
                k += 1;
                *operations += 1;
            }

            while i < left.len() {
                *operations += 1;
                temp[k] = left[i];
                i += 1;
                k += 1;
            }

            while j < right.len() {
                *operations += 1;
                temp[k] = right[j];
                j += 1;
                k += 1;
            }

            for (idx, &val) in temp.iter().enumerate() {
                arr[idx] = val;
                *operations += 1;
            }

            *merge_count += 1;
            *work_done += len;

            if sample_interval > 0 && *work_done % sample_interval == 0 {
                let progress = ((*work_done as f64) / (sample_interval * 100) as f64 * 100.0).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: *operations as f64 
                });
            }
        }

        merge_sort_with_sampling(
            &mut arr,
            &mut operations,
            &mut samples,
            sample_interval,
            &mut work_done,
            &mut merge_count,
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
            log_debug_fields!("merge_sort", "Merge Sort sampling completed", fields!(
                "array_size" => n as i64,
                "merge_count" => merge_count as i64,
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
impl MergeSort {
    pub fn sort(&self, arr: &mut [usize]) {
        let len = arr.len();
        if len <= 1 {
            return;
        }

        let mid = len / 2;
        let (left, right) = arr.split_at_mut(mid);
        
        self.sort(left);
        self.sort(right);

        let mut temp = vec![0; len];
        let mut i = 0;
        let mut j = 0;
        let mut k = 0;

        while i < left.len() && j < right.len() {
            if left[i] <= right[j] {
                temp[k] = left[i];
                i += 1;
            } else {
                temp[k] = right[j];
                j += 1;
            }
            k += 1;
        }

        while i < left.len() {
            temp[k] = left[i];
            i += 1;
            k += 1;
        }

        while j < right.len() {
            temp[k] = right[j];
            j += 1;
            k += 1;
        }

        for (idx, &val) in temp.iter().enumerate() {
            arr[idx] = val;
        }
    }

    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }
}