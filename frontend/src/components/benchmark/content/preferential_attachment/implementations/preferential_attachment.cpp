#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>

using namespace std;

class PreferentialAttachment {
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

    double preferential_attachment_score(int u, int v) {
        if (adjacency.find(u) == adjacency.end() || adjacency.find(v) == adjacency.end()) {
            return 0.0;
        }
        return (double)adjacency[u].size() * adjacency[v].size();
    }

    vector<pair<pair<int, int>, double>> score_all_pairs() {
        vector<pair<pair<int, int>, double>> scores;
        vector<int> node_list(nodes.begin(), nodes.end());

        for (size_t i = 0; i < node_list.size(); i++) {
            for (size_t j = i + 1; j < node_list.size(); j++) {
                int u = node_list[i];
                int v = node_list[j];
                double score = preferential_attachment_score(u, v);
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