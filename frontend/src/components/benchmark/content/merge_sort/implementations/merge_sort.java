public class MergeSort {
    private void merge(int[] arr, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;

        int[] L = new int[n1];
        int[] R = new int[n2];

        for (int i = 0; i < n1; i++)
            L[i] = arr[left + i];
        for (int j = 0; j < n2; j++)
            R[j] = arr[mid + 1 + j];

        int i = 0, j = 0, k = left;

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

    private void mergeSortRecursive(int[] arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            mergeSortRecursive(arr, left, mid);
            mergeSortRecursive(arr, mid + 1, right);
            merge(arr, left, mid, right);
        }
    }

    public void sort(int[] arr) {
        mergeSortRecursive(arr, 0, arr.length - 1);
    }

    public void sortIterative(int[] arr) {
        int n = arr.length;

        for (int size = 1; size < n; size *= 2) {
            for (int left = 0; left < n - size; left += 2 * size) {
                int mid = left + size - 1;
                int right = Math.min(left + 2 * size - 1, n - 1);
                merge(arr, left, mid, right);
            }
        }
    }

    private void mergeInPlace(int[] arr, int left, int mid, int right) {
        int i = left;
        int j = mid + 1;

        while (i <= mid && j <= right) {
            if (arr[i] <= arr[j]) {
                i++;
            } else {
                int temp = arr[j];
                for (int k = j; k > i; k--) {
                    arr[k] = arr[k - 1];
                }
                arr[i] = temp;
                i++;
                mid++;
                j++;
            }
        }
    }

    private void mergeSortInPlace(int[] arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            mergeSortInPlace(arr, left, mid);
            mergeSortInPlace(arr, mid + 1, right);
            mergeInPlace(arr, left, mid, right);
        }
    }

    public void sortInPlace(int[] arr) {
        mergeSortInPlace(arr, 0, arr.length - 1);
    }
}