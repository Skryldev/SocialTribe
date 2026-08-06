import java.util.*;

public class ClosenessCentrality {
    private Map<Integer, Set<Integer>> adjacencyList;

    public ClosenessCentrality() {
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

    public Map<Integer, Integer> bfsDistances(int start) {
        Map<Integer, Integer> distances = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();
        
        distances.put(start, 0);
        queue.add(start);
        
        while (!queue.isEmpty()) {
            int node = queue.poll();
            for (int neighbor : adjacencyList.getOrDefault(node, new HashSet<>())) {
                if (!distances.containsKey(neighbor)) {
                    distances.put(neighbor, distances.get(node) + 1);
                    queue.add(neighbor);
                }
            }
        }
        
        return distances;
    }

    public double closenessCentrality(int node) {
        if (!adjacencyList.containsKey(node)) {
            return 0.0;
        }
        
        Map<Integer, Integer> distances = bfsDistances(node);
        int reachableNodes = distances.size() - 1;
        
        if (reachableNodes == 0) {
            return 0.0;
        }
        
        int totalDistance = 0;
        for (int distance : distances.values()) {
            totalDistance += distance;
        }
        
        return (double) reachableNodes / totalDistance;
    }

    public List<Map.Entry<Integer, Double>> allClosenessCentralities() {
        List<Map.Entry<Integer, Double>> result = new ArrayList<>();
        
        for (int node : adjacencyList.keySet()) {
            result.add(new AbstractMap.SimpleEntry<>(node, closenessCentrality(node)));
        }
        
        result.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        return result;
    }

    public List<Map.Entry<Integer, Double>> topKCentralNodes(int k) {
        List<Map.Entry<Integer, Double>> centralities = allClosenessCentralities();
        return centralities.subList(0, Math.min(k, centralities.size()));
    }

    public double normalizedClosenessCentrality(int node) {
        if (!adjacencyList.containsKey(node)) {
            return 0.0;
        }
        
        Map<Integer, Integer> distances = bfsDistances(node);
        int reachableNodes = distances.size() - 1;
        int totalNodes = adjacencyList.size();
        
        if (reachableNodes == 0 || totalNodes <= 1) {
            return 0.0;
        }
        
        int totalDistance = 0;
        for (int distance : distances.values()) {
            totalDistance += distance;
        }
        
        return ((double) reachableNodes / totalDistance) * ((double) (totalNodes - 1) / reachableNodes);
    }
}