class SegmentTree {
    constructor(arr) {
        this.n = arr.length;
        this.tree = new Array(4 * this.n);
        this.build(arr, 1, 0, this.n - 1);
    }

    build(arr, node, start, end) {
        if (start === end) {
            this.tree[node] = arr[start];
            return;
        }

        const mid = Math.floor((start + end) / 2);
        this.build(arr, node * 2, start, mid);
        this.build(arr, node * 2 + 1, mid + 1, end);
        this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
    }

    update(idx, val) {
        this._update(1, 0, this.n - 1, idx, val);
    }

    _update(node, start, end, idx, val) {
        if (start === end) {
            this.tree[node] = val;
            return;
        }

        const mid = Math.floor((start + end) / 2);
        if (idx <= mid) {
            this._update(node * 2, start, mid, idx, val);
        } else {
            this._update(node * 2 + 1, mid + 1, end, idx, val);
        }

        this.tree[node] = this.tree[node * 2] + this.tree[node * 2 + 1];
    }

    query(l, r) {
        return this._query(1, 0, this.n - 1, l, r);
    }

    _query(node, start, end, l, r) {
        if (r < start || l > end) {
            return 0;
        }

        if (l <= start && end <= r) {
            return this.tree[node];
        }

        const mid = Math.floor((start + end) / 2);
        return this._query(node * 2, start, mid, l, r) +
               this._query(node * 2 + 1, mid + 1, end, l, r);
    }
}

module.exports = SegmentTree;