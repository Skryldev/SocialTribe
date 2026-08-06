import java.util.*;

public class ClusteringCoefficient {
    private Map<Integer, Set<Integer>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();

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

    public double localClusteringCoefficient(int node) {
        if (!adjacency.containsKey(node)) {
            return 0.0;
        }

        Set<Integer> neighbors = adjacency.get(node);
        int degree = neighbors.size();

        if (degree < 2) {
            return 0.0;
        }

        int triangles = 0;
        List<Integer> neighborList = new ArrayList<>(neighbors);

        for (int i = 0; i < neighborList.size(); i++) {
            for (int j = i + 1; j < neighborList.size(); j++) {
                int u = neighborList.get(i);
                int v = neighborList.get(j);
                if (adjacency.get(u).contains(v)) {
                    triangles++;
                }
            }
        }

        int maxPossible = degree * (degree - 1) / 2;
        return (double) triangles / maxPossible;
    }

    public Map<Integer, Double> allLocalClusteringCoefficients() {
        Map<Integer, Double> result = new HashMap<>();
        for (int node : nodes) {
            result.put(node, localClusteringCoefficient(node));
        }
        return result;
    }

    public double averageClusteringCoefficient() {
        if (nodes.isEmpty()) {
            return 0.0;
        }

        double total = 0.0;
        for (int node : nodes) {
            total += localClusteringCoefficient(node);
        }
        return total / nodes.size();
    }

    public double globalClusteringCoefficient() {
        int triangles = 0;
        int triplets = 0;

        for (int node : nodes) {
            int degree = adjacency.get(node).size();
            if (degree >= 2) {
                triplets += degree * (degree - 1) / 2;
            }

            List<Integer> neighborList = new ArrayList<>(adjacency.get(node));
            for (int i = 0; i < neighborList.size(); i++) {
                for (int j = i + 1; j < neighborList.size(); j++) {
                    int u = neighborList.get(i);
                    int v = neighborList.get(j);
                    if (adjacency.get(u).contains(v)) {
                        triangles++;
                    }
                }
            }
        }

        if (triplets == 0) {
            return 0.0;
        }

        return (double) triangles / triplets;
    }
}