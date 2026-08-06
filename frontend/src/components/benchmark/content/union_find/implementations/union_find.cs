using System;
using System.Collections.Generic;

public class UnionFind
{
    private int[] parent;
    private int[] rank;
    private int count;

    public UnionFind(int n)
    {
        parent = new int[n];
        rank = new int[n];
        count = n;

        for (int i = 0; i < n; i++)
        {
            parent[i] = i;
        }
    }

    public int Find(int x)
    {
        if (parent[x] != x)
        {
            parent[x] = Find(parent[x]);
        }
        return parent[x];
    }

    public bool Union(int x, int y)
    {
        int rootX = Find(x);
        int rootY = Find(y);

        if (rootX == rootY)
        {
            return false;
        }

        if (rank[rootX] < rank[rootY])
        {
            parent[rootX] = rootY;
        }
        else if (rank[rootX] > rank[rootY])
        {
            parent[rootY] = rootX;
        }
        else
        {
            parent[rootY] = rootX;
            rank[rootX]++;
        }

        count--;
        return true;
    }

    public bool Connected(int x, int y)
    {
        return Find(x) == Find(y);
    }

    public int Count()
    {
        return count;
    }
}