using System;
using System.Collections.Generic;
using System.Linq;

public class Johnson
{
    private class Edge
    {
        public int U { get; set; }
        public int V { get; set; }
        public int Weight { get; set; }
    }

    private List<Edge> edges = new List<Edge>();
    private Dictionary<int, HashSet<int>> adjacency = new Dictionary<int, HashSet<int>>();
    private HashSet<int> nodes = new HashSet<int>();

    public void AddEdge(int u, int v, int weight)
    {
        edges.Add(new Edge { U = u, V = v, Weight = weight });
        if (!adjacency.ContainsKey(u))
            adjacency[u] = new HashSet<int>();
        adjacency[u].Add(v);
        nodes.Add(u);
        nodes.Add(v);
    }

    public void BuildFromEdges(List<(int, int, int)> edgeList)
    {
        foreach (var (u, v, w) in edgeList)
        {
            AddEdge(u, v, w);
        }
    }

    private Dictionary<int, int> BellmanFord(int source)
    {
        var dist = new Dictionary<int, int>();
        foreach (int node in nodes)
            dist[node] = int.MaxValue;
        dist[source] = 0;

        for (int i = 0; i < nodes.Count - 1; i++)
        {
            bool updated = false;
            foreach (var edge in edges)
            {
                if (dist[edge.U] != int.MaxValue && dist[edge.U] + edge.Weight < dist[edge.V])
                {
                    dist[edge.V] = dist[edge.U] + edge.Weight;
                    updated = true;
                }
            }
            if (!updated) break;
        }

        foreach (var edge in edges)
        {
            if (dist[edge.U] != int.MaxValue && dist[edge.U] + edge.Weight < dist[edge.V])
            {
                return null;
            }
        }

        return dist;
    }

    private Dictionary<int, int> Dijkstra(int source, Dictionary<int, int> h)
    {
        var dist = new Dictionary<int, int>();
        foreach (int node in nodes)
            dist[node] = int.MaxValue;
        dist[source] = 0;

        var pq = new PriorityQueue<(int, int), int>();
        pq.Enqueue((0, source), 0);

        while (pq.Count > 0)
        {
            var (d, u) = pq.Dequeue();
            if (d != dist[u]) continue;

            if (!adjacency.ContainsKey(u)) continue;

            foreach (int v in adjacency[u])
            {
                int weight = 0;
                foreach (var edge in edges)
                {
                    if (edge.U == u && edge.V == v)
                    {
                        weight = edge.Weight;
                        break;
                    }
                }
                int newDist = dist[u] + weight + h[u] - h[v];
                if (newDist < dist[v])
                {
                    dist[v] = newDist;
                    pq.Enqueue((dist[v], v), dist[v]);
                }
            }
        }

        var result = new Dictionary<int, int>();
        foreach (int node in nodes)
        {
            result[node] = dist[node] - h[source] + h[node];
        }
        return result;
    }

    public Dictionary<int, Dictionary<int, int>> AllPairsShortestPaths()
    {
        int newNode = nodes.Max() + 1;
        foreach (int node in nodes)
        {
            AddEdge(newNode, node, 0);
        }

        var h = BellmanFord(newNode);
        if (h == null)
        {
            return null;
        }

        var result = new Dictionary<int, Dictionary<int, int>>();
        foreach (int node in nodes)
        {
            if (node == newNode) continue;
            result[node] = Dijkstra(node, h);
        }

        return result;
    }
}