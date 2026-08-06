#include <vector>
#include <stack>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class DFS {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;

    void dfs_recursive(int node, unordered_set<int>& visited, vector<int>& order) {
        visited.insert(node);
        order.push_back(node);
        
        for (int neighbor : adjacency[node]) {
            if (visited.find(neighbor) == visited.end()) {
                dfs_recursive(neighbor, visited, order);
            }
        }
    }

public:
    void add_edge(int u, int v) {
        adjacency[u].insert(v);
        adjacency[v].insert(u);
        nodes.insert(u);
        nodes.insert(v);
    }

    void add_directed_edge(int u, int v) {
        adjacency[u].insert(v);
        nodes.insert(u);
        nodes.insert(v);
    }

    void build_from_edges(const vector<pair<int, int>>& edges, bool directed = false) {
        for (const auto& edge : edges) {
            if (directed) {
                add_directed_edge(edge.first, edge.second);
            } else {
                add_edge(edge.first, edge.second);
            }
        }
    }

    vector<int> dfs_recursive(int start) {
        vector<int> order;
        unordered_set<int> visited;
        dfs_recursive(start, visited, order);
        return order;
    }

    vector<int> dfs_iterative(int start) {
        vector<int> order;
        unordered_set<int> visited;
        stack<int> st;
        
        st.push(start);
        
        while (!st.empty()) {
            int node = st.top();
            st.pop();
            
            if (visited.find(node) != visited.end()) continue;
            
            visited.insert(node);
            order.push_back(node);
            
            for (int neighbor : adjacency[node]) {
                if (visited.find(neighbor) == visited.end()) {
                    st.push(neighbor);
                }
            }
        }
        
        return order;
    }

    vector<int> dfs_path(int start, int goal) {
        unordered_map<int, int> parent;
        unordered_set<int> visited;
        stack<int> st;
        
        parent[start] = -1;
        st.push(start);
        
        while (!st.empty()) {
            int node = st.top();
            st.pop();
            
            if (visited.find(node) != visited.end()) continue;
            visited.insert(node);
            
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
                if (visited.find(neighbor) == visited.end()) {
                    parent[neighbor] = node;
                    st.push(neighbor);
                }
            }
        }
        
        return {};
    }

    vector<vector<int>> find_components() {
        vector<vector<int>> components;
        unordered_set<int> visited;
        
        for (int node : nodes) {
            if (visited.find(node) == visited.end()) {
                vector<int> component;
                dfs_recursive(node, visited, component);
                components.push_back(component);
            }
        }
        
        return components;
    }

    bool is_connected() {
        if (nodes.empty()) return true;
        
        int start = *nodes.begin();
        unordered_set<int> visited;
        vector<int> order;
        dfs_recursive(start, visited, order);
        
        return visited.size() == nodes.size();
    }

    bool has_cycle() {
        unordered_set<int> visited;
        unordered_set<int> rec_stack;
        
        for (int node : nodes) {
            if (visited.find(node) == visited.end()) {
                if (has_cycle_util(node, visited, rec_stack, -1)) {
                    return true;
                }
            }
        }
        return false;
    }

    bool has_cycle_util(int node, unordered_set<int>& visited, 
                        unordered_set<int>& rec_stack, int parent) {
        visited.insert(node);
        rec_stack.insert(node);
        
        for (int neighbor : adjacency[node]) {
            if (rec_stack.find(neighbor) != rec_stack.end() && neighbor != parent) {
                return true;
            }
            
            if (visited.find(neighbor) == visited.end()) {
                if (has_cycle_util(neighbor, visited, rec_stack, node)) {
                    return true;
                }
            }
        }
        
        rec_stack.erase(node);
        return false;
    }
};