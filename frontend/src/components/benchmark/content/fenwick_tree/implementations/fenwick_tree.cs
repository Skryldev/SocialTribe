using System;
using System.Collections.Generic;

public class FenwickTree
{
    private int n;
    private int[] tree;

    public FenwickTree(int size)
    {
        n = size;
        tree = new int[size + 1];
    }

    public void Build(List<int> arr)
    {
        for (int i = 0; i < n; i++)
        {
            tree[i + 1] += arr[i];
            int j = (i + 1) + ((i + 1) & -(i + 1));
            if (j <= n)
            {
                tree[j] += tree[i + 1];
            }
        }
    }

    public void Update(int idx, int delta)
    {
        int i = idx + 1;
        while (i <= n)
        {
            tree[i] += delta;
            i += i & -i;
        }
    }

    public int Query(int idx)
    {
        int result = 0;
        int i = idx + 1;
        while (i > 0)
        {
            result += tree[i];
            i -= i & -i;
        }
        return result;
    }

    public int RangeQuery(int left, int right)
    {
        return Query(right) - (left > 0 ? Query(left - 1) : 0);
    }
}