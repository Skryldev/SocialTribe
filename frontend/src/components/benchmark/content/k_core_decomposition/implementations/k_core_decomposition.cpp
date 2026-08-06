#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class KCoreDecomposition {
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

    unordered_map<int, int> k_core_decomposition() {
        unordered_map<int, int> core;
        unordered_map<int, int> degree;
        
        for (int node : nodes) {
            degree[node] = adjacency[node].size();
        }
        
        vector<vector<int>> buckets(nodes.size() + 1);
        int max_degree = 0;
        
        for (int node : nodes) {
            buckets[degree[node]].push_back(node);
            max_degree = max(max_degree, degree[node]);
        }
        
        vector<bool> removed(nodes.size() + 1, false);
        int k = 0;
        
        for (int i = 0; i <= max_degree; i++) {
            for (int node : buckets[i]) {
                if (removed[node]) continue;
                
                k = max(k, i);
                core[node] = k;
                removed[node] = true;
                
                for (int neighbor : adjacency[node]) {
                    if (!removed[neighbor]) {
                        degree[neighbor]--;
                        if (degree[neighbor] <= i) {
                            buckets[degree[neighbor]].push_back(neighbor);
                        }
                    }
                }
            }
        }
        
        for (int node : nodes) {
            if (core.find(node) == core.end()) {
                core[node] = 0;
            }
        }
        
        return core;
    }
    
    vector<int> get_k_core(int k) {
        auto core = k_core_decomposition();
        vector<int> result;
        
        for (int node : nodes) {
            if (core[node] >= k) {
                result.push_back(node);
            }
        }
        
        return result;
    }
};