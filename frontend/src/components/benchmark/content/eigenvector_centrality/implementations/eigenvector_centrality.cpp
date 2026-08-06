#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cmath>

using namespace std;

class EigenvectorCentrality {
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

    unordered_map<int, double> eigenvector_centrality(int max_iter = 100, double tol = 1e-6) {
        unordered_map<int, double> centrality;
        int n = nodes.size();

        for (int node : nodes) {
            centrality[node] = 1.0 / n;
        }

        for (int iter = 0; iter < max_iter; iter++) {
            unordered_map<int, double> new_centrality;
            double norm = 0.0;

            for (int node : nodes) {
                double sum = 0.0;
                for (int neighbor : adjacency[node]) {
                    sum += centrality[neighbor];
                }
                new_centrality[node] = sum;
                norm += sum * sum;
            }

            norm = sqrt(norm);
            double diff = 0.0;

            for (int node : nodes) {
                new_centrality[node] /= norm;
                diff += abs(new_centrality[node] - centrality[node]);
            }

            centrality = new_centrality;

            if (diff < tol) {
                break;
            }
        }

        return centrality;
    }

    vector<pair<int, double>> top_k_central_nodes(int k = 10, int max_iter = 100, double tol = 1e-6) {
        auto centrality = eigenvector_centrality(max_iter, tol);
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

    unordered_map<int, double> normalized_eigenvector_centrality(int max_iter = 100, double tol = 1e-6) {
        auto centrality = eigenvector_centrality(max_iter, tol);
        double max_val = 0.0;

        for (const auto& pair : centrality) {
            if (pair.second > max_val) {
                max_val = pair.second;
            }
        }

        if (max_val > 0) {
            for (auto& pair : centrality) {
                pair.second /= max_val;
            }
        }

        return centrality;
    }
};