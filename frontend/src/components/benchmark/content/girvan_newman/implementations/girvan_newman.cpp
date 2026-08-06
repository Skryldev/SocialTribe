#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <map>

using namespace std;

class GirvanNewman {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

    struct Edge {
        int u, v;
        bool operator==(const Edge& other) const {
            return (u == other.u && v == other.v) || (u == other.v && v == other.u);
        }
    };

    struct EdgeHash {
        size_t operator()(const Edge& e) const {
            return hash<int>()(e.u) ^ hash<int>()(e.v);
        }
    };

    map<Edge, double, EdgeHash> edge_betweenness;
    vector<vector<int>> communities;

    void bfs_distances(int start, unordered_map<int, int>& dist, 
                       unordered_map<int, vector<int>>& predecessors) {
        queue<int> q;
        dist[start] = 0;
        q.push(start);

        while (!q.empty()) {
            int node = q.front();
            q.pop();

            for (int neighbor : adjacency[node]) {
                if (dist.find(neighbor) == dist.end()) {
                    dist[neighbor] = dist[node] + 1;
                    q.push(neighbor);
                }
                if (dist[neighbor] == dist[node] + 1) {
                    predecessors[neighbor].push_back(node);
                }
            }
        }
    }

    void compute_edge_betweenness() {
        edge_betweenness.clear();
        for (auto& pair : adjacency) {
            for (int neighbor : pair.second) {
                Edge e{pair.first, neighbor};
                if (edge_betweenness.find(e) == edge_betweenness.end()) {
                    edge_betweenness[e] = 0.0;
                }
            }
        }

        for (int source : nodes) {
            unordered_map<int, int> dist;
            unordered_map<int, vector<int>> predecessors;
            bfs_distances(source, dist, predecessors);

            unordered_map<int, double> dependency;
            for (int node : nodes) {
                dependency[node] = 0.0;
            }

            vector<int> sorted_nodes;
            for (auto& pair : dist) {
                sorted_nodes.push_back(pair.first);
            }
            sort(sorted_nodes.begin(), sorted_nodes.end(),
                 [&](int a, int b) { return dist[a] > dist[b]; });

            for (int node : sorted_nodes) {
                for (int pred : predecessors[node]) {
                    double contrib = (1.0 + dependency[node]) / predecessors[node].size();
                    dependency[pred] += contrib;
                }
            }

            for (int node : nodes) {
                for (int pred : predecessors[node]) {
                    Edge e{pred, node};
                    edge_betweenness[e] += dependency[node] / predecessors[node].size();
                }
            }
        }

        for (auto& pair : edge_betweenness) {
            pair.second /= 2.0;
        }
    }

    void remove_edge_with_max_betweenness() {
        Edge max_edge{0, 0};
        double max_betweenness = -1.0;

        for (auto& pair : edge_betweenness) {
            if (pair.second > max_betweenness) {
                max_betweenness = pair.second;
                max_edge = pair.first;
            }
        }

        adjacency[max_edge.u].erase(max_edge.v);
        adjacency[max_edge.v].erase(max_edge.u);
    }

    vector<vector<int>> find_components() {
        vector<vector<int>> components;
        unordered_set<int> visited;

        for (int node : nodes) {
            if (visited.find(node) == visited.end()) {
                vector<int> component;
                queue<int> q;
                q.push(node);
                visited.insert(node);

                while (!q.empty()) {
                    int current = q.front();
                    q.pop();
                    component.push_back(current);

                    for (int neighbor : adjacency[current]) {
                        if (visited.find(neighbor) == visited.end()) {
                            visited.insert(neighbor);
                            q.push(neighbor);
                        }
                    }
                }

                if (!component.empty()) {
                    components.push_back(component);
                }
            }
        }

        return components;
    }

    double modularity(const vector<vector<int>>& communities) {
        double Q = 0.0;
        unordered_map<int, int> community_map;
        for (size_t i = 0; i < communities.size(); i++) {
            for (int node : communities[i]) {
                community_map[node] = i;
            }
        }

        double m = 0.0;
        for (auto& pair : adjacency) {
            m += pair.second.size();
        }
        m /= 2.0;

        unordered_map<int, double> degrees;
        for (int node : nodes) {
            degrees[node] = adjacency[node].size();
        }

        for (auto& pair : adjacency) {
            int u = pair.first;
            for (int v : pair.second) {
                if (community_map[u] == community_map[v]) {
                    Q += 1.0 - (degrees[u] * degrees[v]) / (2.0 * m);
                }
            }
        }

        return Q / (2.0 * m);
    }

public:
    void add_edge(int u, int v) {
        adjacency[u].insert(v);
        adjacency[v].insert(u);
        nodes.insert(u);
        nodes.insert(v);
    }

    void build_from_edges(const vector<pair<int, int>>& edges) {
        for (const auto& edge : edges) {
            add_edge(edge.first, edge.second);
        }
    }

    vector<vector<int>> detect_communities(int num_communities = 2) {
        while (true) {
            compute_edge_betweenness();
            remove_edge_with_max_betweenness();

            auto current_components = find_components();
            if ((int)current_components.size() >= num_communities) {
                communities = current_components;
                break;
            }

            if (adjacency.empty()) {
                break;
            }
        }

        return communities;
    }

    vector<vector<int>> detect_communities_by_modularity() {
        vector<vector<int>> best_communities;
        double best_modularity = -1.0;
        int iterations = 0;

        while (true) {
            compute_edge_betweenness();
            remove_edge_with_max_betweenness();

            auto current_components = find_components();
            double current_modularity = modularity(current_components);

            if (current_modularity > best_modularity) {
                best_modularity = current_modularity;
                best_communities = current_components;
            }

            if (current_components.size() == 1) {
                break;
            }

            iterations++;
            if (iterations > 1000) break;
        }

        return best_communities;
    }
};