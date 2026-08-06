class ResourceAllocation {
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

    resourceAllocationScore(u, v) {
        if (!this.adjacency.has(u) || !this.adjacency.has(v)) {
            return 0.0;
        }

        let score = 0.0;
        for (const node of this.adjacency.get(u)) {
            if (this.adjacency.get(v).has(node)) {
                const degree = this.adjacency.get(node).size;
                if (degree > 0) {
                    score += 1.0 / degree;
                }
            }
        }
        return score;
    }

    scoreAllPairs() {
        const scores = [];
        const nodeList = Array.from(this.nodes);

        for (let i = 0; i < nodeList.length; i++) {
            for (let j = i + 1; j < nodeList.length; j++) {
                const u = nodeList[i];
                const v = nodeList[j];
                const score = this.resourceAllocationScore(u, v);
                if (score > 0) {
                    scores.push({ pair: [u, v], score: score });
                }
            }
        }

        scores.sort((a, b) => b.score - a.score);
        return scores;
    }

    topKPredictions(k = 10) {
        const scores = this.scoreAllPairs();
        return scores.slice(0, k);
    }
}

module.exports = ResourceAllocation;