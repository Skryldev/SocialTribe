using System;
using System.Collections.Generic;
using System.Linq;

public class TriangleDetection
{
    private Dictionary<int, HashSet<int>> adjacencyList;

    public TriangleDetection()
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

    public int CountTriangles()
    {
        int count = 0;
        foreach (var pair in adjacencyList)
        {
            int u = pair.Key;
            var neighbors = pair.Value;
            foreach (int v in neighbors)
            {
                if (v > u)
                {
                    foreach (int w in neighbors)
                    {
                        if (w > v && adjacencyList[v].Contains(w))
                        {
                            count++;
                        }
                    }
                }
            }
        }
        return count;
    }

    public List<(int, int, int)> FindTriangles()
    {
        var triangles = new List<(int, int, int)>();
        foreach (var pair in adjacencyList)
        {
            int u = pair.Key;
            var neighbors = pair.Value;
            foreach (int v in neighbors)
            {
                if (v > u)
                {
                    foreach (int w in neighbors)
                    {
                        if (w > v && adjacencyList[v].Contains(w))
                        {
                            triangles.Add((u, v, w));
                        }
                    }
                }
            }
        }
        return triangles;
    }

    public bool HasTriangle()
    {
        foreach (var pair in adjacencyList)
        {
            int u = pair.Key;
            var neighbors = pair.Value;
            foreach (int v in neighbors)
            {
                if (v > u)
                {
                    foreach (int w in neighbors)
                    {
                        if (w > v && adjacencyList[v].Contains(w))
                        {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}