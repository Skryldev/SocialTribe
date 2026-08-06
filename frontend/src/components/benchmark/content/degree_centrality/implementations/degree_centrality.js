class DegreeCentrality {
    constructor() {
        this.adjacency = new Map();
        this.nodes = new Set();
    }

    addEdge(u, v) {
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, new Set());
        }
        if (!this.adjacency.has(v)) {
            this.adjacency.set(v, new Set());
        }
        this.adjacency.get(u).add(v);
        this.adjacency.get(v).add(u);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    buildFromEdges(edges) {
        for (const [u, v] of edges) {
            this.addEdge(u, v);
        }
    }

    degreeCentrality(node) {
        if (!this.adjacency.has(node)) {
            return 0;
        }
        return this.adjacency.get(node).size;
    }

    allDegreeCentralities() {
        const result = {};
        for (const node of this.nodes) {
            result[node] = this.degreeCentrality(node);
        }
        return result;
    }

    topKCentralNodes(k = 10) {
        const centralities = this.allDegreeCentralities();
        return Object.entries(centralities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([node, score]) => ({ node: parseInt(node), score }));
    }

    normalizedDegreeCentrality(node) {
        if (!this.adjacency.has(node) || this.nodes.size <= 1) {
            return 0.0;
        }
        return this.degreeCentrality(node) / (this.nodes.size - 1);
    }

    allNormalizedDegreeCentralities() {
        const result = {};
        for (const node of this.nodes) {
            result[node] = this.normalizedDegreeCentrality(node);
        }
        return result;
    }
}

module.exports = DegreeCentrality;