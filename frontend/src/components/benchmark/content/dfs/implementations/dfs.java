import java.util.*;

public class DFS {
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

    public void addDirectedEdge(int u, int v) {
        adjacency.putIfAbsent(u, new HashSet<>());
        adjacency.putIfAbsent(v, new HashSet<>());
        adjacency.get(u).add(v);
        nodes.add(u);
        nodes.add(v);
    }

    public void buildFromEdges(List<int[]> edges, boolean directed) {
        for (int[] edge : edges) {
            if (directed) {
                addDirectedEdge(edge[0], edge[1]);
            } else {
                addEdge(edge[0], edge[1]);
            }
        }
    }

    private void dfsRecursive(int node, Set<Integer> visited, List<Integer> order) {
        visited.add(node);
        order.add(node);

        if (!adjacency.containsKey(node)) return;

        for (int neighbor : adjacency.get(node)) {
            if (!visited.contains(neighbor)) {
                dfsRecursive(neighbor, visited, order);
            }
        }
    }

    public List<Integer> dfsRecursive(int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        dfsRecursive(start, visited, order);
        return order;
    }

    public List<Integer> dfsIterative(int start) {
        List<Integer> order = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Stack<Integer> stack = new Stack<>();

        stack.push(start);

        while (!stack.isEmpty()) {
            int node = stack.pop();

            if (visited.contains(node)) continue;

            visited.add(node);
            order.add(node);

            if (!adjacency.containsKey(node)) continue;

            for (int neighbor : adjacency.get(node)) {
                if (!visited.contains(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        return order;
    }

    public List<Integer> dfsPath(int start, int goal) {
        Map<Integer, Integer> parent = new HashMap<>();
        Set<Integer> visited = new HashSet<>();
        Stack<Integer> stack = new Stack<>();

        parent.put(start, -1);
        stack.push(start);

        while (!stack.isEmpty()) {
            int node = stack.pop();

            if (visited.contains(node)) continue;
            visited.add(node);

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
                if (!visited.contains(neighbor)) {
                    parent.put(neighbor, node);
                    stack.push(neighbor);
                }
            }
        }

        return new ArrayList<>();
    }

    public List<List<Integer>> findComponents() {
        List<List<Integer>> components = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();

        for (int node : nodes) {
            if (!visited.contains(node)) {
                List<Integer> component = new ArrayList<>();
                dfsRecursive(node, visited, component);
                components.add(component);
            }
        }

        return components;
    }

    public boolean isConnected() {
        if (nodes.isEmpty()) return true;

        int start = nodes.iterator().next();
        Set<Integer> visited = new HashSet<>();
        List<Integer> order = new ArrayList<>();
        dfsRecursive(start, visited, order);

        return visited.size() == nodes.size();
    }

    public boolean hasCycle() {
        Set<Integer> visited = new HashSet<>();
        Set<Integer> recStack = new HashSet<>();

        for (int node : nodes) {
            if (!visited.contains(node)) {
                if (hasCycleUtil(node, visited, recStack, -1)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean hasCycleUtil(int node, Set<Integer> visited, Set<Integer> recStack, int parent) {
        visited.add(node);
        recStack.add(node);

        if (!adjacency.containsKey(node)) return false;

        for (int neighbor : adjacency.get(node)) {
            if (recStack.contains(neighbor) && neighbor != parent) {
                return true;
            }

            if (!visited.contains(neighbor)) {
                if (hasCycleUtil(neighbor, visited, recStack, node)) {
                    return true;
                }
            }
        }

        recStack.remove(node);
        return false;
    }
}