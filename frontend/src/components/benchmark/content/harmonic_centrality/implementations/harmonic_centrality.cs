using System;
using System.Collections.Generic;
using System.Linq;

public class HarmonicCentrality
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

    private Dictionary<int, int> BfsDistances(int start)
    {
        var distances = new Dictionary<int, int>();
        var queue = new Queue<int>();

        distances[start] = 0;
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            int node = queue.Dequeue();

            foreach (int neighbor in adjacency[node])
            {
                if (!distances.ContainsKey(neighbor))
                {
                    distances[neighbor] = distances[node] + 1;
                    queue.Enqueue(neighbor);
                }
            }
        }

        return distances;
    }

    public double HarmonicCentrality(int node)
    {
        if (!adjacency.ContainsKey(node))
            return 0.0;

        var distances = BfsDistances(node);
        double sum = 0.0;

        foreach (var pair in distances)
        {
            int target = pair.Key;
            int dist = pair.Value;
            if (target != node && dist > 0)
            {
                sum += 1.0 / dist;
            }
        }

        return sum;
    }

    public Dictionary<int, double> AllHarmonicCentralities()
    {
        var result = new Dictionary<int, double>();

        foreach (int node in nodes)
        {
            result[node] = HarmonicCentrality(node);
        }

        return result;
    }

    public List<(int, double)> TopKCentralNodes(int k = 10)
    {
        var centralities = AllHarmonicCentralities();
        return centralities.OrderByDescending(x => x.Value)
                          .Take(k)
                          .Select(x => (x.Key, x.Value))
                          .ToList();
    }
}