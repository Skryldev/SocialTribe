use rand::Rng;

pub struct QuickSort;

impl QuickSort {
    fn partition(arr: &mut [i32], low: usize, high: usize) -> usize {
        let pivot = arr[high];
        let mut i = low;

        for j in low..high {
            if arr[j] <= pivot {
                arr.swap(i, j);
                i += 1;
            }
        }
        arr.swap(i, high);
        i
    }

    fn partition_random(arr: &mut [i32], low: usize, high: usize) -> usize {
        let mut rng = rand::thread_rng();
        let random_idx = rng.gen_range(low..=high);
        arr.swap(random_idx, high);
        Self::partition(arr, low, high)
    }

    fn quick_sort_recursive(arr: &mut [i32], low: usize, high: usize) {
        if low < high {
            let pi = Self::partition(arr, low, high);
            if pi > 0 {
                Self::quick_sort_recursive(arr, low, pi - 1);
            }
            Self::quick_sort_recursive(arr, pi + 1, high);
        }
    }

    fn quick_sort_random_recursive(arr: &mut [i32], low: usize, high: usize) {
        if low < high {
            let pi = Self::partition_random(arr, low, high);
            if pi > 0 {
                Self::quick_sort_random_recursive(arr, low, pi - 1);
            }
            Self::quick_sort_random_recursive(arr, pi + 1, high);
        }
    }

    pub fn sort(arr: &mut [i32]) {
        if !arr.is_empty() {
            Self::quick_sort_recursive(arr, 0, arr.len() - 1);
        }
    }

    pub fn sort_random(arr: &mut [i32]) {
        if !arr.is_empty() {
            Self::quick_sort_random_recursive(arr, 0, arr.len() - 1);
        }
    }

    pub fn sort_iterative(arr: &mut [i32]) {
        if arr.is_empty() {
            return;
        }

        let mut stack = vec![(0, arr.len() - 1)];

        while let Some((low, high)) = stack.pop() {
            if low < high {
                let pi = Self::partition(arr, low, high);
                if pi > 0 {
                    stack.push((low, pi - 1));
                }
                stack.push((pi + 1, high));
            }
        }
    }

    fn three_way_partition(arr: &mut [i32], low: usize, high: usize) {
        if low >= high {
            return;
        }

        let mut lt = low;
        let mut gt = high;
        let pivot = arr[low];
        let mut i = low;

        while i <= gt {
            if arr[i] < pivot {
                arr.swap(lt, i);
                lt += 1;
                i += 1;
            } else if arr[i] > pivot {
                arr.swap(i, gt);
                if gt == 0 {
                    break;
                }
                gt -= 1;
            } else {
                i += 1;
            }
        }

        if lt > 0 {
            Self::three_way_partition(arr, low, lt - 1);
        }
        Self::three_way_partition(arr, gt + 1, high);
    }

    pub fn sort_three_way(arr: &mut [i32]) {
        if !arr.is_empty() {
            Self::three_way_partition(arr, 0, arr.len() - 1);
        }
    }
}