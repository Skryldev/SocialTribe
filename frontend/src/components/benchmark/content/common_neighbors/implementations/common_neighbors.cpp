#include <vector>
#include <set>
#include <map>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class CommonNeighbors {
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
    
    unordered_set<int> common_neighbors(int u, int v) {
        if (adjacency_list.find(u) == adjacency_list.end() || 
            adjacency_list.find(v) == adjacency_list.end()) {
            return unordered_set<int>();
        }
        
        unordered_set<int> result;
        for (int node : adjacency_list[u]) {
            if (adjacency_list[v].find(node) != adjacency_list[v].end()) {
                result.insert(node);
            }
        }
        return result;
    }
    
    int common_neighbors_count(int u, int v) {
        return common_neighbors(u, v).size();
    }
    
    bool predict_link(int u, int v, int threshold = 1) {
        return common_neighbors_count(u, v) >= threshold;
    }
    
    vector<pair<pair<int, int>, int>> score_all_pairs() {
        vector<pair<pair<int, int>, int>> scores;
        vector<int> nodes;
        
        for (const auto& pair : adjacency_list) {
            nodes.push_back(pair.first);
        }
        
        for (size_t i = 0; i < nodes.size(); i++) {
            for (size_t j = i + 1; j < nodes.size(); j++) {
                int u = nodes[i];
                int v = nodes[j];
                int count = common_neighbors_count(u, v);
                if (count > 0) {
                    scores.push_back({{u, v}, count});
                }
            }
        }
        
        sort(scores.begin(), scores.end(), 
             [](const auto& a, const auto& b) {
                 return a.second > b.second;
             });
        
        return scores;
    }
    
    vector<pair<pair<int, int>, int>> top_k_predictions(int k = 10) {
        auto scores = score_all_pairs();
        vector<pair<pair<int, int>, int>> result;
        for (int i = 0; i < min(k, (int)scores.size()); i++) {
            result.push_back(scores[i]);
        }
        return result;
    }
};