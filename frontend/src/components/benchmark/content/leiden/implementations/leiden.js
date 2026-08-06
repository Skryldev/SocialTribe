class Leiden {
    constructor() {
        this.adjacency = new Map();
        this.nodes = new Set();
        this.communities = new Map();
        this.weights = new Map();
        this.m = 0.0;
    }

    addEdge(u, v, weight = 1.0) {
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

        const key = u < v ? `${u},${v}` : `${v},${u}`;
        this.weights.set(key, (this.weights.get(key) || 0) + weight);
        this.m += weight;
    }

    buildFromEdges(edges) {
        for (const [u, v] of edges) {
            this.addEdge(u, v);
        }
    }

    degree(node) {
        let deg = 0.0;
        for (const neighbor of this.adjacency.get(node)) {
            deg += this.weight(node, neighbor);
        }
        return deg;
    }

    weight(u, v) {
        const key = u < v ? `${u},${v}` : `${v},${u}`;
        return this.weights.get(key) || 0;
    }

    communityDegree(node, community) {
        let deg = 0.0;
        for (const neighbor of this.adjacency.get(node)) {
            if (this.communities.get(neighbor) === community) {
                deg += this.weight(node, neighbor);
            }
        }
        return deg;
    }

    totalDegree(community) {
        let total = 0.0;
        for (const node of this.nodes) {
            if (this.communities.get(node) === community) {
                total += this.degree(node);
            }
        }
        return total;
    }

    modularityGain(node, community) {
        const ki = this.degree(node);
        const kic = this.communityDegree(node, community);
        const total = this.totalDegree(community);
        return (kic - (total * ki) / (2 * this.m)) / this.m;
    }

    initializeCommunities() {
        for (const node of this.nodes) {
            this.communities.set(node, node);
        }
    }

    refinePartition() {
        let changed = false;
        const nodeList = Array.from(this.nodes);
        this.shuffle(nodeList);

        for (const node of nodeList) {
            const currentCommunity = this.communities.get(node);
            let bestCommunity = currentCommunity;
            let bestGain = 0.0;

            const communitiesSeen = new Set();
            for (const neighbor of this.adjacency.get(node)) {
                const community = this.communities.get(neighbor);
                if (communitiesSeen.has(community)) continue;
                communitiesSeen.add(community);

                if (community === currentCommunity) continue;

                const gain = this.modularityGain(node, community);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity !== currentCommunity) {
                this.communities.set(node, bestCommunity);
                changed = true;
            }
        }

        return changed;
    }

    aggregateNetwork() {
        const newAdjacency = new Map();
        const newNodes = new Set();
        const newWeights = new Map();
        let newM = 0.0;

        const communityMap = new Map();
        let nextId = 0;
        const communitySet = new Set(this.communities.values());
        for (const community of communitySet) {
            communityMap.set(community, nextId++);
        }

        for (const [node, community] of this.communities) {
            const newCommunity = communityMap.get(community);
            if (!newAdjacency.has(newCommunity)) {
                newAdjacency.set(newCommunity, new Set());
            }
            newNodes.add(newCommunity);
        }

        for (const [key, weight] of this.weights) {
            const [u, v] = key.split(',').map(Number);
            const cu = communityMap.get(this.communities.get(u));
            const cv = communityMap.get(this.communities.get(v));

            if (cu === cv) {
                newM += weight;
                continue;
            }

            const newKey = cu < cv ? `${cu},${cv}` : `${cv},${cu}`;
            newWeights.set(newKey, (newWeights.get(newKey) || 0) + weight);
            
            if (!newAdjacency.has(cu)) newAdjacency.set(cu, new Set());
            if (!newAdjacency.has(cv)) newAdjacency.set(cv, new Set());
            
            newAdjacency.get(cu).add(cv);
            newAdjacency.get(cv).add(cu);
            newM += weight;
        }

        for (const community of newNodes) {
            if (!newAdjacency.has(community)) {
                newAdjacency.set(community, new Set());
            }
        }

        this.adjacency = newAdjacency;
        this.nodes = newNodes;
        this.weights = newWeights;
        this.m = newM;

        const newCommunities = new Map();
        for (const [node, community] of this.communities) {
            newCommunities.set(node, communityMap.get(community));
        }
        this.communities = newCommunities;
    }

    fastLocalMove() {
        let changed = false;
        const nodeList = Array.from(this.nodes);
        this.shuffle(nodeList);

        for (const node of nodeList) {
            let bestCommunity = this.communities.get(node);
            let bestGain = 0.0;

            for (const neighbor of this.adjacency.get(node)) {
                const community = this.communities.get(neighbor);
                if (community === this.communities.get(node)) continue;
                const gain = this.modularityGain(node, community);
                if (gain > bestGain) {
                    bestGain = gain;
                    bestCommunity = community;
                }
            }

            if (bestCommunity !== this.communities.get(node)) {
                this.communities.set(node, bestCommunity);
                changed = true;
            }
        }

        return changed;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    detectCommunities() {
        this.initializeCommunities();

        while (true) {
            let improved = false;

            while (this.refinePartition()) {
                improved = true;
            }

            if (!improved) break;

            while (this.fastLocalMove()) {
                improved = true;
            }

            if (!improved) break;

            this.aggregateNetwork();
        }

        return this.communities;
    }
}

module.exports = Leiden;