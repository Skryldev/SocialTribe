import java.util.*;

public class PageRank {
    private Map<Integer, Set<Integer>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();

    public void addEdge(int u, int v) {
        adjacency.putIfAbsent(u, new HashSet<>());
        adjacency.get(u).add(v);
        nodes.add(u);
        nodes.add(v);
    }

    public void buildFromEdges(List<int[]> edges) {
        for (int[] edge : edges) {
            addEdge(edge[0], edge[1]);
        }
    }

    public Map<Integer, Double> pagerank(double damping, int maxIter, double tol) {
        Map<Integer, Double> pr = new HashMap<>();
        int n = nodes.size();

        if (n == 0) return pr;

        for (int node : nodes) {
            pr.put(node, 1.0 / n);
        }

        for (int iter = 0; iter < maxIter; iter++) {
            Map<Integer, Double> newPr = new HashMap<>();
            double diff = 0.0;

            for (int node : nodes) {
                double rank = (1 - damping) / n;

                for (int neighbor : nodes) {
                    if (adjacency.containsKey(neighbor) && adjacency.get(neighbor).contains(node)) {
                        int outDegree = adjacency.get(neighbor).size();
                        if (outDegree > 0) {
                            rank += damping * (pr.get(neighbor) / outDegree);
                        }
                    }
                }

                newPr.put(node, rank);
                diff += Math.abs(newPr.get(node) - pr.get(node));
            }

            pr = newPr;
            if (diff < tol) break;
        }

        return pr;
    }

    public List<Map.Entry<Integer, Double>> topKNodes(int k, double damping) {
        Map<Integer, Double> pr = pagerank(damping, 100, 1e-6);
        List<Map.Entry<Integer, Double>> result = new ArrayList<>(pr.entrySet());
        
        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        
        return result.subList(0, Math.min(k, result.size()));
    }
}