public class FenwickTree {
    private int n;
    private int[] tree;

    public FenwickTree(int size) {
        this.n = size;
        this.tree = new int[size + 1];
    }

    public void build(int[] arr) {
        for (int i = 0; i < n; i++) {
            tree[i + 1] += arr[i];
            int j = (i + 1) + ((i + 1) & -(i + 1));
            if (j <= n) {
                tree[j] += tree[i + 1];
            }
        }
    }

    public void update(int idx, int delta) {
        int i = idx + 1;
        while (i <= n) {
            tree[i] += delta;
            i += i & -i;
        }
    }

    public int query(int idx) {
        int result = 0;
        int i = idx + 1;
        while (i > 0) {
            result += tree[i];
            i -= i & -i;
        }
        return result;
    }

    public int rangeQuery(int left, int right) {
        return query(right) - (left > 0 ? query(left - 1) : 0);
    }
}