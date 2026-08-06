#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class ClosenessCentrality {
private:
    unordered_map<int, unordered_set<int>> adjacency_list;

public:
    void add_edge(int u, int v) {
        adjacency_list[u].insert(v);
        adjacency_list[v].insert(u);
    }
    
    void build_from_edges(const vector<pair<int, int>>& edges) {
        for (const auto& edge : edges) {
            add_edge(edge.first, edge.second);
        }
    }
    
    unordered_map<int, int> bfs_distances(int start) {
        unordered_map<int, int> distances;
        queue<int> q;
        
        distances[start] = 0;
        q.push(start);
        
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            
            for (int neighbor : adjacency_list[node]) {
                if (distances.find(neighbor) == distances.end()) {
                    distances[neighbor] = distances[node] + 1;
                    q.push(neighbor);
                }
            }
        }
        
        return distances;
    }
    
    double closeness_centrality(int node) {
        if (adjacency_list.find(node) == adjacency_list.end()) {
            return 0.0;
        }
        
        auto distances = bfs_distances(node);
        int reachable_nodes = distances.size() - 1;
        
        if (reachable_nodes == 0) {
            return 0.0;
        }
        
        int total_distance = 0;
        for (const auto& pair : distances) {
            total_distance += pair.second;
        }
        
        return (double)reachable_nodes / total_distance;
    }
    
    vector<pair<int, double>> all_closeness_centralities() {
        vector<pair<int, double>> result;
        
        for (const auto& pair : adjacency_list) {
            result.push_back({pair.first, closeness_centrality(pair.first)});
        }
        
        sort(result.begin(), result.end(), 
             [](const auto& a, const auto& b) {
                 return a.second > b.second;
             });
        
        return result;
    }
    
    vector<pair<int, double>> top_k_central_nodes(int k = 10) {
        auto centralities = all_closeness_centralities();
        vector<pair<int, double>> result;
        
        for (int i = 0; i < min(k, (int)centralities.size()); i++) {
            result.push_back(centralities[i]);
        }
        
        return result;
    }
    
    double normalized_closeness_centrality(int node) {
        if (adjacency_list.find(node) == adjacency_list.end()) {
            return 0.0;
        }
        
        auto distances = bfs_distances(node);
        int reachable_nodes = distances.size() - 1;
        int total_nodes = adjacency_list.size();
        
        if (reachable_nodes == 0 || total_nodes <= 1) {
            return 0.0;
        }
        
        int total_distance = 0;
        for (const auto& pair : distances) {
            total_distance += pair.second;
        }
        
        return ((double)reachable_nodes / total_distance) * ((double)(total_nodes - 1) / reachable_nodes);
    }
};