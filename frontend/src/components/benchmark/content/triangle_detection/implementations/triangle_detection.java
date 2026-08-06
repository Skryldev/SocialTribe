import java.util.*;

public class TriangleDetection {
    private Map<Integer, Set<Integer>> adjacencyList;

    public TriangleDetection() {
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

    public int countTriangles() {
        int count = 0;
        for (Map.Entry<Integer, Set<Integer>> entry : adjacencyList.entrySet()) {
            int u = entry.getKey();
            Set<Integer> neighbors = entry.getValue();
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacencyList.get(v).contains(w)) {
                            count++;
                        }
                    }
                }
            }
        }
        return count;
    }

    public List<int[]> findTriangles() {
        List<int[]> triangles = new ArrayList<>();
        for (Map.Entry<Integer, Set<Integer>> entry : adjacencyList.entrySet()) {
            int u = entry.getKey();
            Set<Integer> neighbors = entry.getValue();
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacencyList.get(v).contains(w)) {
                            triangles.add(new int[]{u, v, w});
                        }
                    }
                }
            }
        }
        return triangles;
    }

    public boolean hasTriangle() {
        for (Map.Entry<Integer, Set<Integer>> entry : adjacencyList.entrySet()) {
            int u = entry.getKey();
            Set<Integer> neighbors = entry.getValue();
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacencyList.get(v).contains(w)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}