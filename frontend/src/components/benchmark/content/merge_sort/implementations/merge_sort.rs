pub struct MergeSort;

impl MergeSort {
    fn merge(arr: &mut [i32], left: usize, mid: usize, right: usize) {
        let n1 = mid - left + 1;
        let n2 = right - mid;

        let mut L = vec![0; n1];
        let mut R = vec![0; n2];

        for i in 0..n1 {
            L[i] = arr[left + i];
        }
        for j in 0..n2 {
            R[j] = arr[mid + 1 + j];
        }

        let mut i = 0;
        let mut j = 0;
        let mut k = left;

        while i < n1 && j < n2 {
            if L[i] <= R[j] {
                arr[k] = L[i];
                i += 1;
            } else {
                arr[k] = R[j];
                j += 1;
            }
            k += 1;
        }

        while i < n1 {
            arr[k] = L[i];
            i += 1;
            k += 1;
        }

        while j < n2 {
            arr[k] = R[j];
            j += 1;
            k += 1;
        }
    }

    fn merge_sort_recursive(arr: &mut [i32], left: usize, right: usize) {
        if left < right {
            let mid = left + (right - left) / 2;
            Self::merge_sort_recursive(arr, left, mid);
            Self::merge_sort_recursive(arr, mid + 1, right);
            Self::merge(arr, left, mid, right);
        }
    }

    pub fn sort(arr: &mut [i32]) {
        if !arr.is_empty() {
            Self::merge_sort_recursive(arr, 0, arr.len() - 1);
        }
    }

    pub fn sort_iterative(arr: &mut [i32]) {
        let n = arr.len();
        if n < 2 {
            return;
        }

        let mut size = 1;
        while size < n {
            let mut left = 0;
            while left < n - size {
                let mid = left + size - 1;
                let right = (left + 2 * size - 1).min(n - 1);
                Self::merge(arr, left, mid, right);
                left += 2 * size;
            }
            size *= 2;
        }
    }

    fn merge_in_place(arr: &mut [i32], mut left: usize, mut mid: usize, right: usize) {
        let mut i = left;
        let mut j = mid + 1;

        while i <= mid && j <= right {
            if arr[i] <= arr[j] {
                i += 1;
            } else {
                let temp = arr[j];
                for k in (i..j).rev() {
                    arr[k + 1] = arr[k];
                }
                arr[i] = temp;
                i += 1;
                mid += 1;
                j += 1;
            }
        }
    }

    fn merge_sort_in_place(arr: &mut [i32], left: usize, right: usize) {
        if left < right {
            let mid = left + (right - left) / 2;
            Self::merge_sort_in_place(arr, left, mid);
            Self::merge_sort_in_place(arr, mid + 1, right);
            Self::merge_in_place(arr, left, mid, right);
        }
    }

    pub fn sort_in_place(arr: &mut [i32]) {
        if !arr.is_empty() {
            Self::merge_sort_in_place(arr, 0, arr.len() - 1);
        }
    }
}