import java.util.*;

public class DegreeCentrality {
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

    public int degreeCentrality(int node) {
        if (!adjacency.containsKey(node)) {
            return 0;
        }
        return adjacency.get(node).size();
    }

    public Map<Integer, Integer> allDegreeCentralities() {
        Map<Integer, Integer> result = new HashMap<>();
        for (int node : nodes) {
            result.put(node, degreeCentrality(node));
        }
        return result;
    }

    public List<Map.Entry<Integer, Integer>> topKCentralNodes(int k) {
        Map<Integer, Integer> centralities = allDegreeCentralities();
        List<Map.Entry<Integer, Integer>> result = new ArrayList<>(centralities.entrySet());
        
        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        
        return result.subList(0, Math.min(k, result.size()));
    }

    public double normalizedDegreeCentrality(int node) {
        if (!adjacency.containsKey(node) || nodes.size() <= 1) {
            return 0.0;
        }
        return (double) degreeCentrality(node) / (nodes.size() - 1);
    }

    public Map<Integer, Double> allNormalizedDegreeCentralities() {
        Map<Integer, Double> result = new HashMap<>();
        for (int node : nodes) {
            result.put(node, normalizedDegreeCentrality(node));
        }
        return result;
    }
}