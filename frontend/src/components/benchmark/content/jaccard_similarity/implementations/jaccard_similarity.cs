using System;
using System.Collections.Generic;
using System.Linq;

public class JaccardSimilarity
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

    public double JaccardSimilarity(int u, int v)
    {
        if (!adjacency.ContainsKey(u) || !adjacency.ContainsKey(v))
            return 0.0;

        var neighborsU = adjacency[u];
        var neighborsV = adjacency[v];

        int intersection = neighborsU.Intersect(neighborsV).Count();
        int unionSize = neighborsU.Union(neighborsV).Count();

        if (unionSize == 0)
            return 0.0;

        return (double)intersection / unionSize;
    }

    public List<((int, int), double)> ScoreAllPairs()
    {
        var scores = new List<((int, int), double)>();
        var nodeList = nodes.ToList();

        for (int i = 0; i < nodeList.Count; i++)
        {
            for (int j = i + 1; j < nodeList.Count; j++)
            {
                int u = nodeList[i];
                int v = nodeList[j];
                double score = JaccardSimilarity(u, v);
                if (score > 0)
                {
                    scores.Add(((u, v), score));
                }
            }
        }

        return scores.OrderByDescending(x => x.Item2).ToList();
    }

    public List<((int, int), double)> TopKPredictions(int k = 10)
    {
        return ScoreAllPairs().Take(k).ToList();
    }
}