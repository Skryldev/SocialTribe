class BellmanFord {
    constructor() {
        this.edges = [];
        this.vertices = new Set();
    }

    addEdge(u, v, weight) {
        this.edges.push({ u, v, weight });
        this.vertices.add(u);
        this.vertices.add(v);
    }

    buildFromEdges(edgeList) {
        for (const [u, v, weight] of edgeList) {
            this.addEdge(u, v, weight);
        }
    }

    shortestPath(source) {
        if (!this.vertices.has(source)) {
            return null;
        }

        const dist = {};
        for (const v of this.vertices) {
            dist[v] = Infinity;
        }
        dist[source] = 0;

        for (let i = 0; i < this.vertices.size - 1; i++) {
            let updated = false;
            for (const edge of this.edges) {
                if (dist[edge.u] !== Infinity && dist[edge.u] + edge.weight < dist[edge.v]) {
                    dist[edge.v] = dist[edge.u] + edge.weight;
                    updated = true;
                }
            }
            if (!updated) break;
        }

        for (const edge of this.edges) {
            if (dist[edge.u] !== Infinity && dist[edge.u] + edge.weight < dist[edge.v]) {
                return null;
            }
        }

        return dist;
    }

    hasNegativeCycle() {
        const start = this.vertices.values().next().value;
        return this.shortestPath(start) === null;
    }
}

module.exports = BellmanFord;