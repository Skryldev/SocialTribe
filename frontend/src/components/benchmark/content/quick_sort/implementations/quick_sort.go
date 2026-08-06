package main

import (
    "math/rand"
)

type QuickSort struct{}

func (qs *QuickSort) partition(arr []int, low, high int) int {
    pivot := arr[high]
    i := low - 1

    for j := low; j < high; j++ {
        if arr[j] <= pivot {
            i++
            arr[i], arr[j] = arr[j], arr[i]
        }
    }
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1
}

func (qs *QuickSort) partitionRandom(arr []int, low, high int) int {
    randomIdx := rand.Intn(high-low+1) + low
    arr[randomIdx], arr[high] = arr[high], arr[randomIdx]
    return qs.partition(arr, low, high)
}

func (qs *QuickSort) quickSortRecursive(arr []int, low, high int) {
    if low < high {
        pi := qs.partition(arr, low, high)
        qs.quickSortRecursive(arr, low, pi-1)
        qs.quickSortRecursive(arr, pi+1, high)
    }
}

func (qs *QuickSort) quickSortRandomRecursive(arr []int, low, high int) {
    if low < high {
        pi := qs.partitionRandom(arr, low, high)
        qs.quickSortRandomRecursive(arr, low, pi-1)
        qs.quickSortRandomRecursive(arr, pi+1, high)
    }
}

func (qs *QuickSort) Sort(arr []int) {
    qs.quickSortRecursive(arr, 0, len(arr)-1)
}

func (qs *QuickSort) SortRandom(arr []int) {
    qs.quickSortRandomRecursive(arr, 0, len(arr)-1)
}

func (qs *QuickSort) SortIterative(arr []int) {
    stack := [][2]int{{0, len(arr) - 1}}

    for len(stack) > 0 {
        top := stack[len(stack)-1]
        stack = stack[:len(stack)-1]
        low, high := top[0], top[1]

        if low < high {
            pi := qs.partition(arr, low, high)
            stack = append(stack, [2]int{low, pi - 1})
            stack = append(stack, [2]int{pi + 1, high})
        }
    }
}

func (qs *QuickSort) threeWayPartition(arr []int, low, high int) {
    if low >= high {
        return
    }

    lt, gt := low, high
    pivot := arr[low]
    i := low

    for i <= gt {
        if arr[i] < pivot {
            arr[lt], arr[i] = arr[i], arr[lt]
            lt++
            i++
        } else if arr[i] > pivot {
            arr[i], arr[gt] = arr[gt], arr[i]
            gt--
        } else {
            i++
        }
    }

    qs.threeWayPartition(arr, low, lt-1)
    qs.threeWayPartition(arr, gt+1, high)
}

func (qs *QuickSort) SortThreeWay(arr []int) {
    qs.threeWayPartition(arr, 0, len(arr)-1)
}