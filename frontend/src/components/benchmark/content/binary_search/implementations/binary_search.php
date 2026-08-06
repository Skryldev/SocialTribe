<?php

class BinarySearch {
    public function search(array $arr, int $target): int {
        $left = 0;
        $right = count($arr) - 1;

        while ($left <= $right) {
            $mid = $left + intdiv($right - $left, 2);

            if ($arr[$mid] === $target) {
                return $mid;
            } else if ($arr[$mid] < $target) {
                $left = $mid + 1;
            } else {
                $right = $mid - 1;
            }
        }

        return -1;
    }

    public function searchRecursive(array $arr, int $target, int $left, int $right): int {
        if ($left > $right) {
            return -1;
        }

        $mid = $left + intdiv($right - $left, 2);

        if ($arr[$mid] === $target) {
            return $mid;
        } else if ($arr[$mid] < $target) {
            return $this->searchRecursive($arr, $target, $mid + 1, $right);
        } else {
            return $this->searchRecursive($arr, $target, $left, $mid - 1);
        }
    }

    public function searchFirstOccurrence(array $arr, int $target): int {
        $left = 0;
        $right = count($arr) - 1;
        $result = -1;

        while ($left <= $right) {
            $mid = $left + intdiv($right - $left, 2);

            if ($arr[$mid] === $target) {
                $result = $mid;
                $right = $mid - 1;
            } else if ($arr[$mid] < $target) {
                $left = $mid + 1;
            } else {
                $right = $mid - 1;
            }
        }

        return $result;
    }

    public function searchLastOccurrence(array $arr, int $target): int {
        $left = 0;
        $right = count($arr) - 1;
        $result = -1;

        while ($left <= $right) {
            $mid = $left + intdiv($right - $left, 2);

            if ($arr[$mid] === $target) {
                $result = $mid;
                $left = $mid + 1;
            } else if ($arr[$mid] < $target) {
                $left = $mid + 1;
            } else {
                $right = $mid - 1;
            }
        }

        return $result;
    }

    public function searchInsert(array $arr, int $target): int {
        $left = 0;
        $right = count($arr) - 1;

        while ($left <= $right) {
            $mid = $left + intdiv($right - $left, 2);

            if ($arr[$mid] === $target) {
                return $mid;
            } else if ($arr[$mid] < $target) {
                $left = $mid + 1;
            } else {
                $right = $mid - 1;
            }
        }

        return $left;
    }
}

?>