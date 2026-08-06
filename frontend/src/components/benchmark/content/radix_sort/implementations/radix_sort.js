class RadixSort {
    countingSort(arr, exp) {
        const n = arr.length;
        const output = new Array(n);
        const count = new Array(10).fill(0);

        for (let i = 0; i < n; i++) {
            const index = Math.floor(arr[i] / exp) % 10;
            count[index]++;
        }

        for (let i = 1; i < 10; i++) {
            count[i] += count[i - 1];
        }

        for (let i = n - 1; i >= 0; i--) {
            const index = Math.floor(arr[i] / exp) % 10;
            output[count[index] - 1] = arr[i];
            count[index]--;
        }

        for (let i = 0; i < n; i++) {
            arr[i] = output[i];
        }
    }

    sort(arr) {
        if (!arr || arr.length === 0) return;

        const maxVal = Math.max(...arr);
        let exp = 1;

        while (Math.floor(maxVal / exp) > 0) {
            this.countingSort(arr, exp);
            exp *= 10;
        }
    }

    sortNegative(arr) {
        if (!arr || arr.length === 0) return;

        const negatives = [];
        const positives = [];

        for (const x of arr) {
            if (x < 0) negatives.push(-x);
            else positives.push(x);
        }

        this.sort(negatives);
        this.sort(positives);

        let index = 0;
        for (let i = negatives.length - 1; i >= 0; i--) {
            arr[index++] = -negatives[i];
        }
        for (let i = 0; i < positives.length; i++) {
            arr[index++] = positives[i];
        }
    }
}

module.exports = RadixSort;