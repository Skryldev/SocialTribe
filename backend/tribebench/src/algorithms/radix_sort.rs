use super::{AlgorithmRunner, RunOutput};
use crate::{
    benchmark::metrics::MetricsPoint,
    graph::Edge,
    log_debug_fields, fields,
};
use std::time::Instant;

pub struct RadixSort;

impl AlgorithmRunner for RadixSort {
    fn aliases(&self) -> &'static [&'static str] {
        &["radix-sort", "radixsort", "rs"]
    }

    fn run(&self, graph: &[Vec<Edge>], sample: bool) -> RunOutput {
        let n = graph.len();
        
        let arr: Vec<usize> = (0..n).map(|i| graph[i].len()).collect();
        
        let max_val = *arr.iter().max().unwrap_or(&0);
        let max_digits = if max_val > 0 {
            (max_val as f64).log10().floor() as usize + 1
        } else {
            1
        };

        let mut operations: u64 = 0;
        let mut samples = Vec::new();
        let start = Instant::now();

        if sample {
            samples.push(MetricsPoint { 
                x: 0.0, 
                y: operations as f64 
            });
        }

        let total_work = n * max_digits;
        let sample_interval = if sample && total_work > 0 {
            let target_points = std::cmp::min(200, std::cmp::max(10, total_work / 100));
            std::cmp::max(1, total_work / target_points)
        } else {
            total_work + 1
        };

        let mut work_done = 0_usize;
        let mut result = arr.clone();

        fn counting_sort_by_digit(
            arr: &[usize],
            exp: usize,
            operations: &mut u64,
        ) -> Vec<usize> {
            let mut output = vec![0; arr.len()];
            let mut count = vec![0; 10];

            for &num in arr {
                let digit = (num / exp) % 10;
                count[digit] += 1;
                *operations += 1;
            }

            for i in 1..10 {
                count[i] += count[i - 1];
                *operations += 1;
            }

            for &num in arr.iter().rev() {
                let digit = (num / exp) % 10;
                count[digit] -= 1;
                output[count[digit]] = num;
                *operations += 1;
            }

            output
        }

        let mut exp = 1;
        let mut digit_count = 0;

        while exp <= max_val || digit_count < max_digits {
            digit_count += 1;
            operations += 1;

            result = counting_sort_by_digit(&result, exp, &mut operations);
            work_done += n;

            if sample && work_done % sample_interval == 0 {
                let progress = (work_done as f64 / total_work as f64 * 100.0).min(100.0);
                samples.push(MetricsPoint { 
                    x: progress, 
                    y: operations as f64 
                });
            }

            exp *= 10;
        }

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
            log_debug_fields!("radix_sort", "Radix Sort sampling completed", fields!(
                "array_size" => n as i64,
                "max_value" => max_val as i64,
                "max_digits" => max_digits as i64,
                "sample_points" => samples.len() as i64,
                "total_ops" => operations as i64,
                "sorted" => is_sorted(&result),
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
impl RadixSort {
    pub fn sort(&self, arr: &[usize]) -> Vec<usize> {
        if arr.is_empty() {
            return vec![];
        }

        let max_val = *arr.iter().max().unwrap();
        let mut result = arr.to_vec();
        let mut exp = 1;
        let mut ops = 0;

        while exp <= max_val {
            result = counting_sort_by_digit_test(&result, exp, &mut ops);
            exp *= 10;
        }

        result
    }

    pub fn is_sorted(&self, arr: &[usize]) -> bool {
        is_sorted(arr)
    }
}

#[cfg(test)]
fn counting_sort_by_digit_test(
    arr: &[usize],
    exp: usize,
    operations: &mut u64,
) -> Vec<usize> {
    let mut output = vec![0; arr.len()];
    let mut count = vec![0; 10];

    for &num in arr {
        let digit = (num / exp) % 10;
        count[digit] += 1;
        *operations += 1;
    }

    for i in 1..10 {
        count[i] += count[i - 1];
        *operations += 1;
    }

    for &num in arr.iter().rev() {
        let digit = (num / exp) % 10;
        count[digit] -= 1;
        output[count[digit]] = num;
        *operations += 1;
    }

    output
}