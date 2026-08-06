using System;
using System.Collections.Generic;
using System.Linq;

public class PageRank
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

    public Dictionary<int, double> PageRank(double damping = 0.85, int maxIter = 100, double tol = 1e-6)
    {
        var pr = new Dictionary<int, double>();
        int n = nodes.Count;

        if (n == 0) return pr;

        foreach (int node in nodes)
        {
            pr[node] = 1.0 / n;
        }

        for (int iter = 0; iter < maxIter; iter++)
        {
            var newPr = new Dictionary<int, double>();
            double diff = 0.0;

            foreach (int node in nodes)
            {
                double rank = (1 - damping) / n;

                foreach (int neighbor in nodes)
                {
                    if (adjacency.ContainsKey(neighbor) && adjacency[neighbor].Contains(node))
                    {
                        int outDegree = adjacency[neighbor].Count;
                        if (outDegree > 0)
                        {
                            rank += damping * (pr[neighbor] / outDegree);
                        }
                    }
                }

                newPr[node] = rank;
                diff += Math.Abs(newPr[node] - pr[node]);
            }

            pr = newPr;
            if (diff < tol) break;
        }

        return pr;
    }

    public List<(int, double)> TopKNodes(int k = 10, double damping = 0.85)
    {
        var pr = PageRank(damping);
        var result = pr.OrderByDescending(x => x.Value)
                       .Take(k)
                       .Select(x => (x.Key, x.Value))
                       .ToList();
        return result;
    }
}