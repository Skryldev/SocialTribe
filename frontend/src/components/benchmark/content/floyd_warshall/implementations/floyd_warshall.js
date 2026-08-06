class FloydWarshall {
    constructor() {
        this.nodes = new Map();
        this.dist = new Map();
        this.nextNode = new Map();
    }

    addEdge(u, v, weight) {
        if (!this.nodes.has(u)) this.nodes.set(u, new Set());
        if (!this.nodes.has(v)) this.nodes.set(v, new Set());
        this.nodes.get(u).add(v);
        this.nodes.get(v).add(u);

        if (!this.dist.has(u)) this.dist.set(u, new Map());
        if (!this.dist.has(v)) this.dist.set(v, new Map());
        this.dist.get(u).set(v, weight);
        this.dist.get(v).set(u, weight);

        if (!this.nextNode.has(u)) this.nextNode.set(u, new Map());
        if (!this.nextNode.has(v)) this.nextNode.set(v, new Map());
        this.nextNode.get(u).set(v, v);
        this.nextNode.get(v).set(u, u);
    }

    addDirectedEdge(u, v, weight) {
        if (!this.nodes.has(u)) this.nodes.set(u, new Set());
        if (!this.nodes.has(v)) this.nodes.set(v, new Set());
        this.nodes.get(u).add(v);

        if (!this.dist.has(u)) this.dist.set(u, new Map());
        if (!this.dist.has(v)) this.dist.set(v, new Map());
        this.dist.get(u).set(v, weight);

        if (!this.nextNode.has(u)) this.nextNode.set(u, new Map());
        if (!this.nextNode.has(v)) this.nextNode.set(v, new Map());
        this.nextNode.get(u).set(v, v);
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

    getAllNodes() {
        return Array.from(this.nodes.keys());
    }

    initialize() {
        const allNodes = this.getAllNodes();

        for (const u of allNodes) {
            if (!this.dist.has(u)) this.dist.set(u, new Map());
            if (!this.nextNode.has(u)) this.nextNode.set(u, new Map());

            for (const v of allNodes) {
                if (u === v) {
                    this.dist.get(u).set(v, 0);
                } else if (!this.dist.get(u).has(v)) {
                    this.dist.get(u).set(v, Infinity);
                }
            }
        }
    }

    allPairsShortestPaths() {
        this.initialize();
        const allNodes = this.getAllNodes();

        for (const k of allNodes) {
            for (const i of allNodes) {
                for (const j of allNodes) {
                    if (this.dist.get(i).get(k) !== Infinity &&
                        this.dist.get(k).get(j) !== Infinity &&
                        this.dist.get(i).get(k) + this.dist.get(k).get(j) < this.dist.get(i).get(j)) {
                        this.dist.get(i).set(j, this.dist.get(i).get(k) + this.dist.get(k).get(j));
                        this.nextNode.get(i).set(j, this.nextNode.get(i).get(k));
                    }
                }
            }
        }
    }

    shortestPath(u, v) {
        if (!this.dist.has(u) || !this.dist.get(u).has(v)) {
            return Infinity;
        }
        return this.dist.get(u).get(v);
    }

    getPath(u, v) {
        if (!this.nextNode.has(u) || !this.nextNode.get(u).has(v)) {
            return [];
        }

        const path = [u];

        while (u !== v) {
            u = this.nextNode.get(u).get(v);
            path.push(u);
        }

        return path;
    }

    getAllDistances() {
        return this.dist;
    }

    hasNegativeCycle() {
        const allNodes = this.getAllNodes();

        for (const i of allNodes) {
            if (this.dist.get(i).get(i) < 0) {
                return true;
            }
        }
        return false;
    }
}

module.exports = FloydWarshall;