class UnionFind {
    constructor(n) {
        this.parent = new Array(n);
        this.rank = new Array(n);
        this.count = n;

        for (let i = 0; i < n; i++) {
            this.parent[i] = i;
            this.rank[i] = 0;
        }
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);

        if (rootX === rootY) {
            return false;
        }

        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }

        this.count--;
        return true;
    }

    connected(x, y) {
        return this.find(x) === this.find(y);
    }

    getCount() {
        return this.count;
    }
}

module.exports = UnionFind;