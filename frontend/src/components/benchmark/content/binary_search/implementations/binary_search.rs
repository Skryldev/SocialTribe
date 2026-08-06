pub struct BinarySearch;

impl BinarySearch {
    pub fn search(arr: &[i32], target: i32) -> Option<usize> {
        let mut left = 0;
        let mut right = arr.len();

        while left < right {
            let mid = left + (right - left) / 2;

            if arr[mid] == target {
                return Some(mid);
            } else if arr[mid] < target {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        None
    }

    pub fn search_recursive(arr: &[i32], target: i32, left: usize, right: usize) -> Option<usize> {
        if left >= right {
            return None;
        }

        let mid = left + (right - left) / 2;

        if arr[mid] == target {
            Some(mid)
        } else if arr[mid] < target {
            Self::search_recursive(arr, target, mid + 1, right)
        } else {
            Self::search_recursive(arr, target, left, mid)
        }
    }

    pub fn search_first_occurrence(arr: &[i32], target: i32) -> Option<usize> {
        let mut left = 0;
        let mut right = arr.len();
        let mut result = None;

        while left < right {
            let mid = left + (right - left) / 2;

            if arr[mid] == target {
                result = Some(mid);
                right = mid;
            } else if arr[mid] < target {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        result
    }

    pub fn search_last_occurrence(arr: &[i32], target: i32) -> Option<usize> {
        let mut left = 0;
        let mut right = arr.len();
        let mut result = None;

        while left < right {
            let mid = left + (right - left) / 2;

            if arr[mid] == target {
                result = Some(mid);
                left = mid + 1;
            } else if arr[mid] < target {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        result
    }

    pub fn search_insert(arr: &[i32], target: i32) -> usize {
        let mut left = 0;
        let mut right = arr.len();

        while left < right {
            let mid = left + (right - left) / 2;

            if arr[mid] == target {
                return mid;
            } else if arr[mid] < target {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        left
    }
}