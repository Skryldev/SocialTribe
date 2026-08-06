import java.util.*;

public class AdamicAdar {
    private Map<Integer, Set<Integer>> adjacencyList;

    public AdamicAdar() {
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

    public double adamicAdarScore(int u, int v) {
        if (!adjacencyList.containsKey(u) || !adjacencyList.containsKey(v)) {
            return 0.0;
        }

        double score = 0.0;
        for (int node : adjacencyList.get(u)) {
            if (adjacencyList.get(v).contains(node)) {
                int degree = adjacencyList.get(node).size();
                if (degree > 1) {
                    score += 1.0 / Math.log(degree);
                }
            }
        }
        return score;
    }

    public List<Map.Entry<int[], Double>> scoreAllPairs() {
        List<Map.Entry<int[], Double>> scores = new ArrayList<>();
        List<Integer> nodes = new ArrayList<>(adjacencyList.keySet());

        for (int i = 0; i < nodes.size(); i++) {
            for (int j = i + 1; j < nodes.size(); j++) {
                int u = nodes.get(i);
                int v = nodes.get(j);
                double score = adamicAdarScore(u, v);
                if (score > 0) {
                    scores.add(new AbstractMap.SimpleEntry<>(new int[]{u, v}, score));
                }
            }
        }

        scores.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return scores;
    }

    public List<Map.Entry<int[], Double>> topKPredictions(int k) {
        List<Map.Entry<int[], Double>> scores = scoreAllPairs();
        return scores.subList(0, Math.min(k, scores.size()));
    }
}