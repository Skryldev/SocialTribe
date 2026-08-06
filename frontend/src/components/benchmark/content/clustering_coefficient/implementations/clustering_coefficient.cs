using System;
using System.Collections.Generic;
using System.Linq;

public class ClusteringCoefficient
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

    public double LocalClusteringCoefficient(int node)
    {
        if (!adjacency.ContainsKey(node))
            return 0.0;

        var neighbors = adjacency[node];
        int degree = neighbors.Count;

        if (degree < 2)
            return 0.0;

        int triangles = 0;
        var neighborList = neighbors.ToList();

        for (int i = 0; i < neighborList.Count; i++)
        {
            for (int j = i + 1; j < neighborList.Count; j++)
            {
                int u = neighborList[i];
                int v = neighborList[j];
                if (adjacency[u].Contains(v))
                {
                    triangles++;
                }
            }
        }

        int maxPossible = degree * (degree - 1) / 2;
        return (double)triangles / maxPossible;
    }

    public Dictionary<int, double> AllLocalClusteringCoefficients()
    {
        var result = new Dictionary<int, double>();
        foreach (int node in nodes)
        {
            result[node] = LocalClusteringCoefficient(node);
        }
        return result;
    }

    public double AverageClusteringCoefficient()
    {
        if (nodes.Count == 0)
            return 0.0;

        double total = 0.0;
        foreach (int node in nodes)
        {
            total += LocalClusteringCoefficient(node);
        }
        return total / nodes.Count;
    }

    public double GlobalClusteringCoefficient()
    {
        int triangles = 0;
        int triplets = 0;

        foreach (int node in nodes)
        {
            int degree = adjacency[node].Count;
            if (degree >= 2)
            {
                triplets += degree * (degree - 1) / 2;
            }

            var neighborList = adjacency[node].ToList();
            for (int i = 0; i < neighborList.Count; i++)
            {
                for (int j = i + 1; j < neighborList.Count; j++)
                {
                    int u = neighborList[i];
                    int v = neighborList[j];
                    if (adjacency[u].Contains(v))
                    {
                        triangles++;
                    }
                }
            }
        }

        if (triplets == 0)
            return 0.0;

        return (double)triangles / triplets;
    }
}