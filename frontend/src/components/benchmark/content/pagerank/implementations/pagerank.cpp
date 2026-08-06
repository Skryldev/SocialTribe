#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cmath>

using namespace std;

class PageRank {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

public:
    void add_edge(int u, int v) {
        adjacency[u].insert(v);
        nodes.insert(u);
        nodes.insert(v);
    }
    
    void build_from_edges(const vector<pair<int, int>>& edges) {
        for (const auto& edge : edges) {
            add_edge(edge.first, edge.second);
        }
    }
    
    unordered_map<int, double> pagerank(double damping = 0.85, int max_iter = 100, double tol = 1e-6) {
        unordered_map<int, double> pr;
        int n = nodes.size();
        
        if (n == 0) return pr;
        
        for (int node : nodes) {
            pr[node] = 1.0 / n;
        }
        
        for (int iter = 0; iter < max_iter; iter++) {
            unordered_map<int, double> new_pr;
            double diff = 0.0;
            
            for (int node : nodes) {
                double rank = (1 - damping) / n;
                
                for (int neighbor : nodes) {
                    if (adjacency[neighbor].find(node) != adjacency[neighbor].end()) {
                        int out_degree = adjacency[neighbor].size();
                        if (out_degree > 0) {
                            rank += damping * (pr[neighbor] / out_degree);
                        }
                    }
                }
                
                new_pr[node] = rank;
                diff += abs(new_pr[node] - pr[node]);
            }
            
            pr = new_pr;
            if (diff < tol) break;
        }
        
        return pr;
    }
    
    vector<pair<int, double>> top_k_nodes(int k = 10, double damping = 0.85) {
        auto pr = pagerank(damping);
        vector<pair<int, double>> result(pr.begin(), pr.end());
        
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