import java.util.*;

public class KCoreDecomposition {
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

    public Map<Integer, Integer> kCoreDecomposition() {
        Map<Integer, Integer> core = new HashMap<>();
        Map<Integer, Integer> degree = new HashMap<>();

        for (int node : nodes) {
            degree.put(node, adjacency.get(node).size());
        }

        List<List<Integer>> buckets = new ArrayList<>(nodes.size() + 1);
        for (int i = 0; i <= nodes.size(); i++) {
            buckets.add(new ArrayList<>());
        }

        int maxDegree = 0;
        for (int node : nodes) {
            buckets.get(degree.get(node)).add(node);
            maxDegree = Math.max(maxDegree, degree.get(node));
        }

        Set<Integer> removed = new HashSet<>();
        int k = 0;

        for (int i = 0; i <= maxDegree; i++) {
            for (int node : buckets.get(i)) {
                if (removed.contains(node)) continue;

                k = Math.max(k, i);
                core.put(node, k);
                removed.add(node);

                for (int neighbor : adjacency.get(node)) {
                    if (!removed.contains(neighbor)) {
                        degree.put(neighbor, degree.get(neighbor) - 1);
                        if (degree.get(neighbor) <= i) {
                            buckets.get(degree.get(neighbor)).add(neighbor);
                        }
                    }
                }
            }
        }

        for (int node : nodes) {
            if (!core.containsKey(node)) {
                core.put(node, 0);
            }
        }

        return core;
    }

    public List<Integer> getKCore(int k) {
        Map<Integer, Integer> core = kCoreDecomposition();
        List<Integer> result = new ArrayList<>();

        for (int node : nodes) {
            if (core.get(node) >= k) {
                result.add(node);
            }
        }

        return result;
    }
}