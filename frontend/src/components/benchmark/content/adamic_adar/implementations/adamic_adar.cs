using System;
using System.Collections.Generic;
using System.Linq;

public class AdamicAdar
{
    private Dictionary<int, HashSet<int>> adjacencyList;

    public AdamicAdar()
    {
        adjacencyList = new Dictionary<int, HashSet<int>>();
    }

    public void AddEdge(int u, int v)
    {
        if (!adjacencyList.ContainsKey(u))
            adjacencyList[u] = new HashSet<int>();
        if (!adjacencyList.ContainsKey(v))
            adjacencyList[v] = new HashSet<int>();
        
        adjacencyList[u].Add(v);
        adjacencyList[v].Add(u);
    }

    public void BuildFromEdges(List<(int, int)> edges)
    {
        foreach (var (u, v) in edges)
        {
            AddEdge(u, v);
        }
    }

    public double AdamicAdarScore(int u, int v)
    {
        if (!adjacencyList.ContainsKey(u) || !adjacencyList.ContainsKey(v))
            return 0.0;

        double score = 0.0;
        foreach (int node in adjacencyList[u])
        {
            if (adjacencyList[v].Contains(node))
            {
                int degree = adjacencyList[node].Count;
                if (degree > 1)
                {
                    score += 1.0 / Math.Log(degree);
                }
            }
        }
        return score;
    }

    public List<((int, int), double)> ScoreAllPairs()
    {
        var scores = new List<((int, int), double)>();
        var nodes = adjacencyList.Keys.ToList();

        for (int i = 0; i < nodes.Count; i++)
        {
            for (int j = i + 1; j < nodes.Count; j++)
            {
                int u = nodes[i];
                int v = nodes[j];
                double score = AdamicAdarScore(u, v);
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