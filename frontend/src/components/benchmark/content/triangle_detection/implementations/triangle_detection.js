class TriangleDetection {
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

    countTriangles() {
        let count = 0;
        for (const [u, neighbors] of this.adjacencyList) {
            for (const v of neighbors) {
                if (v > u) {
                    for (const w of neighbors) {
                        if (w > v && this.adjacencyList.get(v).has(w)) {
                            count++;
                        }
                    }
                }
            }
        }
        return count;
    }

    findTriangles() {
        const triangles = [];
        for (const [u, neighbors] of this.adjacencyList) {
            for (const v of neighbors) {
                if (v > u) {
                    for (const w of neighbors) {
                        if (w > v && this.adjacencyList.get(v).has(w)) {
                            triangles.push([u, v, w]);
                        }
                    }
                }
            }
        }
        return triangles;
    }

    hasTriangle() {
        for (const [u, neighbors] of this.adjacencyList) {
            for (const v of neighbors) {
                if (v > u) {
                    for (const w of neighbors) {
                        if (w > v && this.adjacencyList.get(v).has(w)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}

module.exports = TriangleDetection;