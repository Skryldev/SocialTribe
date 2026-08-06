class GirvanNewman {
    constructor() {
        this.adjacency = new Map();
        this.nodes = new Set();
        this.edgeBetweenness = new Map();
        this.communities = [];
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
        const dist = new Map();
        const predecessors = new Map();
        const queue = [];

        dist.set(start, 0);
        queue.push(start);

        while (queue.length > 0) {
            const node = queue.shift();

            for (const neighbor of this.adjacency.get(node)) {
                if (!dist.has(neighbor)) {
                    dist.set(neighbor, dist.get(node) + 1);
                    queue.push(neighbor);
                }
                if (dist.get(neighbor) === dist.get(node) + 1) {
                    if (!predecessors.has(neighbor)) {
                        predecessors.set(neighbor, []);
                    }
                    predecessors.get(neighbor).push(node);
                }
            }
        }

        return { dist, predecessors };
    }

    computeEdgeBetweenness() {
        this.edgeBetweenness = new Map();

        for (const [u, neighbors] of this.adjacency) {
            for (const v of neighbors) {
                const edge = u < v ? `${u},${v}` : `${v},${u}`;
                if (!this.edgeBetweenness.has(edge)) {
                    this.edgeBetweenness.set(edge, 0.0);
                }
            }
        }

        for (const source of this.nodes) {
            const { dist, predecessors } = this.bfsDistances(source);

            const dependency = new Map();
            for (const node of this.nodes) {
                dependency.set(node, 0.0);
            }

            const sortedNodes = Array.from(dist.keys()).sort((a, b) => dist.get(b) - dist.get(a));

            for (const node of sortedNodes) {
                if (!predecessors.has(node)) continue;

                const preds = predecessors.get(node);
                for (const pred of preds) {
                    const contrib = (1.0 + dependency.get(node)) / preds.length;
                    dependency.set(pred, dependency.get(pred) + contrib);
                }
            }

            for (const node of sortedNodes) {
                if (!predecessors.has(node)) continue;

                const preds = predecessors.get(node);
                for (const pred of preds) {
                    const edge = pred < node ? `${pred},${node}` : `${node},${pred}`;
                    this.edgeBetweenness.set(
                        edge,
                        this.edgeBetweenness.get(edge) + dependency.get(node) / preds.length
                    );
                }
            }
        }

        for (const [edge, value] of this.edgeBetweenness) {
            this.edgeBetweenness.set(edge, value / 2.0);
        }
    }

    removeEdgeWithMaxBetweenness() {
        let maxEdge = null;
        let maxBetweenness = -1.0;

        for (const [edge, betweenness] of this.edgeBetweenness) {
            if (betweenness > maxBetweenness) {
                maxBetweenness = betweenness;
                maxEdge = edge;
            }
        }

        if (maxEdge) {
            const [u, v] = maxEdge.split(',').map(Number);
            this.adjacency.get(u).delete(v);
            this.adjacency.get(v).delete(u);
        }
    }

    findComponents() {
        const components = [];
        const visited = new Set();

        for (const node of this.nodes) {
            if (visited.has(node)) continue;

            const component = [];
            const queue = [node];
            visited.add(node);

            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);

                for (const neighbor of this.adjacency.get(current)) {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }

            if (component.length > 0) {
                components.push(component);
            }
        }

        return components;
    }

    modularity(communities) {
        const communityMap = new Map();
        for (let i = 0; i < communities.length; i++) {
            for (const node of communities[i]) {
                communityMap.set(node, i);
            }
        }

        let m = 0.0;
        for (const [u, neighbors] of this.adjacency) {
            m += neighbors.size;
        }
        m /= 2.0;

        const degrees = new Map();
        for (const node of this.nodes) {
            degrees.set(node, this.adjacency.get(node).size);
        }

        let Q = 0.0;
        for (const [u, neighbors] of this.adjacency) {
            for (const v of neighbors) {
                if (communityMap.get(u) === communityMap.get(v)) {
                    Q += 1.0 - (degrees.get(u) * degrees.get(v)) / (2.0 * m);
                }
            }
        }

        return Q / (2.0 * m);
    }

    detectCommunities(numCommunities = 2) {
        while (true) {
            this.computeEdgeBetweenness();
            this.removeEdgeWithMaxBetweenness();

            const currentComponents = this.findComponents();
            if (currentComponents.length >= numCommunities) {
                this.communities = currentComponents;
                break;
            }

            if (this.adjacency.size === 0) {
                break;
            }
        }

        return this.communities;
    }

    detectCommunitiesByModularity() {
        let bestCommunities = [];
        let bestModularity = -1.0;
        let iterations = 0;

        while (true) {
            this.computeEdgeBetweenness();
            this.removeEdgeWithMaxBetweenness();

            const currentComponents = this.findComponents();
            const currentModularity = this.modularity(currentComponents);

            if (currentModularity > bestModularity) {
                bestModularity = currentModularity;
                bestCommunities = currentComponents;
            }

            if (currentComponents.length === 1) {
                break;
            }

            iterations++;
            if (iterations > 1000) break;
        }

        return bestCommunities;
    }
}

module.exports = GirvanNewman;