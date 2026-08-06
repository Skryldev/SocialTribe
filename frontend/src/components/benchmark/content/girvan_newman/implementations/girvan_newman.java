import java.util.*;

public class GirvanNewman {
    private Map<Integer, Set<Integer>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();

    private static class Edge {
        int u, v;

        Edge(int u, int v) {
            this.u = Math.min(u, v);
            this.v = Math.max(u, v);
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Edge)) return false;
            Edge edge = (Edge) o;
            return u == edge.u && v == edge.v;
        }

        @Override
        public int hashCode() {
            return Objects.hash(u, v);
        }
    }

    private Map<Edge, Double> edgeBetweenness = new HashMap<>();
    private List<List<Integer>> communities = new ArrayList<>();

    private void bfsDistances(int start, Map<Integer, Integer> dist,
                              Map<Integer, List<Integer>> predecessors) {
        Queue<Integer> queue = new LinkedList<>();
        dist.put(start, 0);
        queue.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();

            for (int neighbor : adjacency.get(node)) {
                if (!dist.containsKey(neighbor)) {
                    dist.put(neighbor, dist.get(node) + 1);
                    queue.add(neighbor);
                }
                if (dist.get(neighbor) == dist.get(node) + 1) {
                    predecessors.putIfAbsent(neighbor, new ArrayList<>());
                    predecessors.get(neighbor).add(node);
                }
            }
        }
    }

    private void computeEdgeBetweenness() {
        edgeBetweenness.clear();

        for (Map.Entry<Integer, Set<Integer>> entry : adjacency.entrySet()) {
            int u = entry.getKey();
            for (int v : entry.getValue()) {
                Edge edge = new Edge(u, v);
                edgeBetweenness.putIfAbsent(edge, 0.0);
            }
        }

        for (int source : nodes) {
            Map<Integer, Integer> dist = new HashMap<>();
            Map<Integer, List<Integer>> predecessors = new HashMap<>();
            bfsDistances(source, dist, predecessors);

            Map<Integer, Double> dependency = new HashMap<>();
            for (int node : nodes) {
                dependency.put(node, 0.0);
            }

            List<Integer> sortedNodes = new ArrayList<>(dist.keySet());
            sortedNodes.sort((a, b) -> dist.get(b) - dist.get(a));

            for (int node : sortedNodes) {
                if (!predecessors.containsKey(node)) continue;

                for (int pred : predecessors.get(node)) {
                    double contrib = (1.0 + dependency.get(node)) / predecessors.get(node).size();
                    dependency.put(pred, dependency.get(pred) + contrib);
                }
            }

            for (int node : nodes) {
                if (!predecessors.containsKey(node)) continue;

                for (int pred : predecessors.get(node)) {
                    Edge edge = new Edge(pred, node);
                    edgeBetweenness.put(edge, edgeBetweenness.get(edge) +
                            dependency.get(node) / predecessors.get(node).size());
                }
            }
        }

        for (Map.Entry<Edge, Double> entry : edgeBetweenness.entrySet()) {
            entry.setValue(entry.getValue() / 2.0);
        }
    }

    private void removeEdgeWithMaxBetweenness() {
        Edge maxEdge = null;
        double maxBetweenness = -1.0;

        for (Map.Entry<Edge, Double> entry : edgeBetweenness.entrySet()) {
            if (entry.getValue() > maxBetweenness) {
                maxBetweenness = entry.getValue();
                maxEdge = entry.getKey();
            }
        }

        if (maxEdge != null) {
            adjacency.get(maxEdge.u).remove(maxEdge.v);
            adjacency.get(maxEdge.v).remove(maxEdge.u);
        }
    }

    private List<List<Integer>> findComponents() {
        List<List<Integer>> components = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();

        for (int node : nodes) {
            if (visited.contains(node)) continue;

            List<Integer> component = new ArrayList<>();
            Queue<Integer> queue = new LinkedList<>();
            queue.add(node);
            visited.add(node);

            while (!queue.isEmpty()) {
                int current = queue.poll();
                component.add(current);

                for (int neighbor : adjacency.get(current)) {
                    if (!visited.contains(neighbor)) {
                        visited.add(neighbor);
                        queue.add(neighbor);
                    }
                }
            }

            if (!component.isEmpty()) {
                components.add(component);
            }
        }

        return components;
    }

    private double modularity(List<List<Integer>> communities) {
        Map<Integer, Integer> communityMap = new HashMap<>();
        for (int i = 0; i < communities.size(); i++) {
            for (int node : communities.get(i)) {
                communityMap.put(node, i);
            }
        }

        double m = 0.0;
        for (Map.Entry<Integer, Set<Integer>> entry : adjacency.entrySet()) {
            m += entry.getValue().size();
        }
        m /= 2.0;

        Map<Integer, Double> degrees = new HashMap<>();
        for (int node : nodes) {
            degrees.put(node, (double) adjacency.get(node).size());
        }

        double Q = 0.0;
        for (Map.Entry<Integer, Set<Integer>> entry : adjacency.entrySet()) {
            int u = entry.getKey();
            for (int v : entry.getValue()) {
                if (communityMap.get(u).equals(communityMap.get(v))) {
                    Q += 1.0 - (degrees.get(u) * degrees.get(v)) / (2.0 * m);
                }
            }
        }

        return Q / (2.0 * m);
    }

    public void addEdge(int u, int v) {
        adjacency.putIfAbsent(u, new HashSet<>());
        adjacency.putIfAbsent(v, new HashSet<>());
        adjacency.get(u).add(v);
        adjacency.get(v).add(u);
        nodes.add(u);
        nodes.add(v);
    }

    public void buildFromEdges(List<int[]> edges) {
        for (int[] edge : edges) {
            addEdge(edge[0], edge[1]);
        }
    }

    public List<List<Integer>> detectCommunities(int numCommunities) {
        while (true) {
            computeEdgeBetweenness();
            removeEdgeWithMaxBetweenness();

            List<List<Integer>> currentComponents = findComponents();
            if (currentComponents.size() >= numCommunities) {
                communities = currentComponents;
                break;
            }

            if (adjacency.isEmpty()) {
                break;
            }
        }

        return communities;
    }

    public List<List<Integer>> detectCommunitiesByModularity() {
        List<List<Integer>> bestCommunities = new ArrayList<>();
        double bestModularity = -1.0;
        int iterations = 0;

        while (true) {
            computeEdgeBetweenness();
            removeEdgeWithMaxBetweenness();

            List<List<Integer>> currentComponents = findComponents();
            double currentModularity = modularity(currentComponents);

            if (currentModularity > bestModularity) {
                bestModularity = currentModularity;
                bestCommunities = currentComponents;
            }

            if (currentComponents.size() == 1) {
                break;
            }

            iterations++;
            if (iterations > 1000) break;
        }

        return bestCommunities;
    }
}