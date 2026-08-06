using System;
using System.Collections.Generic;
using System.Linq;

public class FloydWarshall
{
    private Dictionary<int, HashSet<int>> nodes = new Dictionary<int, HashSet<int>>();
    private Dictionary<int, Dictionary<int, int>> dist = new Dictionary<int, Dictionary<int, int>>();
    private Dictionary<int, Dictionary<int, int>> nextNode = new Dictionary<int, Dictionary<int, int>>();

    public void AddEdge(int u, int v, int weight)
    {
        if (!nodes.ContainsKey(u)) nodes[u] = new HashSet<int>();
        if (!nodes.ContainsKey(v)) nodes[v] = new HashSet<int>();
        nodes[u].Add(v);
        nodes[v].Add(u);

        if (!dist.ContainsKey(u)) dist[u] = new Dictionary<int, int>();
        if (!dist.ContainsKey(v)) dist[v] = new Dictionary<int, int>();
        dist[u][v] = weight;
        dist[v][u] = weight;

        if (!nextNode.ContainsKey(u)) nextNode[u] = new Dictionary<int, int>();
        if (!nextNode.ContainsKey(v)) nextNode[v] = new Dictionary<int, int>();
        nextNode[u][v] = v;
        nextNode[v][u] = u;
    }

    public void AddDirectedEdge(int u, int v, int weight)
    {
        if (!nodes.ContainsKey(u)) nodes[u] = new HashSet<int>();
        if (!nodes.ContainsKey(v)) nodes[v] = new HashSet<int>();
        nodes[u].Add(v);

        if (!dist.ContainsKey(u)) dist[u] = new Dictionary<int, int>();
        if (!dist.ContainsKey(v)) dist[v] = new Dictionary<int, int>();
        dist[u][v] = weight;

        if (!nextNode.ContainsKey(u)) nextNode[u] = new Dictionary<int, int>();
        if (!nextNode.ContainsKey(v)) nextNode[v] = new Dictionary<int, int>();
        nextNode[u][v] = v;
    }

    public void BuildFromEdges(List<(int, int, int)> edges, bool directed = false)
    {
        foreach (var (u, v, w) in edges)
        {
            if (directed)
                AddDirectedEdge(u, v, w);
            else
                AddEdge(u, v, w);
        }
    }

    private void Initialize()
    {
        var allNodes = GetAllNodes();

        foreach (int u in allNodes)
        {
            if (!dist.ContainsKey(u)) dist[u] = new Dictionary<int, int>();
            if (!nextNode.ContainsKey(u)) nextNode[u] = new Dictionary<int, int>();

            foreach (int v in allNodes)
            {
                if (u == v)
                {
                    dist[u][v] = 0;
                }
                else if (!dist[u].ContainsKey(v))
                {
                    dist[u][v] = int.MaxValue;
                }
            }
        }
    }

    private List<int> GetAllNodes()
    {
        return nodes.Keys.ToList();
    }

    public void AllPairsShortestPaths()
    {
        Initialize();
        var allNodes = GetAllNodes();

        foreach (int k in allNodes)
        {
            foreach (int i in allNodes)
            {
                foreach (int j in allNodes)
                {
                    if (dist[i][k] != int.MaxValue && dist[k][j] != int.MaxValue &&
                        dist[i][k] + dist[k][j] < dist[i][j])
                    {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        nextNode[i][j] = nextNode[i][k];
                    }
                }
            }
        }
    }

    public int ShortestPath(int u, int v)
    {
        if (!dist.ContainsKey(u) || !dist[u].ContainsKey(v))
            return int.MaxValue;
        return dist[u][v];
    }

    public List<int> GetPath(int u, int v)
    {
        if (!nextNode.ContainsKey(u) || !nextNode[u].ContainsKey(v))
            return new List<int>();

        var path = new List<int>();
        path.Add(u);

        while (u != v)
        {
            u = nextNode[u][v];
            path.Add(u);
        }

        return path;
    }

    public Dictionary<int, Dictionary<int, int>> GetAllDistances()
    {
        return dist;
    }

    public bool HasNegativeCycle()
    {
        var allNodes = GetAllNodes();

        foreach (int i in allNodes)
        {
            if (dist[i][i] < 0)
                return true;
        }
        return false;
    }
}