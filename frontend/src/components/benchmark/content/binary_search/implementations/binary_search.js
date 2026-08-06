class BinarySearch {
    search(arr, target) {
        let left = 0, right = arr.length - 1;

        while (left <= right) {
            const mid = left + Math.floor((right - left) / 2);

            if (arr[mid] === target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }

    searchRecursive(arr, target, left, right) {
        if (left > right) {
            return -1;
        }

        const mid = left + Math.floor((right - left) / 2);

        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            return this.searchRecursive(arr, target, mid + 1, right);
        } else {
            return this.searchRecursive(arr, target, left, mid - 1);
        }
    }

    searchFirstOccurrence(arr, target) {
        let left = 0, right = arr.length - 1;
        let result = -1;

        while (left <= right) {
            const mid = left + Math.floor((right - left) / 2);

            if (arr[mid] === target) {
                result = mid;
                right = mid - 1;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    searchLastOccurrence(arr, target) {
        let left = 0, right = arr.length - 1;
        let result = -1;

        while (left <= right) {
            const mid = left + Math.floor((right - left) / 2);

            if (arr[mid] === target) {
                result = mid;
                left = mid + 1;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    searchInsert(arr, target) {
        let left = 0, right = arr.length - 1;

        while (left <= right) {
            const mid = left + Math.floor((right - left) / 2);

            if (arr[mid] === target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return left;
    }
}

module.exports = BinarySearch;