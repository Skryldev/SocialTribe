using System;
using System.Collections.Generic;
using System.Linq;

public class AStar
{
    private Dictionary<int, HashSet<int>> graph;

    public AStar()
    {
        graph = new Dictionary<int, HashSet<int>>();
    }

    public void AddEdge(int u, int v)
    {
        if (!graph.ContainsKey(u))
            graph[u] = new HashSet<int>();
        if (!graph.ContainsKey(v))
            graph[v] = new HashSet<int>();
        
        graph[u].Add(v);
        graph[v].Add(u);
    }

    public void BuildFromEdges(List<(int, int)> edges)
    {
        foreach (var (u, v) in edges)
        {
            AddEdge(u, v);
        }
    }

    private double Heuristic(int node, int goal)
    {
        return Math.Abs(node - goal);
    }

    public List<int> Search(int start, int goal)
    {
        if (!graph.ContainsKey(start) || !graph.ContainsKey(goal))
            return null;

        var openSet = new PriorityQueue<(double, int), double>();
        var cameFrom = new Dictionary<int, int>();
        var gScore = new Dictionary<int, double>();
        var fScore = new Dictionary<int, double>();

        openSet.Enqueue((0, start), 0);
        cameFrom[start] = start;
        gScore[start] = 0;
        fScore[start] = Heuristic(start, goal);

        while (openSet.Count > 0)
        {
            var current = openSet.Dequeue().Item2;

            if (current == goal)
            {
                var path = new List<int>();
                while (current != start)
                {
                    path.Add(current);
                    current = cameFrom[current];
                }
                path.Add(start);
                path.Reverse();
                return path;
            }

            foreach (int neighbor in graph[current])
            {
                double tentativeG = gScore[current] + 1;

                if (!gScore.ContainsKey(neighbor) || tentativeG < gScore[neighbor])
                {
                    cameFrom[neighbor] = current;
                    gScore[neighbor] = tentativeG;
                    fScore[neighbor] = tentativeG + Heuristic(neighbor, goal);
                    openSet.Enqueue((fScore[neighbor], neighbor), fScore[neighbor]);
                }
            }
        }

        return null;
    }
}