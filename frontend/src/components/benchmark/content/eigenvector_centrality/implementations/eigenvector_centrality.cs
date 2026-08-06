using System;
using System.Collections.Generic;
using System.Linq;

public class EigenvectorCentrality
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

    public Dictionary<int, double> EigenvectorCentrality(int maxIter = 100, double tol = 1e-6)
    {
        var centrality = new Dictionary<int, double>();
        int n = nodes.Count;

        foreach (int node in nodes)
        {
            centrality[node] = 1.0 / n;
        }

        for (int iter = 0; iter < maxIter; iter++)
        {
            var newCentrality = new Dictionary<int, double>();
            double norm = 0.0;

            foreach (int node in nodes)
            {
                double sum = 0.0;
                foreach (int neighbor in adjacency[node])
                {
                    sum += centrality[neighbor];
                }
                newCentrality[node] = sum;
                norm += sum * sum;
            }

            norm = Math.Sqrt(norm);
            double diff = 0.0;

            foreach (int node in nodes)
            {
                newCentrality[node] /= norm;
                diff += Math.Abs(newCentrality[node] - centrality[node]);
            }

            centrality = newCentrality;

            if (diff < tol)
                break;
        }

        return centrality;
    }

    public List<(int, double)> TopKCentralNodes(int k = 10, int maxIter = 100, double tol = 1e-6)
    {
        var centrality = EigenvectorCentrality(maxIter, tol);
        return centrality.OrderByDescending(x => x.Value)
                       .Take(k)
                       .Select(x => (x.Key, x.Value))
                       .ToList();
    }

    public Dictionary<int, double> NormalizedEigenvectorCentrality(int maxIter = 100, double tol = 1e-6)
    {
        var centrality = EigenvectorCentrality(maxIter, tol);
        double maxVal = centrality.Values.Max();

        if (maxVal > 0)
        {
            var keys = centrality.Keys.ToList();
            foreach (var key in keys)
            {
                centrality[key] /= maxVal;
            }
        }

        return centrality;
    }
}