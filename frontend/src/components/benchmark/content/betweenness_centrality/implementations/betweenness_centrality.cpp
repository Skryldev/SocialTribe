#include <vector>
#include <queue>
#include <stack>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class BetweennessCentrality {
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
    
    unordered_map<int, double> betweenness_centrality() {
        unordered_map<int, double> centrality;
        for (const auto& pair : adjacency_list) {
            centrality[pair.first] = 0.0;
        }
        
        for (const auto& pair : adjacency_list) {
            int s = pair.first;
            
            vector<int> stack;
            unordered_map<int, vector<int>> pred;
            unordered_map<int, int> dist;
            unordered_map<int, int> sigma;
            
            for (const auto& node : adjacency_list) {
                pred[node.first] = vector<int>();
                dist[node.first] = -1;
                sigma[node.first] = 0;
            }
            
            dist[s] = 0;
            sigma[s] = 1;
            queue<int> q;
            q.push(s);
            
            while (!q.empty()) {
                int v = q.front();
                q.pop();
                stack.push_back(v);
                
                for (int w : adjacency_list[v]) {
                    if (dist[w] < 0) {
                        dist[w] = dist[v] + 1;
                        q.push(w);
                    }
                    if (dist[w] == dist[v] + 1) {
                        sigma[w] += sigma[v];
                        pred[w].push_back(v);
                    }
                }
            }
            
            unordered_map<int, double> delta;
            for (const auto& node : adjacency_list) {
                delta[node.first] = 0.0;
            }
            
            while (!stack.empty()) {
                int w = stack.back();
                stack.pop_back();
                
                for (int v : pred[w]) {
                    delta[v] += ((double)sigma[v] / sigma[w]) * (1 + delta[w]);
                }
                
                if (w != s) {
                    centrality[w] += delta[w];
                }
            }
        }
        
        return centrality;
    }
    
    vector<pair<int, double>> top_k_central_nodes(int k = 10) {
        auto centrality = betweenness_centrality();
        vector<pair<int, double>> result(centrality.begin(), centrality.end());
        
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