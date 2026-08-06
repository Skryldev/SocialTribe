using System;
using System.Collections.Generic;
using System.Linq;

public class ClosenessCentrality
{
    private Dictionary<int, HashSet<int>> adjacencyList;

    public ClosenessCentrality()
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

    public Dictionary<int, int> BfsDistances(int start)
    {
        var distances = new Dictionary<int, int>();
        var queue = new Queue<int>();
        
        distances[start] = 0;
        queue.Enqueue(start);
        
        while (queue.Count > 0)
        {
            int node = queue.Dequeue();
            foreach (int neighbor in adjacencyList.GetValueOrDefault(node, new HashSet<int>()))
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

    public double ClosenessCentrality(int node)
    {
        if (!adjacencyList.ContainsKey(node))
            return 0.0;
        
        var distances = BfsDistances(node);
        int reachableNodes = distances.Count - 1;
        
        if (reachableNodes == 0)
            return 0.0;
        
        int totalDistance = distances.Values.Sum();
        return (double)reachableNodes / totalDistance;
    }

    public List<(int, double)> AllClosenessCentralities()
    {
        var result = new List<(int, double)>();
        
        foreach (int node in adjacencyList.Keys)
        {
            result.Add((node, ClosenessCentrality(node)));
        }
        
        return result.OrderByDescending(x => x.Item2).ToList();
    }

    public List<(int, double)> TopKCentralNodes(int k = 10)
    {
        var centralities = AllClosenessCentralities();
        return centralities.Take(k).ToList();
    }

    public double NormalizedClosenessCentrality(int node)
    {
        if (!adjacencyList.ContainsKey(node))
            return 0.0;
        
        var distances = BfsDistances(node);
        int reachableNodes = distances.Count - 1;
        int totalNodes = adjacencyList.Count;
        
        if (reachableNodes == 0 || totalNodes <= 1)
            return 0.0;
        
        int totalDistance = distances.Values.Sum();
        return ((double)reachableNodes / totalDistance) * ((double)(totalNodes - 1) / reachableNodes);
    }
}