class BFS {
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

    bfs(start) {
        const distances = new Map();
        const queue = [];
        
        distances.set(start, 0);
        queue.push(start);
        
        while (queue.length > 0) {
            const node = queue.shift();
            
            if (!this.adjacency.has(node)) continue;
            
            for (const neighbor of this.adjacency.get(node)) {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, distances.get(node) + 1);
                    queue.push(neighbor);
                }
            }
        }
        
        return distances;
    }

    bfsPath(start, goal) {
        const parent = new Map();
        const queue = [];
        
        parent.set(start, -1);
        queue.push(start);
        
        while (queue.length > 0) {
            const node = queue.shift();
            
            if (node === goal) {
                const path = [];
                let current = node;
                while (current !== -1) {
                    path.push(current);
                    current = parent.get(current);
                }
                return path.reverse();
            }
            
            if (!this.adjacency.has(node)) continue;
            
            for (const neighbor of this.adjacency.get(node)) {
                if (!parent.has(neighbor)) {
                    parent.set(neighbor, node);
                    queue.push(neighbor);
                }
            }
        }
        
        return [];
    }

    bfsOrder(start) {
        const order = [];
        const visited = new Set();
        const queue = [];
        
        visited.add(start);
        queue.push(start);
        
        while (queue.length > 0) {
            const node = queue.shift();
            order.push(node);
            
            if (!this.adjacency.has(node)) continue;
            
            for (const neighbor of this.adjacency.get(node)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }
        
        return order;
    }

    isConnected() {
        if (this.nodes.size === 0) return true;
        
        const start = this.nodes.values().next().value;
        const distances = this.bfs(start);
        return distances.size === this.nodes.size;
    }
}

module.exports = BFS;