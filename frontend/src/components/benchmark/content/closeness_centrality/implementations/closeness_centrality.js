class ClosenessCentrality {
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

    bfsDistances(start) {
        const distances = new Map();
        const queue = [];
        
        distances.set(start, 0);
        queue.push(start);
        
        while (queue.length > 0) {
            const node = queue.shift();
            const neighbors = this.adjacencyList.get(node) || new Set();
            
            for (const neighbor of neighbors) {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, distances.get(node) + 1);
                    queue.push(neighbor);
                }
            }
        }
        
        return distances;
    }

    closenessCentrality(node) {
        if (!this.adjacencyList.has(node)) {
            return 0.0;
        }
        
        const distances = this.bfsDistances(node);
        const reachableNodes = distances.size - 1;
        
        if (reachableNodes === 0) {
            return 0.0;
        }
        
        let totalDistance = 0;
        for (const dist of distances.values()) {
            totalDistance += dist;
        }
        
        return reachableNodes / totalDistance;
    }

    allClosenessCentralities() {
        const result = [];
        
        for (const node of this.adjacencyList.keys()) {
            result.push({ node, score: this.closenessCentrality(node) });
        }
        
        result.sort((a, b) => b.score - a.score);
        return result;
    }

    topKCentralNodes(k = 10) {
        const centralities = this.allClosenessCentralities();
        return centralities.slice(0, k);
    }

    normalizedClosenessCentrality(node) {
        if (!this.adjacencyList.has(node)) {
            return 0.0;
        }
        
        const distances = this.bfsDistances(node);
        const reachableNodes = distances.size - 1;
        const totalNodes = this.adjacencyList.size;
        
        if (reachableNodes === 0 || totalNodes <= 1) {
            return 0.0;
        }
        
        let totalDistance = 0;
        for (const dist of distances.values()) {
            totalDistance += dist;
        }
        
        return (reachableNodes / totalDistance) * ((totalNodes - 1) / reachableNodes);
    }
}

module.exports = ClosenessCentrality;