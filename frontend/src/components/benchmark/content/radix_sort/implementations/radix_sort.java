import java.util.*;

public class RadixSort {
    private void countingSort(int[] arr, int exp) {
        int n = arr.length;
        int[] output = new int[n];
        int[] count = new int[10];

        for (int i = 0; i < n; i++) {
            int index = (arr[i] / exp) % 10;
            count[index]++;
        }

        for (int i = 1; i < 10; i++) {
            count[i] += count[i - 1];
        }

        for (int i = n - 1; i >= 0; i--) {
            int index = (arr[i] / exp) % 10;
            output[count[index] - 1] = arr[i];
            count[index]--;
        }

        for (int i = 0; i < n; i++) {
            arr[i] = output[i];
        }
    }

    public void sort(int[] arr) {
        if (arr == null || arr.length == 0) return;

        int maxVal = Arrays.stream(arr).max().getAsInt();
        int exp = 1;

        while (maxVal / exp > 0) {
            countingSort(arr, exp);
            exp *= 10;
        }
    }

    public void sortNegative(int[] arr) {
        if (arr == null || arr.length == 0) return;

        List<Integer> negatives = new ArrayList<>();
        List<Integer> positives = new ArrayList<>();

        for (int x : arr) {
            if (x < 0) negatives.add(-x);
            else positives.add(x);
        }

        int[] negArray = negatives.stream().mapToInt(i -> i).toArray();
        int[] posArray = positives.stream().mapToInt(i -> i).toArray();

        sort(negArray);
        sort(posArray);

        int index = 0;
        for (int i = negArray.length - 1; i >= 0; i--) {
            arr[index++] = -negArray[i];
        }
        for (int i = 0; i < posArray.length; i++) {
            arr[index++] = posArray[i];
        }
    }
}