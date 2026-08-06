import java.util.*;

public class FloydWarshall {
    private Map<Integer, Set<Integer>> nodes = new HashMap<>();
    private Map<Integer, Map<Integer, Integer>> dist = new HashMap<>();
    private Map<Integer, Map<Integer, Integer>> nextNode = new HashMap<>();

    public void addEdge(int u, int v, int weight) {
        nodes.putIfAbsent(u, new HashSet<>());
        nodes.putIfAbsent(v, new HashSet<>());
        nodes.get(u).add(v);
        nodes.get(v).add(u);

        dist.putIfAbsent(u, new HashMap<>());
        dist.putIfAbsent(v, new HashMap<>());
        dist.get(u).put(v, weight);
        dist.get(v).put(u, weight);

        nextNode.putIfAbsent(u, new HashMap<>());
        nextNode.putIfAbsent(v, new HashMap<>());
        nextNode.get(u).put(v, v);
        nextNode.get(v).put(u, u);
    }

    public void addDirectedEdge(int u, int v, int weight) {
        nodes.putIfAbsent(u, new HashSet<>());
        nodes.putIfAbsent(v, new HashSet<>());
        nodes.get(u).add(v);

        dist.putIfAbsent(u, new HashMap<>());
        dist.putIfAbsent(v, new HashMap<>());
        dist.get(u).put(v, weight);

        nextNode.putIfAbsent(u, new HashMap<>());
        nextNode.putIfAbsent(v, new HashMap<>());
        nextNode.get(u).put(v, v);
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

    private void initialize() {
        List<Integer> allNodes = getAllNodes();

        for (int u : allNodes) {
            dist.putIfAbsent(u, new HashMap<>());
            nextNode.putIfAbsent(u, new HashMap<>());

            for (int v : allNodes) {
                if (u == v) {
                    dist.get(u).put(v, 0);
                } else if (!dist.get(u).containsKey(v)) {
                    dist.get(u).put(v, Integer.MAX_VALUE);
                }
            }
        }
    }

    private List<Integer> getAllNodes() {
        return new ArrayList<>(nodes.keySet());
    }

    public void allPairsShortestPaths() {
        initialize();
        List<Integer> allNodes = getAllNodes();

        for (int k : allNodes) {
            for (int i : allNodes) {
                for (int j : allNodes) {
                    if (dist.get(i).get(k) != Integer.MAX_VALUE &&
                        dist.get(k).get(j) != Integer.MAX_VALUE &&
                        dist.get(i).get(k) + dist.get(k).get(j) < dist.get(i).get(j)) {
                        dist.get(i).put(j, dist.get(i).get(k) + dist.get(k).get(j));
                        nextNode.get(i).put(j, nextNode.get(i).get(k));
                    }
                }
            }
        }
    }

    public int shortestPath(int u, int v) {
        if (!dist.containsKey(u) || !dist.get(u).containsKey(v)) {
            return Integer.MAX_VALUE;
        }
        return dist.get(u).get(v);
    }

    public List<Integer> getPath(int u, int v) {
        if (!nextNode.containsKey(u) || !nextNode.get(u).containsKey(v)) {
            return new ArrayList<>();
        }

        List<Integer> path = new ArrayList<>();
        path.add(u);

        while (u != v) {
            u = nextNode.get(u).get(v);
            path.add(u);
        }

        return path;
    }

    public Map<Integer, Map<Integer, Integer>> getAllDistances() {
        return dist;
    }

    public boolean hasNegativeCycle() {
        List<Integer> allNodes = getAllNodes();

        for (int i : allNodes) {
            if (dist.get(i).get(i) < 0) {
                return true;
            }
        }
        return false;
    }
}