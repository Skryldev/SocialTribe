import java.util.*;

public class BFS {
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

    public Map<Integer, Integer> bfs(int start) {
        Map<Integer, Integer> distances = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();

        distances.put(start, 0);
        queue.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();

            if (!adjacency.containsKey(node)) continue;

            for (int neighbor : adjacency.get(node)) {
                if (!distances.containsKey(neighbor)) {
                    distances.put(neighbor, distances.get(node) + 1);
                    queue.add(neighbor);
                }
            }
        }

        return distances;
    }

    public List<Integer> bfsPath(int start, int goal) {
        Map<Integer, Integer> parent = new HashMap<>();
        Queue<Integer> queue = new LinkedList<>();

        parent.put(start, -1);
        queue.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();

            if (node == goal) {
                List<Integer> path = new ArrayList<>();
                while (node != -1) {
                    path.add(node);
                    node = parent.get(node);
                }
                Collections.reverse(path);
                return path;
            }

            if (!adjacency.containsKey(node)) continue;

            for (int neighbor : adjacency.get(node)) {
                if (!parent.containsKey(neighbor)) {
                    parent.put(neighbor, node);
                    queue.add(neighbor);
                }
            }
        }

        return new ArrayList<>();
    }

    public List<Integer> bfsOrder(int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();

        visited.add(start);
        queue.add(start);

        while (!queue.isEmpty()) {
            int node = queue.poll();
            order.add(node);

            if (!adjacency.containsKey(node)) continue;

            for (int neighbor : adjacency.get(node)) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }

        return order;
    }

    public boolean isConnected() {
        if (nodes.isEmpty()) return true;

        int start = nodes.iterator().next();
        Map<Integer, Integer> distances = bfs(start);
        return distances.size() == nodes.size();
    }
}