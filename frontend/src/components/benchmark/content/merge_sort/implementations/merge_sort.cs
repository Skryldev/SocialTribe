using System;
using System.Collections.Generic;

public class MergeSort
{
    private void Merge(int[] arr, int left, int mid, int right)
    {
        int n1 = mid - left + 1;
        int n2 = right - mid;

        int[] L = new int[n1];
        int[] R = new int[n2];

        for (int i = 0; i < n1; i++)
            L[i] = arr[left + i];
        for (int j = 0; j < n2; j++)
            R[j] = arr[mid + 1 + j];

        int iIdx = 0, jIdx = 0, k = left;

        while (iIdx < n1 && jIdx < n2)
        {
            if (L[iIdx] <= R[jIdx])
            {
                arr[k] = L[iIdx];
                iIdx++;
            }
            else
            {
                arr[k] = R[jIdx];
                jIdx++;
            }
            k++;
        }

        while (iIdx < n1)
        {
            arr[k] = L[iIdx];
            iIdx++;
            k++;
        }

        while (jIdx < n2)
        {
            arr[k] = R[jIdx];
            jIdx++;
            k++;
        }
    }

    private void MergeSortRecursive(int[] arr, int left, int right)
    {
        if (left < right)
        {
            int mid = left + (right - left) / 2;
            MergeSortRecursive(arr, left, mid);
            MergeSortRecursive(arr, mid + 1, right);
            Merge(arr, left, mid, right);
        }
    }

    public void Sort(int[] arr)
    {
        MergeSortRecursive(arr, 0, arr.Length - 1);
    }

    public void SortIterative(int[] arr)
    {
        int n = arr.Length;

        for (int size = 1; size < n; size *= 2)
        {
            for (int left = 0; left < n - size; left += 2 * size)
            {
                int mid = left + size - 1;
                int right = Math.Min(left + 2 * size - 1, n - 1);
                Merge(arr, left, mid, right);
            }
        }
    }

    private void MergeInPlace(int[] arr, int left, int mid, int right)
    {
        int i = left;
        int j = mid + 1;

        while (i <= mid && j <= right)
        {
            if (arr[i] <= arr[j])
            {
                i++;
            }
            else
            {
                int temp = arr[j];
                for (int k = j; k > i; k--)
                {
                    arr[k] = arr[k - 1];
                }
                arr[i] = temp;
                i++;
                mid++;
                j++;
            }
        }
    }

    private void MergeSortInPlace(int[] arr, int left, int right)
    {
        if (left < right)
        {
            int mid = left + (right - left) / 2;
            MergeSortInPlace(arr, left, mid);
            MergeSortInPlace(arr, mid + 1, right);
            MergeInPlace(arr, left, mid, right);
        }
    }

    public void SortInPlace(int[] arr)
    {
        MergeSortInPlace(arr, 0, arr.Length - 1);
    }
}