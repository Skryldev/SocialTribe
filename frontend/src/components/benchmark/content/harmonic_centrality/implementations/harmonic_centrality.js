class HarmonicCentrality {
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

    bfsDistances(start) {
        const distances = new Map();
        const queue = [];
        
        distances.set(start, 0);
        queue.push(start);
        
        while (queue.length > 0) {
            const node = queue.shift();
            
            for (const neighbor of this.adjacency.get(node)) {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, distances.get(node) + 1);
                    queue.push(neighbor);
                }
            }
        }
        
        return distances;
    }

    harmonicCentrality(node) {
        if (!this.adjacency.has(node)) {
            return 0.0;
        }
        
        const distances = this.bfsDistances(node);
        let sum = 0.0;
        
        for (const [target, dist] of distances) {
            if (target !== node && dist > 0) {
                sum += 1.0 / dist;
            }
        }
        
        return sum;
    }

    allHarmonicCentralities() {
        const result = {};
        
        for (const node of this.nodes) {
            result[node] = this.harmonicCentrality(node);
        }
        
        return result;
    }

    topKCentralNodes(k = 10) {
        const centralities = this.allHarmonicCentralities();
        return Object.entries(centralities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([node, score]) => ({ node: parseInt(node), score }));
    }
}

module.exports = HarmonicCentrality;