class AStar {
    constructor() {
        this.graph = new Map();
    }

    addEdge(u, v) {
        if (!this.graph.has(u)) {
            this.graph.set(u, new Set());
        }
        if (!this.graph.has(v)) {
            this.graph.set(v, new Set());
        }
        this.graph.get(u).add(v);
        this.graph.get(v).add(u);
    }

    buildFromEdges(edges) {
        for (const [u, v] of edges) {
            this.addEdge(u, v);
        }
    }

    heuristic(node, goal) {
        return Math.abs(node - goal);
    }

    search(start, goal) {
        if (!this.graph.has(start) || !this.graph.has(goal)) {
            return null;
        }

        const openSet = new Map();
        const pq = [];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        openSet.set(start, true);
        pq.push([start, 0]);
        cameFrom.set(start, start);
        gScore.set(start, 0);
        fScore.set(start, this.heuristic(start, goal));

        while (pq.length > 0) {
            pq.sort((a, b) => a[1] - b[1]);
            const current = pq.shift()[0];
            openSet.delete(current);

            if (current === goal) {
                const path = [];
                let node = current;
                while (node !== start) {
                    path.push(node);
                    node = cameFrom.get(node);
                }
                path.push(start);
                return path.reverse();
            }

            const neighbors = this.graph.get(current) || new Set();
            for (const neighbor of neighbors) {
                const tentativeG = gScore.get(current) + 1;

                if (!gScore.has(neighbor) || tentativeG < gScore.get(neighbor)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeG);
                    fScore.set(neighbor, tentativeG + this.heuristic(neighbor, goal));
                    
                    if (!openSet.has(neighbor)) {
                        openSet.set(neighbor, true);
                        pq.push([neighbor, fScore.get(neighbor)]);
                    }
                }
            }
        }

        return null;
    }
}

module.exports = AStar;