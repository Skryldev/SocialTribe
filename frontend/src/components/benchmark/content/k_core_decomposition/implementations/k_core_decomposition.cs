using System;
using System.Collections.Generic;
using System.Linq;

public class KCoreDecomposition
{
    private Dictionary<int, HashSet<int>> adjacency = new Dictionary<int, HashSet<int>>();
    private HashSet<int> nodes = new HashSet<int>();

    public void AddEdge(int u, int v)
    {
        if (!adjacency.ContainsKey(u))
            adjacency[u] = new HashSet<int>();
        if (!adjacency.ContainsKey(v))
            adjacency[v] = new HashSet<int>();

        adjacency[u].Add(v);
        adjacency[v].Add(u);
        nodes.Add(u);
        nodes.Add(v);
    }

    public void BuildFromEdges(List<(int, int)> edges)
    {
        foreach (var (u, v) in edges)
        {
            AddEdge(u, v);
        }
    }

    public Dictionary<int, int> KCoreDecomposition()
    {
        var core = new Dictionary<int, int>();
        var degree = new Dictionary<int, int>();

        foreach (int node in nodes)
        {
            degree[node] = adjacency[node].Count;
        }

        var buckets = new List<List<int>>(nodes.Count + 1);
        for (int i = 0; i <= nodes.Count; i++)
        {
            buckets.Add(new List<int>());
        }

        int maxDegree = 0;
        foreach (int node in nodes)
        {
            buckets[degree[node]].Add(node);
            maxDegree = Math.Max(maxDegree, degree[node]);
        }

        var removed = new HashSet<int>();
        int k = 0;

        for (int i = 0; i <= maxDegree; i++)
        {
            foreach (int node in buckets[i])
            {
                if (removed.Contains(node)) continue;

                k = Math.Max(k, i);
                core[node] = k;
                removed.Add(node);

                foreach (int neighbor in adjacency[node])
                {
                    if (!removed.Contains(neighbor))
                    {
                        degree[neighbor]--;
                        if (degree[neighbor] <= i)
                        {
                            buckets[degree[neighbor]].Add(neighbor);
                        }
                    }
                }
            }
        }

        foreach (int node in nodes)
        {
            if (!core.ContainsKey(node))
            {
                core[node] = 0;
            }
        }

        return core;
    }

    public List<int> GetKCore(int k)
    {
        var core = KCoreDecomposition();
        var result = new List<int>();

        foreach (int node in nodes)
        {
            if (core[node] >= k)
            {
                result.Add(node);
            }
        }

        return result;
    }
}