package main

import (
	"math"
)

type RadixSort struct{}

func (rs *RadixSort) countingSort(arr []int, exp int) {
	n := len(arr)
	output := make([]int, n)
	count := make([]int, 10)

	for i := 0; i < n; i++ {
		index := (arr[i] / exp) % 10
		count[index]++
	}

	for i := 1; i < 10; i++ {
		count[i] += count[i-1]
	}

	for i := n - 1; i >= 0; i-- {
		index := (arr[i] / exp) % 10
		output[count[index]-1] = arr[i]
		count[index]--
	}

	for i := 0; i < n; i++ {
		arr[i] = output[i]
	}
}

func (rs *RadixSort) Sort(arr []int) {
	if len(arr) == 0 {
		return
	}

	maxVal := arr[0]
	for _, val := range arr {
		if val > maxVal {
			maxVal = val
		}
	}

	exp := 1
	for maxVal/exp > 0 {
		rs.countingSort(arr, exp)
		exp *= 10
	}
}

func (rs *RadixSort) SortNegative(arr []int) {
	if len(arr) == 0 {
		return
	}

	negatives := []int{}
	positives := []int{}

	for _, x := range arr {
		if x < 0 {
			negatives = append(negatives, -x)
		} else {
			positives = append(positives, x)
		}
	}

	rs.Sort(negatives)
	rs.Sort(positives)

	index := 0
	for i := len(negatives) - 1; i >= 0; i-- {
		arr[index] = -negatives[i]
		index++
	}
	for i := 0; i < len(positives); i++ {
		arr[index] = positives[i]
		index++
	}
}