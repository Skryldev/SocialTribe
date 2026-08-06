using System;
using System.Collections.Generic;
using System.Linq;

public class Leiden
{
    private Dictionary<int, HashSet<int>> adjacency = new Dictionary<int, HashSet<int>>();
    private HashSet<int> nodes = new HashSet<int>();
    private Dictionary<int, int> communities = new Dictionary<int, int>();
    private Dictionary<(int, int), double> weights = new Dictionary<(int, int), double>();
    private double m = 0.0;

    public void AddEdge(int u, int v, double weight = 1.0)
    {
        if (!adjacency.ContainsKey(u)) adjacency[u] = new HashSet<int>();
        if (!adjacency.ContainsKey(v)) adjacency[v] = new HashSet<int>();

        adjacency[u].Add(v);
        adjacency[v].Add(u);

        nodes.Add(u);
        nodes.Add(v);

        if (u > v) (u, v) = (v, u);
        if (!weights.ContainsKey((u, v))) weights[(u, v)] = 0;
        weights[(u, v)] += weight;
        m += weight;
    }

    public void BuildFromEdges(List<(int, int)> edges)
    {
        foreach (var (u, v) in edges)
        {
            AddEdge(u, v);
        }
    }

    private double Degree(int node)
    {
        double deg = 0.0;
        foreach (int neighbor in adjacency[node])
        {
            int u = node, v = neighbor;
            if (u > v) (u, v) = (v, u);
            deg += weights[(u, v)];
        }
        return deg;
    }

    private double Weight(int u, int v)
    {
        if (u > v) (u, v) = (v, u);
        return weights.ContainsKey((u, v)) ? weights[(u, v)] : 0;
    }

    private double CommunityDegree(int node, int community)
    {
        double deg = 0.0;
        foreach (int neighbor in adjacency[node])
        {
            if (communities[neighbor] == community)
            {
                deg += Weight(node, neighbor);
            }
        }
        return deg;
    }

    private double TotalDegree(int community)
    {
        double total = 0.0;
        foreach (int node in nodes)
        {
            if (communities[node] == community)
            {
                total += Degree(node);
            }
        }
        return total;
    }

    private double ModularityGain(int node, int community)
    {
        double ki = Degree(node);
        double kic = CommunityDegree(node, community);
        double total = TotalDegree(community);
        return (kic - (total * ki) / (2 * m)) / m;
    }

    private void InitializeCommunities()
    {
        foreach (int node in nodes)
        {
            communities[node] = node;
        }
    }

    private bool RefinePartition()
    {
        bool changed = false;
        var nodeList = nodes.ToList();
        var rng = new Random();
        nodeList = nodeList.OrderBy(x => rng.Next()).ToList();

        foreach (int node in nodeList)
        {
            int currentCommunity = communities[node];
            int bestCommunity = currentCommunity;
            double bestGain = 0.0;

            var communitiesSeen = new HashSet<int>();
            foreach (int neighbor in adjacency[node])
            {
                int community = communities[neighbor];
                if (communitiesSeen.Contains(community)) continue;
                communitiesSeen.Add(community);

                if (community == currentCommunity) continue;

                double gain = ModularityGain(node, community);
                if (gain > bestGain)
                {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity != currentCommunity)
            {
                communities[node] = bestCommunity;
                changed = true;
            }
        }

        return changed;
    }

    private void AggregateNetwork()
    {
        var newAdjacency = new Dictionary<int, HashSet<int>>();
        var newNodes = new HashSet<int>();
        var newWeights = new Dictionary<(int, int), double>();
        double newM = 0.0;

        var communityMap = new Dictionary<int, int>();
        int nextId = 0;
        foreach (int community in communities.Values.Distinct())
        {
            communityMap[community] = nextId++;
        }

        foreach (var pair in communities)
        {
            int newCommunity = communityMap[pair.Value];
            if (!newAdjacency.ContainsKey(newCommunity))
                newAdjacency[newCommunity] = new HashSet<int>();
            newNodes.Add(newCommunity);
        }

        foreach (var pair in weights)
        {
            int u = pair.Key.Item1;
            int v = pair.Key.Item2;
            double w = pair.Value;

            int cu = communityMap[communities[u]];
            int cv = communityMap[communities[v]];

            if (cu == cv)
            {
                newM += w;
                continue;
            }

            if (cu > cv) (cu, cv) = (cv, cu);
            if (!newWeights.ContainsKey((cu, cv))) newWeights[(cu, cv)] = 0;
            newWeights[(cu, cv)] += w;
            newAdjacency[cu].Add(cv);
            newAdjacency[cv].Add(cu);
            newM += w;
        }

        foreach (int community in newNodes)
        {
            if (!newAdjacency.ContainsKey(community))
                newAdjacency[community] = new HashSet<int>();
        }

        adjacency = newAdjacency;
        nodes = newNodes;
        weights = newWeights;
        m = newM;

        var newCommunities = new Dictionary<int, int>();
        foreach (var pair in communities)
        {
            newCommunities[pair.Key] = communityMap[pair.Value];
        }
        communities = newCommunities;
    }

    private bool FastLocalMove()
    {
        bool changed = false;
        var nodeList = nodes.ToList();
        var rng = new Random();
        nodeList = nodeList.OrderBy(x => rng.Next()).ToList();

        foreach (int node in nodeList)
        {
            int bestCommunity = communities[node];
            double bestGain = 0.0;

            foreach (int neighbor in adjacency[node])
            {
                int community = communities[neighbor];
                if (community == communities[node]) continue;
                double gain = ModularityGain(node, community);
                if (gain > bestGain)
                {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity != communities[node])
            {
                communities[node] = bestCommunity;
                changed = true;
            }
        }

        return changed;
    }

    public Dictionary<int, int> DetectCommunities()
    {
        InitializeCommunities();

        while (true)
        {
            bool improved = false;

            while (RefinePartition())
            {
                improved = true;
            }

            if (!improved) break;

            while (FastLocalMove())
            {
                improved = true;
            }

            if (!improved) break;

            AggregateNetwork();
        }

        return communities;
    }
}