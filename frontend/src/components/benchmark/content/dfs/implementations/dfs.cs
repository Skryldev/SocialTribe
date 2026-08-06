using System;
using System.Collections.Generic;
using System.Linq;

public class DFS
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

    public void AddDirectedEdge(int u, int v)
    {
        if (!adjacency.ContainsKey(u))
            adjacency[u] = new HashSet<int>();
        if (!adjacency.ContainsKey(v))
            adjacency[v] = new HashSet<int>();

        adjacency[u].Add(v);
        nodes.Add(u);
        nodes.Add(v);
    }

    public void BuildFromEdges(List<(int, int)> edges, bool directed = false)
    {
        foreach (var (u, v) in edges)
        {
            if (directed)
                AddDirectedEdge(u, v);
            else
                AddEdge(u, v);
        }
    }

    private void DfsRecursive(int node, HashSet<int> visited, List<int> order)
    {
        visited.Add(node);
        order.Add(node);

        if (!adjacency.ContainsKey(node)) return;

        foreach (int neighbor in adjacency[node])
        {
            if (!visited.Contains(neighbor))
            {
                DfsRecursive(neighbor, visited, order);
            }
        }
    }

    public List<int> DfsRecursive(int start)
    {
        var order = new List<int>();
        var visited = new HashSet<int>();
        DfsRecursive(start, visited, order);
        return order;
    }

    public List<int> DfsIterative(int start)
    {
        var order = new List<int>();
        var visited = new HashSet<int>();
        var stack = new Stack<int>();

        stack.Push(start);

        while (stack.Count > 0)
        {
            int node = stack.Pop();

            if (visited.Contains(node)) continue;

            visited.Add(node);
            order.Add(node);

            if (!adjacency.ContainsKey(node)) continue;

            foreach (int neighbor in adjacency[node])
            {
                if (!visited.Contains(neighbor))
                {
                    stack.Push(neighbor);
                }
            }
        }

        return order;
    }

    public List<int> DfsPath(int start, int goal)
    {
        var parent = new Dictionary<int, int>();
        var visited = new HashSet<int>();
        var stack = new Stack<int>();

        parent[start] = -1;
        stack.Push(start);

        while (stack.Count > 0)
        {
            int node = stack.Pop();

            if (visited.Contains(node)) continue;
            visited.Add(node);

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
                if (!visited.Contains(neighbor))
                {
                    parent[neighbor] = node;
                    stack.Push(neighbor);
                }
            }
        }

        return new List<int>();
    }

    public List<List<int>> FindComponents()
    {
        var components = new List<List<int>>();
        var visited = new HashSet<int>();

        foreach (int node in nodes)
        {
            if (!visited.Contains(node))
            {
                var component = new List<int>();
                DfsRecursive(node, visited, component);
                components.Add(component);
            }
        }

        return components;
    }

    public bool IsConnected()
    {
        if (nodes.Count == 0) return true;

        int start = nodes.First();
        var visited = new HashSet<int>();
        var order = new List<int>();
        DfsRecursive(start, visited, order);

        return visited.Count == nodes.Count;
    }

    public bool HasCycle()
    {
        var visited = new HashSet<int>();
        var recStack = new HashSet<int>();

        foreach (int node in nodes)
        {
            if (!visited.Contains(node))
            {
                if (HasCycleUtil(node, visited, recStack, -1))
                    return true;
            }
        }
        return false;
    }

    private bool HasCycleUtil(int node, HashSet<int> visited, HashSet<int> recStack, int parent)
    {
        visited.Add(node);
        recStack.Add(node);

        if (!adjacency.ContainsKey(node)) return false;

        foreach (int neighbor in adjacency[node])
        {
            if (recStack.Contains(neighbor) && neighbor != parent)
                return true;

            if (!visited.Contains(neighbor))
            {
                if (HasCycleUtil(neighbor, visited, recStack, node))
                    return true;
            }
        }

        recStack.Remove(node);
        return false;
    }
}