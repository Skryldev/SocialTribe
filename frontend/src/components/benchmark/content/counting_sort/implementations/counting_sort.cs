using System;
using System.Collections.Generic;

public class CountingSort
{
    private int FindMax(int[] arr)
    {
        int maxVal = arr[0];
        foreach (int val in arr)
        {
            if (val > maxVal) maxVal = val;
        }
        return maxVal;
    }

    private int FindMin(int[] arr)
    {
        int minVal = arr[0];
        foreach (int val in arr)
        {
            if (val < minVal) minVal = val;
        }
        return minVal;
    }

    public void Sort(int[] arr)
    {
        if (arr == null || arr.Length == 0) return;

        int maxVal = FindMax(arr);
        int minVal = FindMin(arr);
        int range = maxVal - minVal + 1;

        int[] count = new int[range];
        int[] output = new int[arr.Length];

        foreach (int val in arr)
        {
            count[val - minVal]++;
        }

        for (int i = 1; i < count.Length; i++)
        {
            count[i] += count[i - 1];
        }

        for (int i = arr.Length - 1; i >= 0; i--)
        {
            output[count[arr[i] - minVal] - 1] = arr[i];
            count[arr[i] - minVal]--;
        }

        for (int i = 0; i < arr.Length; i++)
        {
            arr[i] = output[i];
        }
    }

    public void SortStable(int[] arr)
    {
        Sort(arr);
    }

    public void SortDescending(int[] arr)
    {
        Sort(arr);
        Array.Reverse(arr);
    }
}