import java.util.*;

public class Johnson {
    private static class Edge {
        int u, v, weight;
        Edge(int u, int v, int weight) {
            this.u = u;
            this.v = v;
            this.weight = weight;
        }
    }

    private List<Edge> edges = new ArrayList<>();
    private Map<Integer, Set<Integer>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();

    public void addEdge(int u, int v, int weight) {
        edges.add(new Edge(u, v, weight));
        adjacency.putIfAbsent(u, new HashSet<>());
        adjacency.get(u).add(v);
        nodes.add(u);
        nodes.add(v);
    }

    public void buildFromEdges(List<int[]> edgeList) {
        for (int[] edge : edgeList) {
            addEdge(edge[0], edge[1], edge[2]);
        }
    }

    private Map<Integer, Integer> bellmanFord(int source) {
        Map<Integer, Integer> dist = new HashMap<>();
        for (int node : nodes) {
            dist.put(node, Integer.MAX_VALUE);
        }
        dist.put(source, 0);

        for (int i = 0; i < nodes.size() - 1; i++) {
            boolean updated = false;
            for (Edge edge : edges) {
                if (dist.get(edge.u) != Integer.MAX_VALUE &&
                    dist.get(edge.u) + edge.weight < dist.get(edge.v)) {
                    dist.put(edge.v, dist.get(edge.u) + edge.weight);
                    updated = true;
                }
            }
            if (!updated) break;
        }

        for (Edge edge : edges) {
            if (dist.get(edge.u) != Integer.MAX_VALUE &&
                dist.get(edge.u) + edge.weight < dist.get(edge.v)) {
                return null;
            }
        }

        return dist;
    }

    private Map<Integer, Integer> dijkstra(int source, Map<Integer, Integer> h) {
        Map<Integer, Integer> dist = new HashMap<>();
        for (int node : nodes) {
            dist.put(node, Integer.MAX_VALUE);
        }
        dist.put(source, 0);

        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
        pq.offer(new int[]{source, 0});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();
            int u = current[0];
            int d = current[1];

            if (d != dist.get(u)) continue;

            if (!adjacency.containsKey(u)) continue;

            for (int v : adjacency.get(u)) {
                int weight = 0;
                for (Edge edge : edges) {
                    if (edge.u == u && edge.v == v) {
                        weight = edge.weight;
                        break;
                    }
                }
                int newDist = dist.get(u) + weight + h.get(u) - h.get(v);
                if (newDist < dist.get(v)) {
                    dist.put(v, newDist);
                    pq.offer(new int[]{v, dist.get(v)});
                }
            }
        }

        Map<Integer, Integer> result = new HashMap<>();
        for (int node : nodes) {
            result.put(node, dist.get(node) - h.get(source) + h.get(node));
        }
        return result;
    }

    public Map<Integer, Map<Integer, Integer>> allPairsShortestPaths() {
        int newNode = Collections.max(nodes) + 1;
        for (int node : nodes) {
            addEdge(newNode, node, 0);
        }

        Map<Integer, Integer> h = bellmanFord(newNode);
        if (h == null) {
            return null;
        }

        Map<Integer, Map<Integer, Integer>> result = new HashMap<>();
        for (int node : nodes) {
            if (node == newNode) continue;
            result.put(node, dijkstra(node, h));
        }

        return result;
    }
}