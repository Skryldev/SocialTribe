class JaccardSimilarity {
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

    jaccardSimilarity(u, v) {
        if (!this.adjacency.has(u) || !this.adjacency.has(v)) {
            return 0.0;
        }

        const neighborsU = this.adjacency.get(u);
        const neighborsV = this.adjacency.get(v);

        let intersection = 0;
        for (const node of neighborsU) {
            if (neighborsV.has(node)) {
                intersection++;
            }
        }

        const unionSize = neighborsU.size + neighborsV.size - intersection;
        if (unionSize === 0) {
            return 0.0;
        }

        return intersection / unionSize;
    }

    scoreAllPairs() {
        const scores = [];
        const nodeList = Array.from(this.nodes);

        for (let i = 0; i < nodeList.length; i++) {
            for (let j = i + 1; j < nodeList.length; j++) {
                const u = nodeList[i];
                const v = nodeList[j];
                const score = this.jaccardSimilarity(u, v);
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

module.exports = JaccardSimilarity;