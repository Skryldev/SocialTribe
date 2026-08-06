<?php

class QuickSort {
    private function partition(array &$arr, int $low, int $high): int {
        $pivot = $arr[$high];
        $i = $low - 1;

        for ($j = $low; $j < $high; $j++) {
            if ($arr[$j] <= $pivot) {
                $i++;
                $this->swap($arr, $i, $j);
            }
        }
        $this->swap($arr, $i + 1, $high);
        return $i + 1;
    }

    private function partitionRandom(array &$arr, int $low, int $high): int {
        $randomIdx = rand($low, $high);
        $this->swap($arr, $randomIdx, $high);
        return $this->partition($arr, $low, $high);
    }

    private function swap(array &$arr, int $i, int $j): void {
        $temp = $arr[$i];
        $arr[$i] = $arr[$j];
        $arr[$j] = $temp;
    }

    private function quickSortRecursive(array &$arr, int $low, int $high): void {
        if ($low < $high) {
            $pi = $this->partition($arr, $low, $high);
            $this->quickSortRecursive($arr, $low, $pi - 1);
            $this->quickSortRecursive($arr, $pi + 1, $high);
        }
    }

    private function quickSortRandomRecursive(array &$arr, int $low, int $high): void {
        if ($low < $high) {
            $pi = $this->partitionRandom($arr, $low, $high);
            $this->quickSortRandomRecursive($arr, $low, $pi - 1);
            $this->quickSortRandomRecursive($arr, $pi + 1, $high);
        }
    }

    public function sort(array &$arr): void {
        $this->quickSortRecursive($arr, 0, count($arr) - 1);
    }

    public function sortRandom(array &$arr): void {
        $this->quickSortRandomRecursive($arr, 0, count($arr) - 1);
    }

    public function sortIterative(array &$arr): void {
        $stack = [[0, count($arr) - 1]];

        while (!empty($stack)) {
            list($low, $high) = array_pop($stack);

            if ($low < $high) {
                $pi = $this->partition($arr, $low, $high);
                $stack[] = [$low, $pi - 1];
                $stack[] = [$pi + 1, $high];
            }
        }
    }

    private function threeWayPartition(array &$arr, int $low, int $high): void {
        if ($low >= $high) return;

        $lt = $low;
        $gt = $high;
        $pivot = $arr[$low];
        $i = $low;

        while ($i <= $gt) {
            if ($arr[$i] < $pivot) {
                $this->swap($arr, $lt, $i);
                $lt++;
                $i++;
            } else if ($arr[$i] > $pivot) {
                $this->swap($arr, $i, $gt);
                $gt--;
            } else {
                $i++;
            }
        }

        $this->threeWayPartition($arr, $low, $lt - 1);
        $this->threeWayPartition($arr, $gt + 1, $high);
    }

    public function sortThreeWay(array &$arr): void {
        $this->threeWayPartition($arr, 0, count($arr) - 1);
    }
}

?>