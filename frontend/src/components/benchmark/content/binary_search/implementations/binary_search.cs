using System;
using System.Collections.Generic;

public class BinarySearch
{
    public int? Search(List<int> arr, int target)
    {
        int left = 0, right = arr.Count - 1;
        
        while (left <= right)
        {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target)
                return mid;
            else if (arr[mid] < target)
                left = mid + 1;
            else
                right = mid - 1;
        }
        
        return null;
    }

    public int? SearchRecursive(List<int> arr, int target, int left, int right)
    {
        if (left > right)
            return null;
        
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target)
            return mid;
        else if (arr[mid] < target)
            return SearchRecursive(arr, target, mid + 1, right);
        else
            return SearchRecursive(arr, target, left, mid - 1);
    }

    public int? SearchFirstOccurrence(List<int> arr, int target)
    {
        int left = 0, right = arr.Count - 1;
        int? result = null;
        
        while (left <= right)
        {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target)
            {
                result = mid;
                right = mid - 1;
            }
            else if (arr[mid] < target)
                left = mid + 1;
            else
                right = mid - 1;
        }
        
        return result;
    }

    public int? SearchLastOccurrence(List<int> arr, int target)
    {
        int left = 0, right = arr.Count - 1;
        int? result = null;
        
        while (left <= right)
        {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target)
            {
                result = mid;
                left = mid + 1;
            }
            else if (arr[mid] < target)
                left = mid + 1;
            else
                right = mid - 1;
        }
        
        return result;
    }

    public int SearchInsert(List<int> arr, int target)
    {
        int left = 0, right = arr.Count - 1;
        
        while (left <= right)
        {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target)
                return mid;
            else if (arr[mid] < target)
                left = mid + 1;
            else
                right = mid - 1;
        }
        
        return left;
    }
}