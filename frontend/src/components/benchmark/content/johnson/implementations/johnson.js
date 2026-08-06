class Johnson {
    constructor() {
        this.edges = [];
        this.adjacency = new Map();
        this.nodes = new Set();
    }

    addEdge(u, v, weight) {
        this.edges.push({ u, v, weight });
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, new Set());
        }
        this.adjacency.get(u).add(v);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    buildFromEdges(edgeList) {
        for (const [u, v, weight] of edgeList) {
            this.addEdge(u, v, weight);
        }
    }

    bellmanFord(source) {
        const dist = {};
        for (const node of this.nodes) {
            dist[node] = Infinity;
        }
        dist[source] = 0;

        for (let i = 0; i < this.nodes.size - 1; i++) {
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

    dijkstra(source, h) {
        const dist = {};
        for (const node of this.nodes) {
            dist[node] = Infinity;
        }
        dist[source] = 0;

        const pq = [];
        pq.push([source, 0]);

        while (pq.length > 0) {
            pq.sort((a, b) => a[1] - b[1]);
            const [u, d] = pq.shift();

            if (d !== dist[u]) continue;

            if (!this.adjacency.has(u)) continue;

            for (const v of this.adjacency.get(u)) {
                let weight = 0;
                for (const edge of this.edges) {
                    if (edge.u === u && edge.v === v) {
                        weight = edge.weight;
                        break;
                    }
                }
                const newDist = dist[u] + weight + h[u] - h[v];
                if (newDist < dist[v]) {
                    dist[v] = newDist;
                    pq.push([v, dist[v]]);
                }
            }
        }

        const result = {};
        for (const node of this.nodes) {
            result[node] = dist[node] - h[source] + h[node];
        }
        return result;
    }

    allPairsShortestPaths() {
        let maxNode = 0;
        for (const node of this.nodes) {
            if (node > maxNode) maxNode = node;
        }
        const newNode = maxNode + 1;

        for (const node of this.nodes) {
            this.addEdge(newNode, node, 0);
        }

        const h = this.bellmanFord(newNode);
        if (h === null) {
            return null;
        }

        const result = {};
        for (const node of this.nodes) {
            if (node === newNode) continue;
            result[node] = this.dijkstra(node, h);
        }

        return result;
    }
}

module.exports = Johnson;