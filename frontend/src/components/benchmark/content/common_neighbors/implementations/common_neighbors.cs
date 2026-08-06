using System;
using System.Collections.Generic;
using System.Linq;

public class CommonNeighbors
{
    private Dictionary<int, HashSet<int>> adjacencyList;

    public CommonNeighbors()
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

    public HashSet<int> CommonNeighbors(int u, int v)
    {
        if (!adjacencyList.ContainsKey(u) || !adjacencyList.ContainsKey(v))
            return new HashSet<int>();

        var result = new HashSet<int>();
        foreach (var node in adjacencyList[u])
        {
            if (adjacencyList[v].Contains(node))
                result.Add(node);
        }
        return result;
    }

    public int CommonNeighborsCount(int u, int v)
    {
        return CommonNeighbors(u, v).Count;
    }

    public bool PredictLink(int u, int v, int threshold = 1)
    {
        return CommonNeighborsCount(u, v) >= threshold;
    }

    public List<((int, int), int)> ScoreAllPairs()
    {
        var scores = new List<((int, int), int)>();
        var nodes = adjacencyList.Keys.ToList();

        for (int i = 0; i < nodes.Count; i++)
        {
            for (int j = i + 1; j < nodes.Count; j++)
            {
                int u = nodes[i];
                int v = nodes[j];
                int count = CommonNeighborsCount(u, v);
                if (count > 0)
                {
                    scores.Add(((u, v), count));
                }
            }
        }

        return scores.OrderByDescending(x => x.Item2).ToList();
    }

    public List<((int, int), int)> TopKPredictions(int k = 10)
    {
        return ScoreAllPairs().Take(k).ToList();
    }
}