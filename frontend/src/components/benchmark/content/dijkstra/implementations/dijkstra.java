import java.util.*;

public class Dijkstra {
    private Map<Integer, List<int[]>> adjacency = new HashMap<>();
    private Set<Integer> nodes = new HashSet<>();

    public void addEdge(int u, int v, int weight) {
        adjacency.putIfAbsent(u, new ArrayList<>());
        adjacency.putIfAbsent(v, new ArrayList<>());
        adjacency.get(u).add(new int[]{v, weight});
        adjacency.get(v).add(new int[]{u, weight});
        nodes.add(u);
        nodes.add(v);
    }

    public void addDirectedEdge(int u, int v, int weight) {
        adjacency.putIfAbsent(u, new ArrayList<>());
        adjacency.putIfAbsent(v, new ArrayList<>());
        adjacency.get(u).add(new int[]{v, weight});
        nodes.add(u);
        nodes.add(v);
    }

    public void buildFromEdges(List<int[]> edges, boolean directed) {
        for (int[] edge : edges) {
            if (directed) {
                addDirectedEdge(edge[0], edge[1], edge[2]);
            } else {
                addEdge(edge[0], edge[1], edge[2]);
            }
        }
    }

    public Map<Integer, Integer> shortestPath(int source) {
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

            for (int[] edge : adjacency.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (dist.get(u) + w < dist.get(v)) {
                    dist.put(v, dist.get(u) + w);
                    pq.offer(new int[]{v, dist.get(v)});
                }
            }
        }

        return dist;
    }

    public List<Integer> shortestPathWithPath(int source, int target) {
        Map<Integer, Integer> dist = new HashMap<>();
        Map<Integer, Integer> parent = new HashMap<>();

        for (int node : nodes) {
            dist.put(node, Integer.MAX_VALUE);
        }
        dist.put(source, 0);
        parent.put(source, -1);

        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
        pq.offer(new int[]{source, 0});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();
            int u = current[0];
            int d = current[1];

            if (d != dist.get(u)) continue;

            if (u == target) {
                List<Integer> path = new ArrayList<>();
                while (u != -1) {
                    path.add(u);
                    u = parent.get(u);
                }
                Collections.reverse(path);
                return path;
            }

            if (!adjacency.containsKey(u)) continue;

            for (int[] edge : adjacency.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (dist.get(u) + w < dist.get(v)) {
                    dist.put(v, dist.get(u) + w);
                    parent.put(v, u);
                    pq.offer(new int[]{v, dist.get(v)});
                }
            }
        }

        return new ArrayList<>();
    }

    public Map<Integer, List<Integer>> allShortestPaths(int source) {
        Map<Integer, List<Integer>> paths = new HashMap<>();
        Map<Integer, Integer> dist = new HashMap<>();

        for (int node : nodes) {
            dist.put(node, Integer.MAX_VALUE);
        }
        dist.put(source, 0);
        paths.put(source, new ArrayList<>(Arrays.asList(source)));

        PriorityQueue<int[]> pq = new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
        pq.offer(new int[]{source, 0});

        while (!pq.isEmpty()) {
            int[] current = pq.poll();
            int u = current[0];
            int d = current[1];

            if (d != dist.get(u)) continue;

            if (!adjacency.containsKey(u)) continue;

            for (int[] edge : adjacency.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (dist.get(u) + w < dist.get(v)) {
                    dist.put(v, dist.get(u) + w);
                    paths.put(v, new ArrayList<>(paths.get(u)));
                    paths.get(v).add(v);
                    pq.offer(new int[]{v, dist.get(v)});
                }
            }
        }

        return paths;
    }
}