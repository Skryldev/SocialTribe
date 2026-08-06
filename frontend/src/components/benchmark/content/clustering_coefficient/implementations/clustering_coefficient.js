class ClusteringCoefficient {
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

    localClusteringCoefficient(node) {
        if (!this.adjacency.has(node)) {
            return 0.0;
        }

        const neighbors = this.adjacency.get(node);
        const degree = neighbors.size;

        if (degree < 2) {
            return 0.0;
        }

        let triangles = 0;
        const neighborList = Array.from(neighbors);

        for (let i = 0; i < neighborList.length; i++) {
            for (let j = i + 1; j < neighborList.length; j++) {
                const u = neighborList[i];
                const v = neighborList[j];
                if (this.adjacency.get(u).has(v)) {
                    triangles++;
                }
            }
        }

        const maxPossible = degree * (degree - 1) / 2;
        return triangles / maxPossible;
    }

    allLocalClusteringCoefficients() {
        const result = {};
        for (const node of this.nodes) {
            result[node] = this.localClusteringCoefficient(node);
        }
        return result;
    }

    averageClusteringCoefficient() {
        if (this.nodes.size === 0) {
            return 0.0;
        }

        let total = 0.0;
        for (const node of this.nodes) {
            total += this.localClusteringCoefficient(node);
        }
        return total / this.nodes.size;
    }

    globalClusteringCoefficient() {
        let triangles = 0;
        let triplets = 0;

        for (const node of this.nodes) {
            const degree = this.adjacency.get(node).size;
            if (degree >= 2) {
                triplets += degree * (degree - 1) / 2;
            }

            const neighborList = Array.from(this.adjacency.get(node));
            for (let i = 0; i < neighborList.length; i++) {
                for (let j = i + 1; j < neighborList.length; j++) {
                    const u = neighborList[i];
                    const v = neighborList[j];
                    if (this.adjacency.get(u).has(v)) {
                        triangles++;
                    }
                }
            }
        }

        if (triplets === 0) {
            return 0.0;
        }

        return triangles / triplets;
    }
}

module.exports = ClusteringCoefficient;