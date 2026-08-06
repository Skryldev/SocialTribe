import java.util.*;

public class QuickSort {
    private int partition(int[] arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;

        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(arr, i, j);
            }
        }
        swap(arr, i + 1, high);
        return i + 1;
    }

    private int partitionRandom(int[] arr, int low, int high) {
        Random rand = new Random();
        int randomIdx = rand.nextInt(high - low + 1) + low;
        swap(arr, randomIdx, high);
        return partition(arr, low, high);
    }

    private void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    private void quickSortRecursive(int[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSortRecursive(arr, low, pi - 1);
            quickSortRecursive(arr, pi + 1, high);
        }
    }

    private void quickSortRandomRecursive(int[] arr, int low, int high) {
        if (low < high) {
            int pi = partitionRandom(arr, low, high);
            quickSortRandomRecursive(arr, low, pi - 1);
            quickSortRandomRecursive(arr, pi + 1, high);
        }
    }

    public void sort(int[] arr) {
        quickSortRecursive(arr, 0, arr.length - 1);
    }

    public void sortRandom(int[] arr) {
        quickSortRandomRecursive(arr, 0, arr.length - 1);
    }

    public void sortIterative(int[] arr) {
        Stack<int[]> stack = new Stack<>();
        stack.push(new int[]{0, arr.length - 1});

        while (!stack.isEmpty()) {
            int[] range = stack.pop();
            int low = range[0];
            int high = range[1];

            if (low < high) {
                int pi = partition(arr, low, high);
                stack.push(new int[]{low, pi - 1});
                stack.push(new int[]{pi + 1, high});
            }
        }
    }

    private void threeWayPartition(int[] arr, int low, int high) {
        if (low >= high) return;

        int lt = low, gt = high;
        int pivot = arr[low];
        int i = low;

        while (i <= gt) {
            if (arr[i] < pivot) {
                swap(arr, lt, i);
                lt++;
                i++;
            } else if (arr[i] > pivot) {
                swap(arr, i, gt);
                gt--;
            } else {
                i++;
            }
        }

        threeWayPartition(arr, low, lt - 1);
        threeWayPartition(arr, gt + 1, high);
    }

    public void sortThreeWay(int[] arr) {
        threeWayPartition(arr, 0, arr.length - 1);
    }
}