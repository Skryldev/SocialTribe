class KCoreDecomposition {
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

    kCoreDecomposition() {
        const core = new Map();
        const degree = new Map();

        for (const node of this.nodes) {
            degree.set(node, this.adjacency.get(node).size);
        }

        const buckets = new Array(this.nodes.size + 1);
        for (let i = 0; i < buckets.length; i++) {
            buckets[i] = [];
        }

        let maxDegree = 0;
        for (const node of this.nodes) {
            buckets[degree.get(node)].push(node);
            maxDegree = Math.max(maxDegree, degree.get(node));
        }

        const removed = new Set();
        let k = 0;

        for (let i = 0; i <= maxDegree; i++) {
            for (const node of buckets[i]) {
                if (removed.has(node)) continue;

                k = Math.max(k, i);
                core.set(node, k);
                removed.add(node);

                for (const neighbor of this.adjacency.get(node)) {
                    if (!removed.has(neighbor)) {
                        degree.set(neighbor, degree.get(neighbor) - 1);
                        if (degree.get(neighbor) <= i) {
                            buckets[degree.get(neighbor)].push(neighbor);
                        }
                    }
                }
            }
        }

        for (const node of this.nodes) {
            if (!core.has(node)) {
                core.set(node, 0);
            }
        }

        return core;
    }

    getKCore(k) {
        const core = this.kCoreDecomposition();
        const result = [];

        for (const node of this.nodes) {
            if (core.get(node) >= k) {
                result.push(node);
            }
        }

        return result;
    }
}

module.exports = KCoreDecomposition;