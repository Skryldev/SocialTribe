#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <climits>
#include <algorithm>

using namespace std;

class Johnson {
private:
    struct Edge {
        int u, v, weight;
    };

    vector<Edge> edges;
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

    vector<int> bellman_ford(int source) {
        unordered_map<int, int> dist;
        for (int node : nodes) {
            dist[node] = INT_MAX;
        }
        dist[source] = 0;

        for (size_t i = 0; i < nodes.size() - 1; i++) {
            bool updated = false;
            for (const auto& edge : edges) {
                if (dist[edge.u] != INT_MAX && dist[edge.u] + edge.weight < dist[edge.v]) {
                    dist[edge.v] = dist[edge.u] + edge.weight;
                    updated = true;
                }
            }
            if (!updated) break;
        }

        for (const auto& edge : edges) {
            if (dist[edge.u] != INT_MAX && dist[edge.u] + edge.weight < dist[edge.v]) {
                return {};
            }
        }

        vector<int> result(nodes.size());
        for (int node : nodes) {
            result[node] = dist[node];
        }
        return result;
    }

    vector<int> dijkstra(int source, const vector<int>& h) {
        unordered_map<int, int> dist;
        for (int node : nodes) {
            dist[node] = INT_MAX;
        }
        dist[source] = 0;

        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        pq.push({0, source});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();

            if (d != dist[u]) continue;

            for (int v : adjacency[u]) {
                int weight = 0;
                for (const auto& edge : edges) {
                    if (edge.u == u && edge.v == v) {
                        weight = edge.weight;
                        break;
                    }
                }
                int new_dist = dist[u] + weight + h[u] - h[v];
                if (new_dist < dist[v]) {
                    dist[v] = new_dist;
                    pq.push({dist[v], v});
                }
            }
        }

        vector<int> result(nodes.size());
        for (int node : nodes) {
            result[node] = dist[node] - h[source] + h[node];
        }
        return result;
    }

public:
    void add_edge(int u, int v, int weight) {
        edges.push_back({u, v, weight});
        adjacency[u].insert(v);
        nodes.insert(u);
        nodes.insert(v);
    }

    void build_from_edges(const vector<tuple<int, int, int>>& edge_list) {
        for (const auto& [u, v, w] : edge_list) {
            add_edge(u, v, w);
        }
    }

    vector<vector<int>> all_pairs_shortest_paths() {
        int new_node = *max_element(nodes.begin(), nodes.end()) + 1;
        for (int node : nodes) {
            add_edge(new_node, node, 0);
        }

        vector<int> h = bellman_ford(new_node);
        if (h.empty()) {
            return {};
        }

        for (auto& edge : edges) {
            if (edge.u == new_node) {
                continue;
            }
        }

        vector<vector<int>> result(nodes.size());
        for (int node : nodes) {
            if (node == new_node) continue;
            result[node] = dijkstra(node, h);
        }

        return result;
    }
};