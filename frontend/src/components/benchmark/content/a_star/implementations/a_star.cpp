#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>
#include <optional>

using namespace std;

class AStar {
private:
    unordered_map<int, unordered_set<int>> graph;

public:
    void add_edge(int u, int v) {
        graph[u].insert(v);
        graph[v].insert(u);
    }
    
    void build_from_edges(const vector<pair<int, int>>& edges) {
        for (const auto& edge : edges) {
            add_edge(edge.first, edge.second);
        }
    }
    
    double heuristic(int node, int goal) {
        return abs(node - goal);
    }
    
    optional<vector<int>> search(int start, int goal) {
        if (graph.find(start) == graph.end() || graph.find(goal) == graph.end()) {
            return nullopt;
        }
        
        priority_queue<pair<double, int>, vector<pair<double, int>>, greater<pair<double, int>>> open_set;
        unordered_map<int, int> came_from;
        unordered_map<int, double> g_score;
        unordered_map<int, double> f_score;
        
        open_set.push({0, start});
        came_from[start] = start;
        g_score[start] = 0;
        f_score[start] = heuristic(start, goal);
        
        while (!open_set.empty()) {
            int current = open_set.top().second;
            open_set.pop();
            
            if (current == goal) {
                vector<int> path;
                while (current != start) {
                    path.push_back(current);
                    current = came_from[current];
                }
                path.push_back(start);
                reverse(path.begin(), path.end());
                return path;
            }
            
            for (int neighbor : graph[current]) {
                double tentative_g = g_score[current] + 1;
                
                if (g_score.find(neighbor) == g_score.end() || tentative_g < g_score[neighbor]) {
                    came_from[neighbor] = current;
                    g_score[neighbor] = tentative_g;
                    f_score[neighbor] = tentative_g + heuristic(neighbor, goal);
                    open_set.push({f_score[neighbor], neighbor});
                }
            }
        }
        
        return nullopt;
    }
};