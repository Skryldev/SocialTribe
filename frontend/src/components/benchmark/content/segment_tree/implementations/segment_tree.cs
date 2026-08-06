using System;
using System.Collections.Generic;

public class SegmentTree
{
    private int[] tree;
    private int n;

    public SegmentTree(int[] arr)
    {
        n = arr.Length;
        tree = new int[4 * n];
        Build(arr, 1, 0, n - 1);
    }

    private void Build(int[] arr, int node, int start, int end)
    {
        if (start == end)
        {
            tree[node] = arr[start];
            return;
        }

        int mid = (start + end) / 2;
        Build(arr, node * 2, start, mid);
        Build(arr, node * 2 + 1, mid + 1, end);
        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    public void Update(int idx, int val)
    {
        Update(1, 0, n - 1, idx, val);
    }

    private void Update(int node, int start, int end, int idx, int val)
    {
        if (start == end)
        {
            tree[node] = val;
            return;
        }

        int mid = (start + end) / 2;
        if (idx <= mid)
            Update(node * 2, start, mid, idx, val);
        else
            Update(node * 2 + 1, mid + 1, end, idx, val);

        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    public int Query(int l, int r)
    {
        return Query(1, 0, n - 1, l, r);
    }

    private int Query(int node, int start, int end, int l, int r)
    {
        if (r < start || l > end)
            return 0;

        if (l <= start && end <= r)
            return tree[node];

        int mid = (start + end) / 2;
        return Query(node * 2, start, mid, l, r) +
               Query(node * 2 + 1, mid + 1, end, l, r);
    }
}