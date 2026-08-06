import java.util.*;

public class AStar {
    private Map<Integer, Set<Integer>> graph;

    public AStar() {
        this.graph = new HashMap<>();
    }

    public void addEdge(int u, int v) {
        graph.putIfAbsent(u, new HashSet<>());
        graph.putIfAbsent(v, new HashSet<>());
        graph.get(u).add(v);
        graph.get(v).add(u);
    }

    public void buildFromEdges(List<int[]> edges) {
        for (int[] edge : edges) {
            addEdge(edge[0], edge[1]);
        }
    }

    private double heuristic(int node, int goal) {
        return Math.abs(node - goal);
    }

    public List<Integer> search(int start, int goal) {
        if (!graph.containsKey(start) || !graph.containsKey(goal)) {
            return null;
        }

        PriorityQueue<int[]> openSet = new PriorityQueue<>(Comparator.comparingDouble(a -> a[1]));
        Map<Integer, Integer> cameFrom = new HashMap<>();
        Map<Integer, Double> gScore = new HashMap<>();
        Map<Integer, Double> fScore = new HashMap<>();

        openSet.offer(new int[]{start, 0});
        cameFrom.put(start, start);
        gScore.put(start, 0.0);
        fScore.put(start, heuristic(start, goal));

        while (!openSet.isEmpty()) {
            int current = openSet.poll()[0];

            if (current == goal) {
                List<Integer> path = new ArrayList<>();
                while (current != start) {
                    path.add(current);
                    current = cameFrom.get(current);
                }
                path.add(start);
                Collections.reverse(path);
                return path;
            }

            for (int neighbor : graph.get(current)) {
                double tentativeG = gScore.get(current) + 1;

                if (!gScore.containsKey(neighbor) || tentativeG < gScore.get(neighbor)) {
                    cameFrom.put(neighbor, current);
                    gScore.put(neighbor, tentativeG);
                    fScore.put(neighbor, tentativeG + heuristic(neighbor, goal));
                    openSet.offer(new int[]{neighbor, (int) fScore.get(neighbor)});
                }
            }
        }

        return null;
    }
}