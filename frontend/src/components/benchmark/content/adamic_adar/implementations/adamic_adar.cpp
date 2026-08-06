#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <algorithm>

using namespace std;

class AdamicAdar {
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
    
    double adamic_adar(int u, int v) {
        if (adjacency_list.find(u) == adjacency_list.end() || 
            adjacency_list.find(v) == adjacency_list.end()) {
            return 0.0;
        }
        
        double score = 0.0;
        for (int node : adjacency_list[u]) {
            if (adjacency_list[v].find(node) != adjacency_list[v].end()) {
                int degree = adjacency_list[node].size();
                if (degree > 1) {
                    score += 1.0 / log(degree);
                }
            }
        }
        return score;
    }
    
    vector<pair<pair<int, int>, double>> score_all_pairs() {
        vector<pair<pair<int, int>, double>> scores;
        vector<int> nodes;
        
        for (const auto& pair : adjacency_list) {
            nodes.push_back(pair.first);
        }
        
        for (size_t i = 0; i < nodes.size(); i++) {
            for (size_t j = i + 1; j < nodes.size(); j++) {
                int u = nodes[i];
                int v = nodes[j];
                double score = adamic_adar(u, v);
                if (score > 0) {
                    scores.push_back({{u, v}, score});
                }
            }
        }
        
        sort(scores.begin(), scores.end(), 
             [](const auto& a, const auto& b) {
                 return a.second > b.second;
             });
        
        return scores;
    }
    
    vector<pair<pair<int, int>, double>> top_k_predictions(int k = 10) {
        auto scores = score_all_pairs();
        vector<pair<pair<int, int>, double>> result;
        for (int i = 0; i < min(k, (int)scores.size()); i++) {
            result.push_back(scores[i]);
        }
        return result;
    }
};