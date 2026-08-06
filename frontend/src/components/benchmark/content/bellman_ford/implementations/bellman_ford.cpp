#include <vector>
#include <unordered_set>
#include <unordered_map>
#include <climits>
#include <optional>

using namespace std;

class BellmanFord {
private:
    struct Edge {
        int u, v, weight;
    };
    
    vector<Edge> edges;
    unordered_set<int> vertices;

public:
    void add_edge(int u, int v, int weight) {
        edges.push_back({u, v, weight});
        vertices.insert(u);
        vertices.insert(v);
    }
    
    void build_from_edges(const vector<tuple<int, int, int>>& edge_list) {
        for (const auto& [u, v, w] : edge_list) {
            add_edge(u, v, w);
        }
    }
    
    optional<unordered_map<int, int>> shortest_path(int source) {
        if (vertices.find(source) == vertices.end()) {
            return nullopt;
        }
        
        unordered_map<int, int> dist;
        for (int v : vertices) {
            dist[v] = INT_MAX;
        }
        dist[source] = 0;
        
        for (size_t i = 0; i < vertices.size() - 1; i++) {
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
                return nullopt;
            }
        }
        
        return dist;
    }
    
    bool has_negative_cycle() {
        int start = *vertices.begin();
        return !shortest_path(start).has_value();
    }
};