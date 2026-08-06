#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <climits>
#include <algorithm>

using namespace std;

class FloydWarshall {
private:
    unordered_map<int, unordered_set<int>> nodes;
    unordered_map<int, unordered_map<int, int>> dist;
    unordered_map<int, unordered_map<int, int>> next_node;

public:
    void add_edge(int u, int v, int weight) {
        nodes[u].insert(v);
        nodes[v].insert(u);
        dist[u][v] = weight;
        dist[v][u] = weight;
        next_node[u][v] = v;
        next_node[v][u] = u;
    }

    void add_directed_edge(int u, int v, int weight) {
        nodes[u].insert(v);
        dist[u][v] = weight;
        next_node[u][v] = v;
    }

    void build_from_edges(const vector<tuple<int, int, int>>& edges, bool directed = false) {
        for (const auto& [u, v, w] : edges) {
            if (directed) {
                add_directed_edge(u, v, w);
            } else {
                add_edge(u, v, w);
            }
        }
    }

    void initialize() {
        for (int u : get_all_nodes()) {
            for (int v : get_all_nodes()) {
                if (u == v) {
                    dist[u][v] = 0;
                } else if (dist[u].find(v) == dist[u].end()) {
                    dist[u][v] = INT_MAX;
                }
            }
        }
    }

    vector<int> get_all_nodes() {
        vector<int> result;
        for (const auto& pair : nodes) {
            result.push_back(pair.first);
        }
        return result;
    }

    void all_pairs_shortest_paths() {
        initialize();

        vector<int> node_list = get_all_nodes();

        for (int k : node_list) {
            for (int i : node_list) {
                for (int j : node_list) {
                    if (dist[i][k] != INT_MAX && dist[k][j] != INT_MAX &&
                        dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                        next_node[i][j] = next_node[i][k];
                    }
                }
            }
        }
    }

    int shortest_path(int u, int v) {
        if (dist[u].find(v) == dist[u].end()) {
            return INT_MAX;
        }
        return dist[u][v];
    }

    vector<int> get_path(int u, int v) {
        if (next_node[u].find(v) == next_node[u].end()) {
            return {};
        }

        vector<int> path;
        path.push_back(u);

        while (u != v) {
            u = next_node[u][v];
            path.push_back(u);
        }

        return path;
    }

    unordered_map<int, unordered_map<int, int>> get_all_distances() {
        return dist;
    }

    bool has_negative_cycle() {
        vector<int> node_list = get_all_nodes();

        for (int i : node_list) {
            if (dist[i][i] < 0) {
                return true;
            }
        }
        return false;
    }
};