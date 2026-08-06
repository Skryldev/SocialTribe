class PageRank {
    constructor() {
        this.adjacency = new Map();
        this.nodes = new Set();
    }

    addEdge(u, v) {
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, new Set());
        }
        this.adjacency.get(u).add(v);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    buildFromEdges(edges) {
        for (const [u, v] of edges) {
            this.addEdge(u, v);
        }
    }

    pagerank(damping = 0.85, maxIter = 100, tol = 1e-6) {
        const pr = {};
        const n = this.nodes.size;

        if (n === 0) return pr;

        for (const node of this.nodes) {
            pr[node] = 1.0 / n;
        }

        for (let iter = 0; iter < maxIter; iter++) {
            const newPr = {};
            let diff = 0.0;

            for (const node of this.nodes) {
                let rank = (1 - damping) / n;

                for (const neighbor of this.nodes) {
                    if (this.adjacency.has(neighbor) && this.adjacency.get(neighbor).has(node)) {
                        const outDegree = this.adjacency.get(neighbor).size;
                        if (outDegree > 0) {
                            rank += damping * (pr[neighbor] / outDegree);
                        }
                    }
                }

                newPr[node] = rank;
                diff += Math.abs(newPr[node] - pr[node]);
            }

            Object.assign(pr, newPr);
            if (diff < tol) break;
        }

        return pr;
    }

    topKNodes(k = 10, damping = 0.85) {
        const pr = this.pagerank(damping);
        return Object.entries(pr)
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([node, score]) => ({ node: parseInt(node), score }));
    }
}

module.exports = PageRank;