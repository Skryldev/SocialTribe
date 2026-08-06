<?php

class CountingSort {
    private function findMax(array $arr): int {
        $maxVal = $arr[0];
        foreach ($arr as $val) {
            if ($val > $maxVal) $maxVal = $val;
        }
        return $maxVal;
    }

    private function findMin(array $arr): int {
        $minVal = $arr[0];
        foreach ($arr as $val) {
            if ($val < $minVal) $minVal = $val;
        }
        return $minVal;
    }

    public function sort(array &$arr): void {
        if (empty($arr)) return;

        $maxVal = $this->findMax($arr);
        $minVal = $this->findMin($arr);
        $range = $maxVal - $minVal + 1;

        $count = array_fill(0, $range, 0);
        $output = array_fill(0, count($arr), 0);

        foreach ($arr as $val) {
            $count[$val - $minVal]++;
        }

        for ($i = 1; $i < count($count); $i++) {
            $count[$i] += $count[$i - 1];
        }

        for ($i = count($arr) - 1; $i >= 0; $i--) {
            $output[$count[$arr[$i] - $minVal] - 1] = $arr[$i];
            $count[$arr[$i] - $minVal]--;
        }

        for ($i = 0; $i < count($arr); $i++) {
            $arr[$i] = $output[$i];
        }
    }

    public function sortStable(array &$arr): void {
        $this->sort($arr);
    }

    public function sortDescending(array &$arr): void {
        $this->sort($arr);
        $arr = array_reverse($arr);
    }
}

?>