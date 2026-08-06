using System;
using System.Collections.Generic;
using System.Linq;

public class DegreeCentrality
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

    public int DegreeCentrality(int node)
    {
        if (!adjacency.ContainsKey(node))
            return 0;
        return adjacency[node].Count;
    }

    public Dictionary<int, int> AllDegreeCentralities()
    {
        var result = new Dictionary<int, int>();
        foreach (int node in nodes)
        {
            result[node] = DegreeCentrality(node);
        }
        return result;
    }

    public List<(int, int)> TopKCentralNodes(int k = 10)
    {
        var centralities = AllDegreeCentralities();
        return centralities.OrderByDescending(x => x.Value)
                          .Take(k)
                          .Select(x => (x.Key, x.Value))
                          .ToList();
    }

    public double NormalizedDegreeCentrality(int node)
    {
        if (!adjacency.ContainsKey(node) || nodes.Count <= 1)
            return 0.0;
        return (double)DegreeCentrality(node) / (nodes.Count - 1);
    }

    public Dictionary<int, double> AllNormalizedDegreeCentralities()
    {
        var result = new Dictionary<int, double>();
        foreach (int node in nodes)
        {
            result[node] = NormalizedDegreeCentrality(node);
        }
        return result;
    }
}