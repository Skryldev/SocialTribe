#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cmath>

using namespace std;

class HarmonicCentrality {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

    unordered_map<int, int> bfs_distances(int start) {
        unordered_map<int, int> distances;
        queue<int> q;
        
        distances[start] = 0;
        q.push(start);
        
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            
            for (int neighbor : adjacency[node]) {
                if (distances.find(neighbor) == distances.end()) {
                    distances[neighbor] = distances[node] + 1;
                    q.push(neighbor);
                }
            }
        }
        
        return distances;
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

    double harmonic_centrality(int node) {
        if (adjacency.find(node) == adjacency.end()) {
            return 0.0;
        }

        auto distances = bfs_distances(node);
        double sum = 0.0;
        
        for (const auto& pair : distances) {
            int target = pair.first;
            int dist = pair.second;
            if (target != node && dist > 0) {
                sum += 1.0 / dist;
            }
        }
        
        return sum;
    }

    unordered_map<int, double> all_harmonic_centralities() {
        unordered_map<int, double> result;
        
        for (int node : nodes) {
            result[node] = harmonic_centrality(node);
        }
        
        return result;
    }

    vector<pair<int, double>> top_k_central_nodes(int k = 10) {
        auto centralities = all_harmonic_centralities();
        vector<pair<int, double>> result(centralities.begin(), centralities.end());
        
        sort(result.begin(), result.end(),
             [](const auto& a, const auto& b) {
                 return a.second > b.second;
             });
        
        if (k > (int)result.size()) {
            k = result.size();
        }
        
        return vector<pair<int, double>>(result.begin(), result.begin() + k);
    }
};