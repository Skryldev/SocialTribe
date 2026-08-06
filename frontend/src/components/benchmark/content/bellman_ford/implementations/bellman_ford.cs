using System;
using System.Collections.Generic;
using System.Linq;

public class BellmanFord
{
    private class Edge
    {
        public int U { get; set; }
        public int V { get; set; }
        public int Weight { get; set; }
    }

    private List<Edge> edges = new List<Edge>();
    private HashSet<int> vertices = new HashSet<int>();

    public void AddEdge(int u, int v, int weight)
    {
        edges.Add(new Edge { U = u, V = v, Weight = weight });
        vertices.Add(u);
        vertices.Add(v);
    }

    public void BuildFromEdges(List<(int, int, int)> edgeList)
    {
        foreach (var (u, v, w) in edgeList)
        {
            AddEdge(u, v, w);
        }
    }

    public Dictionary<int, int> ShortestPath(int source)
    {
        if (!vertices.Contains(source))
            return null;

        var dist = new Dictionary<int, int>();
        foreach (int v in vertices)
            dist[v] = int.MaxValue;
        dist[source] = 0;

        for (int i = 0; i < vertices.Count - 1; i++)
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

    public bool HasNegativeCycle()
    {
        int start = vertices.First();
        return ShortestPath(start) == null;
    }
}