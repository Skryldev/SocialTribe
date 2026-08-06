using System;
using System.Collections.Generic;
using System.Linq;

public class RadixSort
{
    private void CountingSort(int[] arr, int exp)
    {
        int n = arr.Length;
        int[] output = new int[n];
        int[] count = new int[10];

        for (int i = 0; i < n; i++)
        {
            int index = (arr[i] / exp) % 10;
            count[index]++;
        }

        for (int i = 1; i < 10; i++)
        {
            count[i] += count[i - 1];
        }

        for (int i = n - 1; i >= 0; i--)
        {
            int index = (arr[i] / exp) % 10;
            output[count[index] - 1] = arr[i];
            count[index]--;
        }

        for (int i = 0; i < n; i++)
        {
            arr[i] = output[i];
        }
    }

    public void Sort(int[] arr)
    {
        if (arr == null || arr.Length == 0) return;

        int maxVal = arr.Max();
        int exp = 1;

        while (maxVal / exp > 0)
        {
            CountingSort(arr, exp);
            exp *= 10;
        }
    }

    public void SortNegative(int[] arr)
    {
        if (arr == null || arr.Length == 0) return;

        var negatives = new List<int>();
        var positives = new List<int>();

        foreach (int x in arr)
        {
            if (x < 0) negatives.Add(-x);
            else positives.Add(x);
        }

        int[] negArray = negatives.ToArray();
        int[] posArray = positives.ToArray();

        Sort(negArray);
        Sort(posArray);

        int index = 0;
        for (int i = negArray.Length - 1; i >= 0; i--)
        {
            arr[index++] = -negArray[i];
        }
        for (int i = 0; i < posArray.Length; i++)
        {
            arr[index++] = posArray[i];
        }
    }
}