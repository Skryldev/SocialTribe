import java.util.*;

public class BellmanFord {
    private static class Edge {
        int u, v, weight;
        Edge(int u, int v, int weight) {
            this.u = u;
            this.v = v;
            this.weight = weight;
        }
    }

    private List<Edge> edges = new ArrayList<>();
    private Set<Integer> vertices = new HashSet<>();

    public void addEdge(int u, int v, int weight) {
        edges.add(new Edge(u, v, weight));
        vertices.add(u);
        vertices.add(v);
    }

    public void buildFromEdges(List<int[]> edgeList) {
        for (int[] edge : edgeList) {
            addEdge(edge[0], edge[1], edge[2]);
        }
    }

    public Map<Integer, Integer> shortestPath(int source) {
        if (!vertices.contains(source)) {
            return null;
        }

        Map<Integer, Integer> dist = new HashMap<>();
        for (int v : vertices) {
            dist.put(v, Integer.MAX_VALUE);
        }
        dist.put(source, 0);

        for (int i = 0; i < vertices.size() - 1; i++) {
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

    public boolean hasNegativeCycle() {
        int start = vertices.iterator().next();
        return shortestPath(start) == null;
    }
}