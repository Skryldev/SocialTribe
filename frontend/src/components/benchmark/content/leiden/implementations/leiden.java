import java.util.*;

public class Leiden {
    private Map<Integer, Set<Integer>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();
    private Map<Integer, Integer> communities = new HashMap<>();
    private Map<Edge, Double> weights = new HashMap<>();
    private double m = 0.0;

    private static class Edge {
        int u, v;
        Edge(int u, int v) {
            this.u = Math.min(u, v);
            this.v = Math.max(u, v);
        }
        @Override
        public boolean equals(Object o) {
            if (!(o instanceof Edge)) return false;
            Edge e = (Edge) o;
            return u == e.u && v == e.v;
        }
        @Override
        public int hashCode() {
            return Objects.hash(u, v);
        }
    }

    public void addEdge(int u, int v, double weight) {
        adjacency.putIfAbsent(u, new HashSet<>());
        adjacency.putIfAbsent(v, new HashSet<>());
        adjacency.get(u).add(v);
        adjacency.get(v).add(u);
        nodes.add(u);
        nodes.add(v);
        Edge edge = new Edge(u, v);
        weights.put(edge, weights.getOrDefault(edge, 0.0) + weight);
        m += weight;
    }

    public void buildFromEdges(List<int[]> edges) {
        for (int[] edge : edges) {
            addEdge(edge[0], edge[1], 1.0);
        }
    }

    private double degree(int node) {
        double deg = 0.0;
        for (int neighbor : adjacency.get(node)) {
            deg += weight(node, neighbor);
        }
        return deg;
    }

    private double weight(int u, int v) {
        return weights.getOrDefault(new Edge(u, v), 0.0);
    }

    private double communityDegree(int node, int community) {
        double deg = 0.0;
        for (int neighbor : adjacency.get(node)) {
            if (communities.get(neighbor) == community) {
                deg += weight(node, neighbor);
            }
        }
        return deg;
    }

    private double totalDegree(int community) {
        double total = 0.0;
        for (int node : nodes) {
            if (communities.get(node) == community) {
                total += degree(node);
            }
        }
        return total;
    }

    private double modularityGain(int node, int community) {
        double ki = degree(node);
        double kic = communityDegree(node, community);
        double total = totalDegree(community);
        return (kic - (total * ki) / (2 * m)) / m;
    }

    private void initializeCommunities() {
        for (int node : nodes) {
            communities.put(node, node);
        }
    }

    private boolean refinePartition() {
        boolean changed = false;
        List<Integer> nodeList = new ArrayList<>(nodes);
        Collections.shuffle(nodeList);

        for (int node : nodeList) {
            int currentCommunity = communities.get(node);
            int bestCommunity = currentCommunity;
            double bestGain = 0.0;

            Set<Integer> communitiesSeen = new HashSet<>();
            for (int neighbor : adjacency.get(node)) {
                int community = communities.get(neighbor);
                if (communitiesSeen.contains(community)) continue;
                communitiesSeen.add(community);

                if (community == currentCommunity) continue;

                double gain = modularityGain(node, community);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity != currentCommunity) {
                communities.put(node, bestCommunity);
                changed = true;
            }
        }

        return changed;
    }

    private void aggregateNetwork() {
        Map<Integer, Set<Integer>> newAdjacency = new HashMap<>();
        Set<Integer> newNodes = new HashSet<>();
        Map<Edge, Double> newWeights = new HashMap<>();
        double newM = 0.0;

        Map<Integer, Integer> communityMap = new HashMap<>();
        int nextId = 0;
        for (int community : new HashSet<>(communities.values())) {
            communityMap.put(community, nextId++);
        }

        for (int node : communities.keySet()) {
            int newCommunity = communityMap.get(communities.get(node));
            newAdjacency.putIfAbsent(newCommunity, new HashSet<>());
            newNodes.add(newCommunity);
        }

        for (Map.Entry<Edge, Double> entry : weights.entrySet()) {
            Edge edge = entry.getKey();
            double weight = entry.getValue();
            int u = edge.u;
            int v = edge.v;
            int cu = communityMap.get(communities.get(u));
            int cv = communityMap.get(communities.get(v));

            if (cu == cv) {
                newM += weight;
                continue;
            }

            Edge newEdge = new Edge(cu, cv);
            newWeights.put(newEdge, newWeights.getOrDefault(newEdge, 0.0) + weight);
            newAdjacency.get(cu).add(cv);
            newAdjacency.get(cv).add(cu);
            newM += weight;
        }

        for (int community : newNodes) {
            newAdjacency.putIfAbsent(community, new HashSet<>());
        }

        adjacency = newAdjacency;
        nodes = newNodes;
        weights = newWeights;
        m = newM;

        Map<Integer, Integer> newCommunities = new HashMap<>();
        for (int node : communities.keySet()) {
            newCommunities.put(node, communityMap.get(communities.get(node)));
        }
        communities = newCommunities;
    }

    private boolean fastLocalMove() {
        boolean changed = false;
        List<Integer> nodeList = new ArrayList<>(nodes);
        Collections.shuffle(nodeList);

        for (int node : nodeList) {
            int bestCommunity = communities.get(node);
            double bestGain = 0.0;

            for (int neighbor : adjacency.get(node)) {
                int community = communities.get(neighbor);
                if (community == communities.get(node)) continue;
                double gain = modularityGain(node, community);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity != communities.get(node)) {
                communities.put(node, bestCommunity);
                changed = true;
            }
        }

        return changed;
    }

    public Map<Integer, Integer> detectCommunities() {
        initializeCommunities();

        while (true) {
            boolean improved = false;

            while (refinePartition()) {
                improved = true;
            }

            if (!improved) break;

            while (fastLocalMove()) {
                improved = true;
            }

            if (!improved) break;

            aggregateNetwork();
        }

        return communities;
    }
}