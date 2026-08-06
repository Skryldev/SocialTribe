import java.util.*;

public class CommonNeighbors {
    private Map<Integer, Set<Integer>> adjacencyList;

    public CommonNeighbors() {
        this.adjacencyList = new HashMap<>();
    }

    public void addEdge(int u, int v) {
        adjacencyList.putIfAbsent(u, new HashSet<>());
        adjacencyList.putIfAbsent(v, new HashSet<>());
        adjacencyList.get(u).add(v);
        adjacencyList.get(v).add(u);
    }

    public void buildFromEdges(List<int[]> edges) {
        for (int[] edge : edges) {
            addEdge(edge[0], edge[1]);
        }
    }

    public Set<Integer> commonNeighbors(int u, int v) {
        if (!adjacencyList.containsKey(u) || !adjacencyList.containsKey(v)) {
            return new HashSet<>();
        }

        Set<Integer> result = new HashSet<>();
        for (int node : adjacencyList.get(u)) {
            if (adjacencyList.get(v).contains(node)) {
                result.add(node);
            }
        }
        return result;
    }

    public int commonNeighborsCount(int u, int v) {
        return commonNeighbors(u, v).size();
    }

    public boolean predictLink(int u, int v, int threshold) {
        return commonNeighborsCount(u, v) >= threshold;
    }

    public List<Map.Entry<int[], Integer>> scoreAllPairs() {
        List<Map.Entry<int[], Integer>> scores = new ArrayList<>();
        List<Integer> nodes = new ArrayList<>(adjacencyList.keySet());

        for (int i = 0; i < nodes.size(); i++) {
            for (int j = i + 1; j < nodes.size(); j++) {
                int u = nodes.get(i);
                int v = nodes.get(j);
                int count = commonNeighborsCount(u, v);
                if (count > 0) {
                    scores.add(new AbstractMap.SimpleEntry<>(new int[]{u, v}, count));
                }
            }
        }

        scores.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return scores;
    }

    public List<Map.Entry<int[], Integer>> topKPredictions(int k) {
        List<Map.Entry<int[], Integer>> scores = scoreAllPairs();
        return scores.subList(0, Math.min(k, scores.size()));
    }
}