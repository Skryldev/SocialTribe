#include <vector>
#include <queue>
#include <unordered_map>
#include <unordered_set>

using namespace std;

class BFS {
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

    unordered_map<int, int> bfs(int start) {
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

    vector<int> bfs_path(int start, int goal) {
        unordered_map<int, int> parent;
        queue<int> q;
        
        parent[start] = -1;
        q.push(start);
        
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            
            if (node == goal) {
                vector<int> path;
                while (node != -1) {
                    path.push_back(node);
                    node = parent[node];
                }
                reverse(path.begin(), path.end());
                return path;
            }
            
            for (int neighbor : adjacency[node]) {
                if (parent.find(neighbor) == parent.end()) {
                    parent[neighbor] = node;
                    q.push(neighbor);
                }
            }
        }
        
        return {};
    }

    vector<int> bfs_order(int start) {
        vector<int> order;
        unordered_set<int> visited;
        queue<int> q;
        
        visited.insert(start);
        q.push(start);
        
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            order.push_back(node);
            
            for (int neighbor : adjacency[node]) {
                if (visited.find(neighbor) == visited.end()) {
                    visited.insert(neighbor);
                    q.push(neighbor);
                }
            }
        }
        
        return order;
    }
};