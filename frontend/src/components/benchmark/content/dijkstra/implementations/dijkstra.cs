#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <climits>
#include <algorithm>

using namespace std;

class Dijkstra {
private:
    unordered_map<int, vector<pair<int, int>>> adjacency;
    unordered_set<int> nodes;

public:
    void add_edge(int u, int v, int weight) {
        adjacency[u].push_back({v, weight});
        adjacency[v].push_back({u, weight});
        nodes.insert(u);
        nodes.insert(v);
    }

    void add_directed_edge(int u, int v, int weight) {
        adjacency[u].push_back({v, weight});
        nodes.insert(u);
        nodes.insert(v);
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

    unordered_map<int, int> shortest_path(int source) {
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

            for (const auto& [v, w] : adjacency[u]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.push({dist[v], v});
                }
            }
        }

        return dist;
    }

    vector<int> shortest_path_with_path(int source, int target) {
        unordered_map<int, int> dist;
        unordered_map<int, int> parent;
        
        for (int node : nodes) {
            dist[node] = INT_MAX;
        }
        dist[source] = 0;
        parent[source] = -1;

        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        pq.push({0, source});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();

            if (d != dist[u]) continue;

            if (u == target) {
                vector<int> path;
                while (u != -1) {
                    path.push_back(u);
                    u = parent[u];
                }
                reverse(path.begin(), path.end());
                return path;
            }

            for (const auto& [v, w] : adjacency[u]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.push({dist[v], v});
                }
            }
        }

        return {};
    }

    unordered_map<int, vector<int>> all_shortest_paths(int source) {
        unordered_map<int, vector<int>> paths;
        unordered_map<int, int> dist;
        
        for (int node : nodes) {
            dist[node] = INT_MAX;
        }
        dist[source] = 0;
        paths[source] = {source};

        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
        pq.push({0, source});

        while (!pq.empty()) {
            auto [d, u] = pq.top();
            pq.pop();

            if (d != dist[u]) continue;

            for (const auto& [v, w] : adjacency[u]) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    paths[v] = paths[u];
                    paths[v].push_back(v);
                    pq.push({dist[v], v});
                }
            }
        }

        return paths;
    }
};