pub struct RadixSort;

impl RadixSort {
    fn counting_sort(arr: &mut [i32], exp: i32) {
        let n = arr.len();
        let mut output = vec![0; n];
        let mut count = vec![0; 10];

        for i in 0..n {
            let index = ((arr[i] / exp) % 10) as usize;
            count[index] += 1;
        }

        for i in 1..10 {
            count[i] += count[i - 1];
        }

        for i in (0..n).rev() {
            let index = ((arr[i] / exp) % 10) as usize;
            output[count[index] - 1] = arr[i];
            count[index] -= 1;
        }

        arr.copy_from_slice(&output);
    }

    pub fn sort(arr: &mut [i32]) {
        if arr.is_empty() {
            return;
        }

        let max_val = *arr.iter().max().unwrap();
        let mut exp = 1;

        while max_val / exp > 0 {
            Self::counting_sort(arr, exp);
            exp *= 10;
        }
    }

    pub fn sort_negative(arr: &mut [i32]) {
        if arr.is_empty() {
            return;
        }

        let mut negatives = Vec::new();
        let mut positives = Vec::new();

        for &x in arr.iter() {
            if x < 0 {
                negatives.push(-x);
            } else {
                positives.push(x);
            }
        }

        Self::sort(&mut negatives);
        Self::sort(&mut positives);

        let mut index = 0;
        for i in (0..negatives.len()).rev() {
            arr[index] = -negatives[i];
            index += 1;
        }
        for i in 0..positives.len() {
            arr[index] = positives[i];
            index += 1;
        }
    }
}