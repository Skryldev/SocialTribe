class CountingSort {
    findMax(arr) {
        let maxVal = arr[0];
        for (const val of arr) {
            if (val > maxVal) maxVal = val;
        }
        return maxVal;
    }

    findMin(arr) {
        let minVal = arr[0];
        for (const val of arr) {
            if (val < minVal) minVal = val;
        }
        return minVal;
    }

    sort(arr) {
        if (!arr || arr.length === 0) return;

        const maxVal = this.findMax(arr);
        const minVal = this.findMin(arr);
        const range = maxVal - minVal + 1;

        const count = new Array(range).fill(0);
        const output = new Array(arr.length);

        for (const val of arr) {
            count[val - minVal]++;
        }

        for (let i = 1; i < count.length; i++) {
            count[i] += count[i - 1];
        }

        for (let i = arr.length - 1; i >= 0; i--) {
            output[count[arr[i] - minVal] - 1] = arr[i];
            count[arr[i] - minVal]--;
        }

        for (let i = 0; i < arr.length; i++) {
            arr[i] = output[i];
        }
    }

    sortStable(arr) {
        this.sort(arr);
    }

    sortDescending(arr) {
        this.sort(arr);
        arr.reverse();
    }
}

module.exports = CountingSort;