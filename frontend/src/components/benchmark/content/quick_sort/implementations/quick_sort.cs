using System;
using System.Collections.Generic;

public class QuickSort
{
    private int Partition(int[] arr, int low, int high)
    {
        int pivot = arr[high];
        int i = low - 1;

        for (int j = low; j < high; j++)
        {
            if (arr[j] <= pivot)
            {
                i++;
                Swap(arr, i, j);
            }
        }
        Swap(arr, i + 1, high);
        return i + 1;
    }

    private int PartitionRandom(int[] arr, int low, int high)
    {
        Random rand = new Random();
        int randomIdx = rand.Next(low, high + 1);
        Swap(arr, randomIdx, high);
        return Partition(arr, low, high);
    }

    private void Swap(int[] arr, int i, int j)
    {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    private void QuickSortRecursive(int[] arr, int low, int high)
    {
        if (low < high)
        {
            int pi = Partition(arr, low, high);
            QuickSortRecursive(arr, low, pi - 1);
            QuickSortRecursive(arr, pi + 1, high);
        }
    }

    private void QuickSortRandomRecursive(int[] arr, int low, int high)
    {
        if (low < high)
        {
            int pi = PartitionRandom(arr, low, high);
            QuickSortRandomRecursive(arr, low, pi - 1);
            QuickSortRandomRecursive(arr, pi + 1, high);
        }
    }

    public void Sort(int[] arr)
    {
        QuickSortRecursive(arr, 0, arr.Length - 1);
    }

    public void SortRandom(int[] arr)
    {
        QuickSortRandomRecursive(arr, 0, arr.Length - 1);
    }

    public void SortIterative(int[] arr)
    {
        var stack = new Stack<(int, int)>();
        stack.Push((0, arr.Length - 1));

        while (stack.Count > 0)
        {
            var (low, high) = stack.Pop();

            if (low < high)
            {
                int pi = Partition(arr, low, high);
                stack.Push((low, pi - 1));
                stack.Push((pi + 1, high));
            }
        }
    }

    private void ThreeWayPartition(int[] arr, int low, int high)
    {
        if (low >= high) return;

        int lt = low, gt = high;
        int pivot = arr[low];
        int i = low;

        while (i <= gt)
        {
            if (arr[i] < pivot)
            {
                Swap(arr, lt, i);
                lt++;
                i++;
            }
            else if (arr[i] > pivot)
            {
                Swap(arr, i, gt);
                gt--;
            }
            else
            {
                i++;
            }
        }

        ThreeWayPartition(arr, low, lt - 1);
        ThreeWayPartition(arr, gt + 1, high);
    }

    public void SortThreeWay(int[] arr)
    {
        ThreeWayPartition(arr, 0, arr.Length - 1);
    }
}