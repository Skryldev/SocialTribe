class CommonNeighbors {
    constructor() {
        this.adjacencyList = new Map();
    }

    addEdge(u, v) {
        if (!this.adjacencyList.has(u)) {
            this.adjacencyList.set(u, new Set());
        }
        if (!this.adjacencyList.has(v)) {
            this.adjacencyList.set(v, new Set());
        }
        this.adjacencyList.get(u).add(v);
        this.adjacencyList.get(v).add(u);
    }

    buildFromEdges(edges) {
        for (const [u, v] of edges) {
            this.addEdge(u, v);
        }
    }

    commonNeighbors(u, v) {
        if (!this.adjacencyList.has(u) || !this.adjacencyList.has(v)) {
            return new Set();
        }

        const result = new Set();
        const neighborsU = this.adjacencyList.get(u);
        const neighborsV = this.adjacencyList.get(v);

        for (const node of neighborsU) {
            if (neighborsV.has(node)) {
                result.add(node);
            }
        }
        return result;
    }

    commonNeighborsCount(u, v) {
        return this.commonNeighbors(u, v).size;
    }

    predictLink(u, v, threshold = 1) {
        return this.commonNeighborsCount(u, v) >= threshold;
    }

    scoreAllPairs() {
        const scores = [];
        const nodes = Array.from(this.adjacencyList.keys());

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const u = nodes[i];
                const v = nodes[j];
                const count = this.commonNeighborsCount(u, v);
                if (count > 0) {
                    scores.push({ pair: [u, v], score: count });
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

module.exports = CommonNeighbors;