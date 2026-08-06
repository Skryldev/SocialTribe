class BetweennessCentrality {
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

    betweennessCentrality() {
        const centrality = {};
        for (const node of this.adjacencyList.keys()) {
            centrality[node] = 0.0;
        }

        for (const s of this.adjacencyList.keys()) {
            const stack = [];
            const pred = {};
            const dist = {};
            const sigma = {};

            for (const node of this.adjacencyList.keys()) {
                pred[node] = [];
                dist[node] = -1;
                sigma[node] = 0;
            }

            dist[s] = 0;
            sigma[s] = 1;
            const queue = [s];

            while (queue.length > 0) {
                const v = queue.shift();
                stack.push(v);

                for (const w of this.adjacencyList.get(v)) {
                    if (dist[w] < 0) {
                        dist[w] = dist[v] + 1;
                        queue.push(w);
                    }
                    if (dist[w] === dist[v] + 1) {
                        sigma[w] += sigma[v];
                        pred[w].push(v);
                    }
                }
            }

            const delta = {};
            for (const node of this.adjacencyList.keys()) {
                delta[node] = 0.0;
            }

            while (stack.length > 0) {
                const w = stack.pop();

                for (const v of pred[w]) {
                    delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
                }

                if (w !== s) {
                    centrality[w] += delta[w];
                }
            }
        }

        return centrality;
    }

    topKCentralNodes(k = 10) {
        const centrality = this.betweennessCentrality();
        const result = Object.entries(centrality)
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([node, score]) => ({ node: parseInt(node), score }));
        
        return result;
    }
}

module.exports = BetweennessCentrality;