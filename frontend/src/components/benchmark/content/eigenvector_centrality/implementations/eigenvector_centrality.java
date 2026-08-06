import java.util.*;

public class EigenvectorCentrality {
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

    public Map<Integer, Double> eigenvectorCentrality(int maxIter, double tol) {
        Map<Integer, Double> centrality = new HashMap<>();
        int n = nodes.size();

        for (int node : nodes) {
            centrality.put(node, 1.0 / n);
        }

        for (int iter = 0; iter < maxIter; iter++) {
            Map<Integer, Double> newCentrality = new HashMap<>();
            double norm = 0.0;

            for (int node : nodes) {
                double sum = 0.0;
                for (int neighbor : adjacency.get(node)) {
                    sum += centrality.get(neighbor);
                }
                newCentrality.put(node, sum);
                norm += sum * sum;
            }

            norm = Math.sqrt(norm);
            double diff = 0.0;

            for (int node : nodes) {
                newCentrality.put(node, newCentrality.get(node) / norm);
                diff += Math.abs(newCentrality.get(node) - centrality.get(node));
            }

            centrality = newCentrality;

            if (diff < tol) {
                break;
            }
        }

        return centrality;
    }

    public List<Map.Entry<Integer, Double>> topKCentralNodes(int k, int maxIter, double tol) {
        Map<Integer, Double> centrality = eigenvectorCentrality(maxIter, tol);
        List<Map.Entry<Integer, Double>> result = new ArrayList<>(centrality.entrySet());

        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        return result.subList(0, Math.min(k, result.size()));
    }

    public Map<Integer, Double> normalizedEigenvectorCentrality(int maxIter, double tol) {
        Map<Integer, Double> centrality = eigenvectorCentrality(maxIter, tol);
        double maxVal = 0.0;

        for (double value : centrality.values()) {
            if (value > maxVal) {
                maxVal = value;
            }
        }

        if (maxVal > 0) {
            for (int node : nodes) {
                centrality.put(node, centrality.get(node) / maxVal);
            }
        }

        return centrality;
    }
}