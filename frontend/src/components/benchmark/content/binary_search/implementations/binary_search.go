package main

type BinarySearch struct{}

func (bs *BinarySearch) Search(arr []int, target int) int {
	left, right := 0, len(arr)-1

	for left <= right {
		mid := left + (right-left)/2

		if arr[mid] == target {
			return mid
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return -1
}

func (bs *BinarySearch) SearchRecursive(arr []int, target, left, right int) int {
	if left > right {
		return -1
	}

	mid := left + (right-left)/2

	if arr[mid] == target {
		return mid
	} else if arr[mid] < target {
		return bs.SearchRecursive(arr, target, mid+1, right)
	} else {
		return bs.SearchRecursive(arr, target, left, mid-1)
	}
}

func (bs *BinarySearch) SearchFirstOccurrence(arr []int, target int) int {
	left, right := 0, len(arr)-1
	result := -1

	for left <= right {
		mid := left + (right-left)/2

		if arr[mid] == target {
			result = mid
			right = mid - 1
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

func (bs *BinarySearch) SearchLastOccurrence(arr []int, target int) int {
	left, right := 0, len(arr)-1
	result := -1

	for left <= right {
		mid := left + (right-left)/2

		if arr[mid] == target {
			result = mid
			left = mid + 1
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return result
}

func (bs *BinarySearch) SearchInsert(arr []int, target int) int {
	left, right := 0, len(arr)-1

	for left <= right {
		mid := left + (right-left)/2

		if arr[mid] == target {
			return mid
		} else if arr[mid] < target {
			left = mid + 1
		} else {
			right = mid - 1
		}
	}

	return left
}