class Dijkstra {
    constructor() {
        this.adjacency = new Map();
        this.nodes = new Set();
    }

    addEdge(u, v, weight) {
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, []);
        }
        if (!this.adjacency.has(v)) {
            this.adjacency.set(v, []);
        }
        this.adjacency.get(u).push([v, weight]);
        this.adjacency.get(v).push([u, weight]);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    addDirectedEdge(u, v, weight) {
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, []);
        }
        if (!this.adjacency.has(v)) {
            this.adjacency.set(v, []);
        }
        this.adjacency.get(u).push([v, weight]);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    buildFromEdges(edges, directed = false) {
        for (const [u, v, weight] of edges) {
            if (directed) {
                this.addDirectedEdge(u, v, weight);
            } else {
                this.addEdge(u, v, weight);
            }
        }
    }

    shortestPath(source) {
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

            for (const [v, w] of this.adjacency.get(u)) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.push([v, dist[v]]);
                }
            }
        }

        return dist;
    }

    shortestPathWithPath(source, target) {
        const dist = {};
        const parent = {};

        for (const node of this.nodes) {
            dist[node] = Infinity;
        }
        dist[source] = 0;
        parent[source] = -1;

        const pq = [];
        pq.push([source, 0]);

        while (pq.length > 0) {
            pq.sort((a, b) => a[1] - b[1]);
            const [u, d] = pq.shift();

            if (d !== dist[u]) continue;

            if (u === target) {
                const path = [];
                let current = u;
                while (current !== -1) {
                    path.push(current);
                    current = parent[current];
                }
                return path.reverse();
            }

            if (!this.adjacency.has(u)) continue;

            for (const [v, w] of this.adjacency.get(u)) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.push([v, dist[v]]);
                }
            }
        }

        return [];
    }

    allShortestPaths(source) {
        const paths = {};
        const dist = {};

        for (const node of this.nodes) {
            dist[node] = Infinity;
        }
        dist[source] = 0;
        paths[source] = [source];

        const pq = [];
        pq.push([source, 0]);

        while (pq.length > 0) {
            pq.sort((a, b) => a[1] - b[1]);
            const [u, d] = pq.shift();

            if (d !== dist[u]) continue;

            if (!this.adjacency.has(u)) continue;

            for (const [v, w] of this.adjacency.get(u)) {
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    paths[v] = [...paths[u], v];
                    pq.push([v, dist[v]]);
                }
            }
        }

        return paths;
    }
}

module.exports = Dijkstra;