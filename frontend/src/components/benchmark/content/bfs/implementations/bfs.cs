using System;
using System.Collections.Generic;
using System.Linq;

public class BFS
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

    public Dictionary<int, int> Bfs(int start)
    {
        var distances = new Dictionary<int, int>();
        var queue = new Queue<int>();

        distances[start] = 0;
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            int node = queue.Dequeue();

            if (!adjacency.ContainsKey(node)) continue;

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

    public List<int> BfsPath(int start, int goal)
    {
        var parent = new Dictionary<int, int>();
        var queue = new Queue<int>();

        parent[start] = -1;
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            int node = queue.Dequeue();

            if (node == goal)
            {
                var path = new List<int>();
                while (node != -1)
                {
                    path.Add(node);
                    node = parent[node];
                }
                path.Reverse();
                return path;
            }

            if (!adjacency.ContainsKey(node)) continue;

            foreach (int neighbor in adjacency[node])
            {
                if (!parent.ContainsKey(neighbor))
                {
                    parent[neighbor] = node;
                    queue.Enqueue(neighbor);
                }
            }
        }

        return new List<int>();
    }

    public List<int> BfsOrder(int start)
    {
        var order = new List<int>();
        var visited = new HashSet<int>();
        var queue = new Queue<int>();

        visited.Add(start);
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            int node = queue.Dequeue();
            order.Add(node);

            if (!adjacency.ContainsKey(node)) continue;

            foreach (int neighbor in adjacency[node])
            {
                if (!visited.Contains(neighbor))
                {
                    visited.Add(neighbor);
                    queue.Enqueue(neighbor);
                }
            }
        }

        return order;
    }

    public bool IsConnected()
    {
        if (nodes.Count == 0) return true;

        int start = nodes.First();
        var distances = Bfs(start);
        return distances.Count == nodes.Count;
    }
}