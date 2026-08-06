class FenwickTree {
    constructor(size) {
        this.n = size;
        this.tree = new Array(size + 1).fill(0);
    }

    build(arr) {
        for (let i = 0; i < this.n; i++) {
            this.tree[i + 1] += arr[i];
            const j = (i + 1) + ((i + 1) & -(i + 1));
            if (j <= this.n) {
                this.tree[j] += this.tree[i + 1];
            }
        }
    }

    update(idx, delta) {
        let i = idx + 1;
        while (i <= this.n) {
            this.tree[i] += delta;
            i += i & -i;
        }
    }

    query(idx) {
        let result = 0;
        let i = idx + 1;
        while (i > 0) {
            result += this.tree[i];
            i -= i & -i;
        }
        return result;
    }

    rangeQuery(left, right) {
        return this.query(right) - (left > 0 ? this.query(left - 1) : 0);
    }
}

module.exports = FenwickTree;