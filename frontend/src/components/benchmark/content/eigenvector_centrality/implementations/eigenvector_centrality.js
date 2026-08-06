class EigenvectorCentrality {
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

    eigenvectorCentrality(maxIter = 100, tol = 1e-6) {
        const centrality = {};
        const n = this.nodes.size;

        for (const node of this.nodes) {
            centrality[node] = 1.0 / n;
        }

        for (let iter = 0; iter < maxIter; iter++) {
            const newCentrality = {};
            let norm = 0.0;

            for (const node of this.nodes) {
                let sum = 0.0;
                for (const neighbor of this.adjacency.get(node)) {
                    sum += centrality[neighbor];
                }
                newCentrality[node] = sum;
                norm += sum * sum;
            }

            norm = Math.sqrt(norm);
            let diff = 0.0;

            for (const node of this.nodes) {
                newCentrality[node] /= norm;
                diff += Math.abs(newCentrality[node] - centrality[node]);
            }

            Object.assign(centrality, newCentrality);

            if (diff < tol) {
                break;
            }
        }

        return centrality;
    }

    topKCentralNodes(k = 10, maxIter = 100, tol = 1e-6) {
        const centrality = this.eigenvectorCentrality(maxIter, tol);
        return Object.entries(centrality)
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([node, score]) => ({ node: parseInt(node), score }));
    }

    normalizedEigenvectorCentrality(maxIter = 100, tol = 1e-6) {
        const centrality = this.eigenvectorCentrality(maxIter, tol);
        let maxVal = 0.0;

        for (const score of Object.values(centrality)) {
            if (score > maxVal) {
                maxVal = score;
            }
        }

        if (maxVal > 0) {
            for (const node of this.nodes) {
                centrality[node] /= maxVal;
            }
        }

        return centrality;
    }
}

module.exports = EigenvectorCentrality;