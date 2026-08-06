#include <vector>
#include <unordered_map>
#include <unordered_set>

using namespace std;

class TriangleDetection {
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
    
    int count_triangles() {
        int count = 0;
        for (const auto& pair : adjacency_list) {
            int u = pair.first;
            const auto& neighbors = pair.second;
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacency_list[v].find(w) != adjacency_list[v].end()) {
                            count++;
                        }
                    }
                }
            }
        }
        return count;
    }
    
    vector<tuple<int, int, int>> find_triangles() {
        vector<tuple<int, int, int>> triangles;
        for (const auto& pair : adjacency_list) {
            int u = pair.first;
            const auto& neighbors = pair.second;
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacency_list[v].find(w) != adjacency_list[v].end()) {
                            triangles.push_back({u, v, w});
                        }
                    }
                }
            }
        }
        return triangles;
    }
    
    bool has_triangle() {
        for (const auto& pair : adjacency_list) {
            int u = pair.first;
            const auto& neighbors = pair.second;
            for (int v : neighbors) {
                if (v > u) {
                    for (int w : neighbors) {
                        if (w > v && adjacency_list[v].find(w) != adjacency_list[v].end()) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
};