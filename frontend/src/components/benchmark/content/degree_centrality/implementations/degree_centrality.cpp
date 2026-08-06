#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class DegreeCentrality {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

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

    int degree_centrality(int node) {
        if (adjacency.find(node) == adjacency.end()) {
            return 0;
        }
        return adjacency[node].size();
    }

    unordered_map<int, int> all_degree_centralities() {
        unordered_map<int, int> result;
        for (int node : nodes) {
            result[node] = degree_centrality(node);
        }
        return result;
    }

    vector<pair<int, int>> top_k_central_nodes(int k = 10) {
        auto centralities = all_degree_centralities();
        vector<pair<int, int>> result(centralities.begin(), centralities.end());
        
        sort(result.begin(), result.end(),
             [](const auto& a, const auto& b) {
                 return a.second > b.second;
             });
        
        if (k > (int)result.size()) {
            k = result.size();
        }
        
        return vector<pair<int, int>>(result.begin(), result.begin() + k);
    }

    double normalized_degree_centrality(int node) {
        if (adjacency.find(node) == adjacency.end() || nodes.size() <= 1) {
            return 0.0;
        }
        return (double)degree_centrality(node) / (nodes.size() - 1);
    }

    unordered_map<int, double> all_normalized_degree_centralities() {
        unordered_map<int, double> result;
        for (int node : nodes) {
            result[node] = normalized_degree_centrality(node);
        }
        return result;
    }
};