using System;
using System.Collections.Generic;
using System.Linq;

public class BetweennessCentrality
{
    private Dictionary<int, HashSet<int>> adjacencyList;

    public BetweennessCentrality()
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

    public Dictionary<int, double> BetweennessCentrality()
    {
        var centrality = new Dictionary<int, double>();
        foreach (var node in adjacencyList.Keys)
            centrality[node] = 0.0;

        foreach (var s in adjacencyList.Keys)
        {
            var stack = new Stack<int>();
            var pred = new Dictionary<int, List<int>>();
            var dist = new Dictionary<int, int>();
            var sigma = new Dictionary<int, int>();

            foreach (var node in adjacencyList.Keys)
            {
                pred[node] = new List<int>();
                dist[node] = -1;
                sigma[node] = 0;
            }

            dist[s] = 0;
            sigma[s] = 1;
            var queue = new Queue<int>();
            queue.Enqueue(s);

            while (queue.Count > 0)
            {
                int v = queue.Dequeue();
                stack.Push(v);

                foreach (int w in adjacencyList[v])
                {
                    if (dist[w] < 0)
                    {
                        dist[w] = dist[v] + 1;
                        queue.Enqueue(w);
                    }
                    if (dist[w] == dist[v] + 1)
                    {
                        sigma[w] += sigma[v];
                        pred[w].Add(v);
                    }
                }
            }

            var delta = new Dictionary<int, double>();
            foreach (var node in adjacencyList.Keys)
                delta[node] = 0.0;

            while (stack.Count > 0)
            {
                int w = stack.Pop();

                foreach (int v in pred[w])
                {
                    delta[v] += ((double)sigma[v] / sigma[w]) * (1 + delta[w]);
                }

                if (w != s)
                {
                    centrality[w] += delta[w];
                }
            }
        }

        return centrality;
    }

    public List<(int, double)> TopKCentralNodes(int k = 10)
    {
        var centrality = BetweennessCentrality();
        var result = centrality.OrderByDescending(x => x.Value).ToList();
        return result.Take(k).Select(x => (x.Key, x.Value)).ToList();
    }
}