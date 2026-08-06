package main

type CountingSort struct{}

func (cs *CountingSort) findMax(arr []int) int {
    maxVal := arr[0]
    for _, val := range arr {
        if val > maxVal {
            maxVal = val
        }
    }
    return maxVal
}

func (cs *CountingSort) findMin(arr []int) int {
    minVal := arr[0]
    for _, val := range arr {
        if val < minVal {
            minVal = val
        }
    }
    return minVal
}

func (cs *CountingSort) Sort(arr []int) {
    if len(arr) == 0 {
        return
    }

    maxVal := cs.findMax(arr)
    minVal := cs.findMin(arr)
    rangeVal := maxVal - minVal + 1

    count := make([]int, rangeVal)
    output := make([]int, len(arr))

    for _, val := range arr {
        count[val-minVal]++
    }

    for i := 1; i < len(count); i++ {
        count[i] += count[i-1]
    }

    for i := len(arr) - 1; i >= 0; i-- {
        output[count[arr[i]-minVal]-1] = arr[i]
        count[arr[i]-minVal]--
    }

    for i := 0; i < len(arr); i++ {
        arr[i] = output[i]
    }
}

func (cs *CountingSort) SortStable(arr []int) {
    cs.Sort(arr)
}

func (cs *CountingSort) SortDescending(arr []int) {
    cs.Sort(arr)
    for i, j := 0, len(arr)-1; i < j; i, j = i+1, j-1 {
        arr[i], arr[j] = arr[j], arr[i]
    }
}