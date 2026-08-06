<?php

class RadixSort {
    private function countingSort(array &$arr, int $exp): void {
        $n = count($arr);
        $output = array_fill(0, $n, 0);
        $count = array_fill(0, 10, 0);

        for ($i = 0; $i < $n; $i++) {
            $index = intdiv($arr[$i], $exp) % 10;
            $count[$index]++;
        }

        for ($i = 1; $i < 10; $i++) {
            $count[$i] += $count[$i - 1];
        }

        for ($i = $n - 1; $i >= 0; $i--) {
            $index = intdiv($arr[$i], $exp) % 10;
            $output[$count[$index] - 1] = $arr[$i];
            $count[$index]--;
        }

        for ($i = 0; $i < $n; $i++) {
            $arr[$i] = $output[$i];
        }
    }

    public function sort(array &$arr): void {
        if (empty($arr)) return;

        $maxVal = max($arr);
        $exp = 1;

        while (intdiv($maxVal, $exp) > 0) {
            $this->countingSort($arr, $exp);
            $exp *= 10;
        }
    }

    public function sortNegative(array &$arr): void {
        if (empty($arr)) return;

        $negatives = [];
        $positives = [];

        foreach ($arr as $x) {
            if ($x < 0) $negatives[] = -$x;
            else $positives[] = $x;
        }

        $this->sort($negatives);
        $this->sort($positives);

        $index = 0;
        for ($i = count($negatives) - 1; $i >= 0; $i--) {
            $arr[$index++] = -$negatives[$i];
        }
        for ($i = 0; $i < count($positives); $i++) {
            $arr[$index++] = $positives[$i];
        }
    }
}

?>