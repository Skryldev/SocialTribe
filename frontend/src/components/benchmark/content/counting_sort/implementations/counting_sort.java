public class CountingSort {
    private int findMax(int[] arr) {
        int maxVal = arr[0];
        for (int val : arr) {
            if (val > maxVal) maxVal = val;
        }
        return maxVal;
    }

    private int findMin(int[] arr) {
        int minVal = arr[0];
        for (int val : arr) {
            if (val < minVal) minVal = val;
        }
        return minVal;
    }

    public void sort(int[] arr) {
        if (arr == null || arr.length == 0) return;

        int maxVal = findMax(arr);
        int minVal = findMin(arr);
        int range = maxVal - minVal + 1;

        int[] count = new int[range];
        int[] output = new int[arr.length];

        for (int val : arr) {
            count[val - minVal]++;
        }

        for (int i = 1; i < count.length; i++) {
            count[i] += count[i - 1];
        }

        for (int i = arr.length - 1; i >= 0; i--) {
            output[count[arr[i] - minVal] - 1] = arr[i];
            count[arr[i] - minVal]--;
        }

        for (int i = 0; i < arr.length; i++) {
            arr[i] = output[i];
        }
    }

    public void sortStable(int[] arr) {
        sort(arr);
    }

    public void sortDescending(int[] arr) {
        sort(arr);
        reverse(arr);
    }

    private void reverse(int[] arr) {
        int i = 0, j = arr.length - 1;
        while (i < j) {
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
            i++;
            j--;
        }
    }
}