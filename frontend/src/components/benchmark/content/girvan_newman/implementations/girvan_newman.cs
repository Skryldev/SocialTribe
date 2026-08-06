using System;
using System.Collections.Generic;
using System.Linq;

public class GirvanNewman
{
    private Dictionary<int, HashSet<int>> adjacency = new Dictionary<int, HashSet<int>>();
    private HashSet<int> nodes = new HashSet<int>();

    private class Edge
    {
        public int U { get; set; }
        public int V { get; set; }

        public Edge(int u, int v)
        {
            U = Math.Min(u, v);
            V = Math.Max(u, v);
        }

        public override bool Equals(object obj)
        {
            if (obj is Edge other)
            {
                return U == other.U && V == other.V;
            }
            return false;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(U, V);
        }
    }

    private Dictionary<Edge, double> edgeBetweenness = new Dictionary<Edge, double>();
    private List<List<int>> communities = new List<List<int>>();

    private void BfsDistances(int start, out Dictionary<int, int> dist, 
                              out Dictionary<int, List<int>> predecessors)
    {
        dist = new Dictionary<int, int>();
        predecessors = new Dictionary<int, List<int>>();
        var queue = new Queue<int>();

        dist[start] = 0;
        queue.Enqueue(start);

        while (queue.Count > 0)
        {
            int node = queue.Dequeue();

            foreach (int neighbor in adjacency[node])
            {
                if (!dist.ContainsKey(neighbor))
                {
                    dist[neighbor] = dist[node] + 1;
                    queue.Enqueue(neighbor);
                }
                if (dist[neighbor] == dist[node] + 1)
                {
                    if (!predecessors.ContainsKey(neighbor))
                        predecessors[neighbor] = new List<int>();
                    predecessors[neighbor].Add(node);
                }
            }
        }
    }

    private void ComputeEdgeBetweenness()
    {
        edgeBetweenness.Clear();
        foreach (var pair in adjacency)
        {
            foreach (int neighbor in pair.Value)
            {
                var edge = new Edge(pair.Key, neighbor);
                if (!edgeBetweenness.ContainsKey(edge))
                    edgeBetweenness[edge] = 0.0;
            }
        }

        foreach (int source in nodes)
        {
            BfsDistances(source, out var dist, out var predecessors);

            var dependency = new Dictionary<int, double>();
            foreach (int node in nodes)
                dependency[node] = 0.0;

            var sortedNodes = nodes.OrderByDescending(n => dist[n]).ToList();

            foreach (int node in sortedNodes)
            {
                if (!predecessors.ContainsKey(node)) continue;

                foreach (int pred in predecessors[node])
                {
                    double contrib = (1.0 + dependency[node]) / predecessors[node].Count;
                    dependency[pred] += contrib;
                }
            }

            foreach (int node in nodes)
            {
                if (!predecessors.ContainsKey(node)) continue;

                foreach (int pred in predecessors[node])
                {
                    var edge = new Edge(pred, node);
                    edgeBetweenness[edge] += dependency[node] / predecessors[node].Count;
                }
            }
        }

        var keys = edgeBetweenness.Keys.ToList();
        foreach (var key in keys)
        {
            edgeBetweenness[key] /= 2.0;
        }
    }

    private void RemoveEdgeWithMaxBetweenness()
    {
        var maxEdge = edgeBetweenness.OrderByDescending(x => x.Value).First().Key;

        adjacency[maxEdge.U].Remove(maxEdge.V);
        adjacency[maxEdge.V].Remove(maxEdge.U);
    }

    private List<List<int>> FindComponents()
    {
        var components = new List<List<int>>();
        var visited = new HashSet<int>();

        foreach (int node in nodes)
        {
            if (visited.Contains(node)) continue;

            var component = new List<int>();
            var queue = new Queue<int>();
            queue.Enqueue(node);
            visited.Add(node);

            while (queue.Count > 0)
            {
                int current = queue.Dequeue();
                component.Add(current);

                foreach (int neighbor in adjacency[current])
                {
                    if (!visited.Contains(neighbor))
                    {
                        visited.Add(neighbor);
                        queue.Enqueue(neighbor);
                    }
                }
            }

            if (component.Count > 0)
                components.Add(component);
        }

        return components;
    }

    private double Modularity(List<List<int>> communities)
    {
        var communityMap = new Dictionary<int, int>();
        for (int i = 0; i < communities.Count; i++)
        {
            foreach (int node in communities[i])
                communityMap[node] = i;
        }

        double m = 0.0;
        foreach (var pair in adjacency)
            m += pair.Value.Count;
        m /= 2.0;

        var degrees = new Dictionary<int, double>();
        foreach (int node in nodes)
            degrees[node] = adjacency[node].Count;

        double Q = 0.0;
        foreach (var pair in adjacency)
        {
            int u = pair.Key;
            foreach (int v in pair.Value)
            {
                if (communityMap[u] == communityMap[v])
                {
                    Q += 1.0 - (degrees[u] * degrees[v]) / (2.0 * m);
                }
            }
        }

        return Q / (2.0 * m);
    }

    public void AddEdge(int u, int v)
    {
        if (!adjacency.ContainsKey(u)) adjacency[u] = new HashSet<int>();
        if (!adjacency.ContainsKey(v)) adjacency[v] = new HashSet<int>();

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

    public List<List<int>> DetectCommunities(int numCommunities = 2)
    {
        while (true)
        {
            ComputeEdgeBetweenness();
            RemoveEdgeWithMaxBetweenness();

            var currentComponents = FindComponents();
            if (currentComponents.Count >= numCommunities)
            {
                communities = currentComponents;
                break;
            }

            if (adjacency.Count == 0)
                break;
        }

        return communities;
    }

    public List<List<int>> DetectCommunitiesByModularity()
    {
        List<List<int>> bestCommunities = new List<List<int>>();
        double bestModularity = -1.0;
        int iterations = 0;

        while (true)
        {
            ComputeEdgeBetweenness();
            RemoveEdgeWithMaxBetweenness();

            var currentComponents = FindComponents();
            double currentModularity = Modularity(currentComponents);

            if (currentModularity > bestModularity)
            {
                bestModularity = currentModularity;
                bestCommunities = currentComponents;
            }

            if (currentComponents.Count == 1)
                break;

            iterations++;
            if (iterations > 1000) break;
        }

        return bestCommunities;
    }
}