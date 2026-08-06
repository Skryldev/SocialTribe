class QuickSort {
    partition(arr, low, high) {
        const pivot = arr[high];
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        return i + 1;
    }

    partitionRandom(arr, low, high) {
        const randomIdx = Math.floor(Math.random() * (high - low + 1)) + low;
        [arr[randomIdx], arr[high]] = [arr[high], arr[randomIdx]];
        return this.partition(arr, low, high);
    }

    quickSortRecursive(arr, low, high) {
        if (low < high) {
            const pi = this.partition(arr, low, high);
            this.quickSortRecursive(arr, low, pi - 1);
            this.quickSortRecursive(arr, pi + 1, high);
        }
    }

    quickSortRandomRecursive(arr, low, high) {
        if (low < high) {
            const pi = this.partitionRandom(arr, low, high);
            this.quickSortRandomRecursive(arr, low, pi - 1);
            this.quickSortRandomRecursive(arr, pi + 1, high);
        }
    }

    sort(arr) {
        this.quickSortRecursive(arr, 0, arr.length - 1);
    }

    sortRandom(arr) {
        this.quickSortRandomRecursive(arr, 0, arr.length - 1);
    }

    sortIterative(arr) {
        const stack = [[0, arr.length - 1]];

        while (stack.length > 0) {
            const [low, high] = stack.pop();

            if (low < high) {
                const pi = this.partition(arr, low, high);
                stack.push([low, pi - 1]);
                stack.push([pi + 1, high]);
            }
        }
    }

    threeWayPartition(arr, low, high) {
        if (low >= high) return;

        let lt = low, gt = high;
        const pivot = arr[low];
        let i = low;

        while (i <= gt) {
            if (arr[i] < pivot) {
                [arr[lt], arr[i]] = [arr[i], arr[lt]];
                lt++;
                i++;
            } else if (arr[i] > pivot) {
                [arr[i], arr[gt]] = [arr[gt], arr[i]];
                gt--;
            } else {
                i++;
            }
        }

        this.threeWayPartition(arr, low, lt - 1);
        this.threeWayPartition(arr, gt + 1, high);
    }

    sortThreeWay(arr) {
        this.threeWayPartition(arr, 0, arr.length - 1);
    }
}

module.exports = QuickSort;