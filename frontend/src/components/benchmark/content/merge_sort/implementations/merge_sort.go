package main

type MergeSort struct{}

func (ms *MergeSort) merge(arr []int, left, mid, right int) {
    n1 := mid - left + 1
    n2 := right - mid

    L := make([]int, n1)
    R := make([]int, n2)

    for i := 0; i < n1; i++ {
        L[i] = arr[left+i]
    }
    for j := 0; j < n2; j++ {
        R[j] = arr[mid+1+j]
    }

    i, j, k := 0, 0, left

    for i < n1 && j < n2 {
        if L[i] <= R[j] {
            arr[k] = L[i]
            i++
        } else {
            arr[k] = R[j]
            j++
        }
        k++
    }

    for i < n1 {
        arr[k] = L[i]
        i++
        k++
    }

    for j < n2 {
        arr[k] = R[j]
        j++
        k++
    }
}

func (ms *MergeSort) mergeSortRecursive(arr []int, left, right int) {
    if left < right {
        mid := left + (right-left)/2
        ms.mergeSortRecursive(arr, left, mid)
        ms.mergeSortRecursive(arr, mid+1, right)
        ms.merge(arr, left, mid, right)
    }
}

func (ms *MergeSort) Sort(arr []int) {
    ms.mergeSortRecursive(arr, 0, len(arr)-1)
}

func (ms *MergeSort) SortIterative(arr []int) {
    n := len(arr)

    for size := 1; size < n; size *= 2 {
        for left := 0; left < n-size; left += 2 * size {
            mid := left + size - 1
            right := left + 2*size - 1
            if right > n-1 {
                right = n - 1
            }
            ms.merge(arr, left, mid, right)
        }
    }
}

func (ms *MergeSort) mergeInPlace(arr []int, left, mid, right int) {
    i := left
    j := mid + 1

    for i <= mid && j <= right {
        if arr[i] <= arr[j] {
            i++
        } else {
            temp := arr[j]
            for k := j; k > i; k-- {
                arr[k] = arr[k-1]
            }
            arr[i] = temp
            i++
            mid++
            j++
        }
    }
}

func (ms *MergeSort) mergeSortInPlace(arr []int, left, right int) {
    if left < right {
        mid := left + (right-left)/2
        ms.mergeSortInPlace(arr, left, mid)
        ms.mergeSortInPlace(arr, mid+1, right)
        ms.mergeInPlace(arr, left, mid, right)
    }
}

func (ms *MergeSort) SortInPlace(arr []int) {
    ms.mergeSortInPlace(arr, 0, len(arr)-1)
}