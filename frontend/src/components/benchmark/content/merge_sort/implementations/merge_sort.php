<?php

class MergeSort {
    private function merge(array &$arr, int $left, int $mid, int $right): void {
        $n1 = $mid - $left + 1;
        $n2 = $right - $mid;

        $L = array_fill(0, $n1, 0);
        $R = array_fill(0, $n2, 0);

        for ($i = 0; $i < $n1; $i++) {
            $L[$i] = $arr[$left + $i];
        }
        for ($j = 0; $j < $n2; $j++) {
            $R[$j] = $arr[$mid + 1 + $j];
        }

        $i = 0;
        $j = 0;
        $k = $left;

        while ($i < $n1 && $j < $n2) {
            if ($L[$i] <= $R[$j]) {
                $arr[$k] = $L[$i];
                $i++;
            } else {
                $arr[$k] = $R[$j];
                $j++;
            }
            $k++;
        }

        while ($i < $n1) {
            $arr[$k] = $L[$i];
            $i++;
            $k++;
        }

        while ($j < $n2) {
            $arr[$k] = $R[$j];
            $j++;
            $k++;
        }
    }

    private function mergeSortRecursive(array &$arr, int $left, int $right): void {
        if ($left < $right) {
            $mid = $left + intdiv($right - $left, 2);
            $this->mergeSortRecursive($arr, $left, $mid);
            $this->mergeSortRecursive($arr, $mid + 1, $right);
            $this->merge($arr, $left, $mid, $right);
        }
    }

    public function sort(array &$arr): void {
        $this->mergeSortRecursive($arr, 0, count($arr) - 1);
    }

    public function sortIterative(array &$arr): void {
        $n = count($arr);

        for ($size = 1; $size < $n; $size *= 2) {
            for ($left = 0; $left < $n - $size; $left += 2 * $size) {
                $mid = $left + $size - 1;
                $right = min($left + 2 * $size - 1, $n - 1);
                $this->merge($arr, $left, $mid, $right);
            }
        }
    }

    private function mergeInPlace(array &$arr, int $left, int $mid, int $right): void {
        $i = $left;
        $j = $mid + 1;

        while ($i <= $mid && $j <= $right) {
            if ($arr[$i] <= $arr[$j]) {
                $i++;
            } else {
                $temp = $arr[$j];
                for ($k = $j; $k > $i; $k--) {
                    $arr[$k] = $arr[$k - 1];
                }
                $arr[$i] = $temp;
                $i++;
                $mid++;
                $j++;
            }
        }
    }

    private function mergeSortInPlace(array &$arr, int $left, int $right): void {
        if ($left < $right) {
            $mid = $left + intdiv($right - $left, 2);
            $this->mergeSortInPlace($arr, $left, $mid);
            $this->mergeSortInPlace($arr, $mid + 1, $right);
            $this->mergeInPlace($arr, $left, $mid, $right);
        }
    }

    public function sortInPlace(array &$arr): void {
        $this->mergeSortInPlace($arr, 0, count($arr) - 1);
    }
}

?>