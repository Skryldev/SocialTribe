class DFS {
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

    addDirectedEdge(u, v) {
        if (!this.adjacency.has(u)) {
            this.adjacency.set(u, new Set());
        }
        if (!this.adjacency.has(v)) {
            this.adjacency.set(v, new Set());
        }
        this.adjacency.get(u).add(v);
        this.nodes.add(u);
        this.nodes.add(v);
    }

    buildFromEdges(edges, directed = false) {
        for (const [u, v] of edges) {
            if (directed) {
                this.addDirectedEdge(u, v);
            } else {
                this.addEdge(u, v);
            }
        }
    }

    dfsRecursiveUtil(node, visited, order) {
        visited.add(node);
        order.push(node);

        if (!this.adjacency.has(node)) return;

        for (const neighbor of this.adjacency.get(node)) {
            if (!visited.has(neighbor)) {
                this.dfsRecursiveUtil(neighbor, visited, order);
            }
        }
    }

    dfsRecursive(start) {
        const order = [];
        const visited = new Set();
        this.dfsRecursiveUtil(start, visited, order);
        return order;
    }

    dfsIterative(start) {
        const order = [];
        const visited = new Set();
        const stack = [start];

        while (stack.length > 0) {
            const node = stack.pop();

            if (visited.has(node)) continue;

            visited.add(node);
            order.push(node);

            if (!this.adjacency.has(node)) continue;

            for (const neighbor of this.adjacency.get(node)) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        return order;
    }

    dfsPath(start, goal) {
        const parent = new Map();
        const visited = new Set();
        const stack = [start];

        parent.set(start, -1);

        while (stack.length > 0) {
            const node = stack.pop();

            if (visited.has(node)) continue;
            visited.add(node);

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
                if (!visited.has(neighbor)) {
                    parent.set(neighbor, node);
                    stack.push(neighbor);
                }
            }
        }

        return [];
    }

    findComponents() {
        const components = [];
        const visited = new Set();

        for (const node of this.nodes) {
            if (!visited.has(node)) {
                const component = [];
                this.dfsRecursiveUtil(node, visited, component);
                components.push(component);
            }
        }

        return components;
    }

    isConnected() {
        if (this.nodes.size === 0) return true;

        const start = this.nodes.values().next().value;
        const visited = new Set();
        const order = [];
        this.dfsRecursiveUtil(start, visited, order);

        return visited.size === this.nodes.size;
    }

    hasCycle() {
        const visited = new Set();
        const recStack = new Set();

        for (const node of this.nodes) {
            if (!visited.has(node)) {
                if (this.hasCycleUtil(node, visited, recStack, -1)) {
                    return true;
                }
            }
        }
        return false;
    }

    hasCycleUtil(node, visited, recStack, parent) {
        visited.add(node);
        recStack.add(node);

        if (!this.adjacency.has(node)) return false;

        for (const neighbor of this.adjacency.get(node)) {
            if (recStack.has(neighbor) && neighbor !== parent) {
                return true;
            }

            if (!visited.has(neighbor)) {
                if (this.hasCycleUtil(neighbor, visited, recStack, node)) {
                    return true;
                }
            }
        }

        recStack.delete(node);
        return false;
    }
}

module.exports = DFS;