class MergeSort {
    merge(arr, left, mid, right) {
        const n1 = mid - left + 1;
        const n2 = right - mid;

        const L = new Array(n1);
        const R = new Array(n2);

        for (let i = 0; i < n1; i++) {
            L[i] = arr[left + i];
        }
        for (let j = 0; j < n2; j++) {
            R[j] = arr[mid + 1 + j];
        }

        let i = 0, j = 0, k = left;

        while (i < n1 && j < n2) {
            if (L[i] <= R[j]) {
                arr[k] = L[i];
                i++;
            } else {
                arr[k] = R[j];
                j++;
            }
            k++;
        }

        while (i < n1) {
            arr[k] = L[i];
            i++;
            k++;
        }

        while (j < n2) {
            arr[k] = R[j];
            j++;
            k++;
        }
    }

    mergeSortRecursive(arr, left, right) {
        if (left < right) {
            const mid = left + Math.floor((right - left) / 2);
            this.mergeSortRecursive(arr, left, mid);
            this.mergeSortRecursive(arr, mid + 1, right);
            this.merge(arr, left, mid, right);
        }
    }

    sort(arr) {
        this.mergeSortRecursive(arr, 0, arr.length - 1);
    }

    sortIterative(arr) {
        const n = arr.length;

        for (let size = 1; size < n; size *= 2) {
            for (let left = 0; left < n - size; left += 2 * size) {
                const mid = left + size - 1;
                const right = Math.min(left + 2 * size - 1, n - 1);
                this.merge(arr, left, mid, right);
            }
        }
    }

    mergeInPlace(arr, left, mid, right) {
        let i = left;
        let j = mid + 1;

        while (i <= mid && j <= right) {
            if (arr[i] <= arr[j]) {
                i++;
            } else {
                const temp = arr[j];
                for (let k = j; k > i; k--) {
                    arr[k] = arr[k - 1];
                }
                arr[i] = temp;
                i++;
                mid++;
                j++;
            }
        }
    }

    mergeSortInPlace(arr, left, right) {
        if (left < right) {
            const mid = left + Math.floor((right - left) / 2);
            this.mergeSortInPlace(arr, left, mid);
            this.mergeSortInPlace(arr, mid + 1, right);
            this.mergeInPlace(arr, left, mid, right);
        }
    }

    sortInPlace(arr) {
        this.mergeSortInPlace(arr, 0, arr.length - 1);
    }
}

module.exports = MergeSort;