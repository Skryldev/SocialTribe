import java.util.*;

public class HarmonicCentrality {
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

    private Map<Integer, Integer> bfsDistances(int start) {
        Map<Integer, Integer> distances = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();

        distances.put(start, 0);
        queue.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();

            for (int neighbor : adjacency.get(node)) {
                if (!distances.containsKey(neighbor)) {
                    distances.put(neighbor, distances.get(node) + 1);
                    queue.add(neighbor);
                }
            }
        }

        return distances;
    }

    public double harmonicCentrality(int node) {
        if (!adjacency.containsKey(node)) {
            return 0.0;
        }

        Map<Integer, Integer> distances = bfsDistances(node);
        double sum = 0.0;

        for (Map.Entry<Integer, Integer> entry : distances.entrySet()) {
            int target = entry.getKey();
            int dist = entry.getValue();
            if (target != node && dist > 0) {
                sum += 1.0 / dist;
            }
        }

        return sum;
    }

    public Map<Integer, Double> allHarmonicCentralities() {
        Map<Integer, Double> result = new HashMap<>();

        for (int node : nodes) {
            result.put(node, harmonicCentrality(node));
        }

        return result;
    }

    public List<Map.Entry<Integer, Double>> topKCentralNodes(int k) {
        Map<Integer, Double> centralities = allHarmonicCentralities();
        List<Map.Entry<Integer, Double>> result = new ArrayList<>(centralities.entrySet());

        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        return result.subList(0, Math.min(k, result.size()));
    }
}