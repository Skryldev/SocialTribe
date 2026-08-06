import java.util.*;

public class BetweennessCentrality {
    private Map<Integer, Set<Integer>> adjacencyList;

    public BetweennessCentrality() {
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

    public Map<Integer, Double> betweennessCentrality() {
        Map<Integer, Double> centrality = new HashMap<>();
        for (int node : adjacencyList.keySet()) {
            centrality.put(node, 0.0);
        }

        for (int s : adjacencyList.keySet()) {
            Stack<Integer> stack = new Stack<>();
            Map<Integer, List<Integer>> pred = new HashMap<>();
            Map<Integer, Integer> dist = new HashMap<>();
            Map<Integer, Integer> sigma = new HashMap<>();

            for (int node : adjacencyList.keySet()) {
                pred.put(node, new ArrayList<>());
                dist.put(node, -1);
                sigma.put(node, 0);
            }

            dist.put(s, 0);
            sigma.put(s, 1);
            Queue<Integer> queue = new LinkedList<>();
            queue.add(s);

            while (!queue.isEmpty()) {
                int v = queue.poll();
                stack.push(v);

                for (int w : adjacencyList.get(v)) {
                    if (dist.get(w) < 0) {
                        dist.put(w, dist.get(v) + 1);
                        queue.add(w);
                    }
                    if (dist.get(w) == dist.get(v) + 1) {
                        sigma.put(w, sigma.get(w) + sigma.get(v));
                        pred.get(w).add(v);
                    }
                }
            }

            Map<Integer, Double> delta = new HashMap<>();
            for (int node : adjacencyList.keySet()) {
                delta.put(node, 0.0);
            }

            while (!stack.isEmpty()) {
                int w = stack.pop();

                for (int v : pred.get(w)) {
                    delta.put(v, delta.get(v) + ((double)sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
                }

                if (w != s) {
                    centrality.put(w, centrality.get(w) + delta.get(w));
                }
            }
        }

        return centrality;
    }

    public List<Map.Entry<Integer, Double>> topKCentralNodes(int k) {
        Map<Integer, Double> centrality = betweennessCentrality();
        List<Map.Entry<Integer, Double>> result = new ArrayList<>(centrality.entrySet());
        
        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        
        return result.subList(0, Math.min(k, result.size()));
    }
}