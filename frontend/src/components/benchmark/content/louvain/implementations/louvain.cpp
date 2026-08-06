#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <random>
#include <algorithm>

using namespace std;

class Louvain {
private:
    unordered_map<int, unordered_set<int>> adjacency;
    unordered_set<int> nodes;
    unordered_map<int, int> communities;
    map<pair<int, int>, double> weights;
    double m = 0.0;

    double degree(int node) {
        double deg = 0.0;
        for (int neighbor : adjacency[node]) {
            int u = node, v = neighbor;
            if (u > v) swap(u, v);
            deg += weights[{u, v}];
        }
        return deg;
    }

    double weight(int u, int v) {
        if (u > v) swap(u, v);
        return weights[{u, v}];
    }

    double community_degree(int node, int community) {
        double deg = 0.0;
        for (int neighbor : adjacency[node]) {
            if (communities[neighbor] == community) {
                deg += weight(node, neighbor);
            }
        }
        return deg;
    }

    double total_degree(int community) {
        double total = 0.0;
        for (int node : nodes) {
            if (communities[node] == community) {
                total += degree(node);
            }
        }
        return total;
    }

    double modularity_gain(int node, int community) {
        double ki = degree(node);
        double kic = community_degree(node, community);
        double total = total_degree(community);
        return (kic - (total * ki) / (2 * m)) / m;
    }

    void initialize_communities() {
        for (int node : nodes) {
            communities[node] = node;
        }
    }

    bool first_phase() {
        bool changed = false;
        vector<int> node_list(nodes.begin(), nodes.end());
        shuffle(node_list.begin(), node_list.end(), default_random_engine(random_device{}()));
        
        for (int node : node_list) {
            int best_community = communities[node];
            double best_gain = 0.0;
            
            for (int neighbor : adjacency[node]) {
                int community = communities[neighbor];
                if (community == communities[node]) continue;
                double gain = modularity_gain(node, community);
                if (gain > best_gain) {
                    best_gain = gain;
                    best_community = community;
                }
            }
            
            if (best_community != communities[node]) {
                communities[node] = best_community;
                changed = true;
            }
        }
        
        return changed;
    }

    void second_phase() {
        unordered_map<int, unordered_set<int>> new_adjacency;
        unordered_set<int> new_nodes;
        map<pair<int, int>, double> new_weights;
        double new_m = 0.0;
        
        unordered_map<int, int> community_map;
        int next_id = 0;
        for (auto& pair : communities) {
            if (community_map.find(pair.second) == community_map.end()) {
                community_map[pair.second] = next_id++;
            }
        }
        
        for (auto& pair : communities) {
            int new_community = community_map[pair.second];
            if (new_adjacency.find(new_community) == new_adjacency.end()) {
                new_adjacency[new_community] = unordered_set<int>();
            }
            new_nodes.insert(new_community);
        }
        
        for (auto& pair : weights) {
            int u = pair.first.first;
            int v = pair.first.second;
            double w = pair.second;
            
            int cu = community_map[communities[u]];
            int cv = community_map[communities[v]];
            
            if (cu == cv) {
                new_m += w;
                continue;
            }
            
            if (cu > cv) swap(cu, cv);
            new_weights[{cu, cv}] += w;
            new_adjacency[cu].insert(cv);
            new_adjacency[cv].insert(cu);
            new_m += w;
        }
        
        for (int community : new_nodes) {
            if (new_adjacency.find(community) == new_adjacency.end()) {
                new_adjacency[community] = unordered_set<int>();
            }
        }
        
        adjacency = new_adjacency;
        nodes = new_nodes;
        weights = new_weights;
        m = new_m;
        
        unordered_map<int, int> new_communities;
        for (auto& pair : communities) {
            new_communities[pair.first] = community_map[pair.second];
        }
        communities = new_communities;
    }

public:
    void add_edge(int u, int v, double weight = 1.0) {
        adjacency[u].insert(v);
        adjacency[v].insert(u);
        nodes.insert(u);
        nodes.insert(v);
        if (u > v) swap(u, v);
        weights[{u, v}] += weight;
        m += weight;
    }

    void build_from_edges(const vector<pair<int, int>>& edges) {
        for (auto& edge : edges) {
            add_edge(edge.first, edge.second);
        }
    }

    unordered_map<int, int> detect_communities() {
        initialize_communities();
        
        while (true) {
            bool improved = false;
            while (first_phase()) {
                improved = true;
            }
            if (!improved) break;
            second_phase();
        }
        
        return communities;
    }
};