#include <vector>
#include <algorithm>

using namespace std;

class SegmentTree {
private:
    vector<int> tree;
    int n;

    void build(const vector<int>& arr, int node, int start, int end) {
        if (start == end) {
            tree[node] = arr[start];
            return;
        }
        int mid = (start + end) / 2;
        build(arr, node * 2, start, mid);
        build(arr, node * 2 + 1, mid + 1, end);
        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    void update(int node, int start, int end, int idx, int val) {
        if (start == end) {
            tree[node] = val;
            return;
        }
        int mid = (start + end) / 2;
        if (idx <= mid) {
            update(node * 2, start, mid, idx, val);
        } else {
            update(node * 2 + 1, mid + 1, end, idx, val);
        }
        tree[node] = tree[node * 2] + tree[node * 2 + 1];
    }

    int query(int node, int start, int end, int l, int r) {
        if (r < start || l > end) {
            return 0;
        }
        if (l <= start && end <= r) {
            return tree[node];
        }
        int mid = (start + end) / 2;
        return query(node * 2, start, mid, l, r) +
               query(node * 2 + 1, mid + 1, end, l, r);
    }

public:
    SegmentTree(const vector<int>& arr) {
        n = arr.size();
        tree.resize(4 * n);
        build(arr, 1, 0, n - 1);
    }

    void update(int idx, int val) {
        update(1, 0, n - 1, idx, val);
    }

    int query(int l, int r) {
        return query(1, 0, n - 1, l, r);
    }
};