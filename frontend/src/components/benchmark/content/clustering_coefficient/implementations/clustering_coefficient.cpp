#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class ClusteringCoefficient {
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

    double local_clustering_coefficient(int node) {
        if (adjacency.find(node) == adjacency.end()) {
            return 0.0;
        }

        const auto& neighbors = adjacency[node];
        int degree = neighbors.size();

        if (degree < 2) {
            return 0.0;
        }

        int triangles = 0;
        vector<int> neighbor_list(neighbors.begin(), neighbors.end());

        for (size_t i = 0; i < neighbor_list.size(); i++) {
            for (size_t j = i + 1; j < neighbor_list.size(); j++) {
                int u = neighbor_list[i];
                int v = neighbor_list[j];
                if (adjacency[u].find(v) != adjacency[u].end()) {
                    triangles++;
                }
            }
        }

        int max_possible = degree * (degree - 1) / 2;
        return (double)triangles / max_possible;
    }

    unordered_map<int, double> all_local_clustering_coefficients() {
        unordered_map<int, double> result;
        for (int node : nodes) {
            result[node] = local_clustering_coefficient(node);
        }
        return result;
    }

    double average_clustering_coefficient() {
        if (nodes.empty()) {
            return 0.0;
        }

        double total = 0.0;
        for (int node : nodes) {
            total += local_clustering_coefficient(node);
        }
        return total / nodes.size();
    }

    double global_clustering_coefficient() {
        int triangles = 0;
        int triplets = 0;

        for (int node : nodes) {
            int degree = adjacency[node].size();
            if (degree >= 2) {
                triplets += degree * (degree - 1) / 2;
            }

            vector<int> neighbor_list(adjacency[node].begin(), adjacency[node].end());
            for (size_t i = 0; i < neighbor_list.size(); i++) {
                for (size_t j = i + 1; j < neighbor_list.size(); j++) {
                    int u = neighbor_list[i];
                    int v = neighbor_list[j];
                    if (adjacency[u].find(v) != adjacency[u].end()) {
                        triangles++;
                    }
                }
            }
        }

        if (triplets == 0) {
            return 0.0;
        }

        return (double)triangles / triplets;
    }
};