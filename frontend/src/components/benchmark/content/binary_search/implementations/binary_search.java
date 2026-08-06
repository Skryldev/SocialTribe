import java.util.List;

public class BinarySearch {

    public Integer search(List<Integer> arr, int target) {
        int left = 0, right = arr.size() - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr.get(mid) == target) {
                return mid;
            } else if (arr.get(mid) < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return null;
    }

    public Integer searchRecursive(List<Integer> arr, int target, int left, int right) {
        if (left > right) {
            return null;
        }

        int mid = left + (right - left) / 2;

        if (arr.get(mid) == target) {
            return mid;
        } else if (arr.get(mid) < target) {
            return searchRecursive(arr, target, mid + 1, right);
        } else {
            return searchRecursive(arr, target, left, mid - 1);
        }
    }

    public Integer searchFirstOccurrence(List<Integer> arr, int target) {
        int left = 0, right = arr.size() - 1;
        Integer result = null;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr.get(mid) == target) {
                result = mid;
                right = mid - 1;
            } else if (arr.get(mid) < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    public Integer searchLastOccurrence(List<Integer> arr, int target) {
        int left = 0, right = arr.size() - 1;
        Integer result = null;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr.get(mid) == target) {
                result = mid;
                left = mid + 1;
            } else if (arr.get(mid) < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return result;
    }

    public int searchInsert(List<Integer> arr, int target) {
        int left = 0, right = arr.size() - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;

            if (arr.get(mid) == target) {
                return mid;
            } else if (arr.get(mid) < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return left;
    }
}