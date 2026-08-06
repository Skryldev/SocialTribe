import java.util.*;

public class PreferentialAttachment {
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

    public double preferentialAttachmentScore(int u, int v) {
        if (!adjacency.containsKey(u) || !adjacency.containsKey(v)) {
            return 0.0;
        }
        return (double) adjacency.get(u).size() * adjacency.get(v).size();
    }

    public List<Map.Entry<int[], Double>> scoreAllPairs() {
        List<Map.Entry<int[], Double>> scores = new ArrayList<>();
        List<Integer> nodeList = new ArrayList<>(nodes);

        for (int i = 0; i < nodeList.size(); i++) {
            for (int j = i + 1; j < nodeList.size(); j++) {
                int u = nodeList.get(i);
                int v = nodeList.get(j);
                double score = preferentialAttachmentScore(u, v);
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