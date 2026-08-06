pub struct CountingSort;

impl CountingSort {
    fn find_max(arr: &[i32]) -> i32 {
        let mut max_val = arr[0];
        for &val in arr {
            if val > max_val {
                max_val = val;
            }
        }
        max_val
    }

    fn find_min(arr: &[i32]) -> i32 {
        let mut min_val = arr[0];
        for &val in arr {
            if val < min_val {
                min_val = val;
            }
        }
        min_val
    }

    pub fn sort(arr: &mut [i32]) {
        if arr.is_empty() {
            return;
        }

        let max_val = Self::find_max(arr);
        let min_val = Self::find_min(arr);
        let range = (max_val - min_val + 1) as usize;

        let mut count = vec![0; range];
        let mut output = vec![0; arr.len()];

        for &val in arr.iter() {
            count[(val - min_val) as usize] += 1;
        }

        for i in 1..count.len() {
            count[i] += count[i - 1];
        }

        for i in (0..arr.len()).rev() {
            let idx = (arr[i] - min_val) as usize;
            output[count[idx] - 1] = arr[i];
            count[idx] -= 1;
        }

        arr.copy_from_slice(&output);
    }

    pub fn sort_stable(arr: &mut [i32]) {
        Self::sort(arr);
    }

    pub fn sort_descending(arr: &mut [i32]) {
        Self::sort(arr);
        arr.reverse();
    }
}