def merge_sort(arr):
    """
    Standard Merge Sort (top-down recursive).
    
    Sorts array using divide-and-conquer with guaranteed
    O(n log n) time complexity in all cases.
    
    Time Complexity: O(n log n)
    Space Complexity: O(n) for auxiliary array
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list (new list, original unchanged)
    
    Example:
        >>> arr = [38, 27, 43, 3, 9, 82, 10]
        >>> sorted_arr = merge_sort(arr)
        >>> sorted_arr
        [3, 9, 10, 27, 38, 43, 82]
        >>> arr  # Original unchanged
        [38, 27, 43, 3, 9, 82, 10]
    """
    if len(arr) <= 1:
        return arr[:]
    
    # Divide array into two halves
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    
    # Merge sorted halves
    return _merge(left, right)


def _merge(left, right):
    """
    Merge two sorted arrays into a single sorted array.
    
    Args:
        left: Sorted list
        right: Sorted list
    
    Returns:
        list: Merged sorted list
    """
    result = []
    i, j = 0, 0
    len_left, len_right = len(left), len(right)
    
    # Compare and merge
    while i < len_left and j < len_right:
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    # Append remaining elements
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result


def merge_sort_inplace(arr):
    """
    In-place Merge Sort (modifies original array).
    
    Uses a single auxiliary array allocated once to avoid
    repeated memory allocation overhead.
    
    Time Complexity: O(n log n)
    Space Complexity: O(n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: The sorted list (sorted in-place, reference returned for convenience)
    
    Example:
        >>> arr = [38, 27, 43, 3, 9, 82, 10]
        >>> merge_sort_inplace(arr)
        [3, 9, 10, 27, 38, 43, 82]
    """
    if len(arr) <= 1:
        return arr
    
    auxiliary = [0] * len(arr)
    _merge_sort_inplace(arr, auxiliary, 0, len(arr) - 1)
    return arr


def _merge_sort_inplace(arr, aux, left, right):
    """Internal recursive in-place merge sort."""
    if left >= right:
        return
    
    mid = left + (right - left) // 2
    
    # Recursively sort halves
    _merge_sort_inplace(arr, aux, left, mid)
    _merge_sort_inplace(arr, aux, mid + 1, right)
    
    # Merge sorted halves
    _merge_inplace(arr, aux, left, mid, right)


def _merge_inplace(arr, aux, left, mid, right):
    """
    Merge two sorted subarrays arr[left..mid] and arr[mid+1..right].
    
    Uses auxiliary array to avoid repeated allocation.
    """
    # Copy both halves to auxiliary array
    for i in range(left, right + 1):
        aux[i] = arr[i]
    
    i, j = left, mid + 1
    k = left
    
    # Merge from auxiliary back to original array
    while i <= mid and j <= right:
        if aux[i] <= aux[j]:
            arr[k] = aux[i]
            i += 1
        else:
            arr[k] = aux[j]
            j += 1
        k += 1
    
    # Copy remaining elements from left half
    while i <= mid:
        arr[k] = aux[i]
        i += 1
        k += 1
    
    # Note: no need to copy right half (already in place)


def merge_sort_bottom_up(arr):
    """
    Bottom-up (iterative) Merge Sort.
    
    Avoids recursion by iteratively merging subarrays of
    increasing size. Same O(n log n) complexity.
    
    Time Complexity: O(n log n)
    Space Complexity: O(n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [5, 2, 8, 1, 9, 3]
        >>> merge_sort_bottom_up(arr)
        [1, 2, 3, 5, 8, 9]
    """
    n = len(arr)
    if n <= 1:
        return arr[:]
    
    result = arr[:]
    auxiliary = [0] * n
    
    width = 1
    
    while width < n:
        for i in range(0, n, 2 * width):
            left = i
            mid = min(i + width - 1, n - 1)
            right = min(i + 2 * width - 1, n - 1)
            
            if mid < right:
                # Merge subarrays result[left..mid] and result[mid+1..right]
                _merge_bottom_up(result, auxiliary, left, mid, right)
        
        width *= 2
    
    return result


def _merge_bottom_up(arr, aux, left, mid, right):
    """Merge for bottom-up merge sort."""
    for i in range(left, right + 1):
        aux[i] = arr[i]
    
    i, j = left, mid + 1
    k = left
    
    while i <= mid and j <= right:
        if aux[i] <= aux[j]:
            arr[k] = aux[i]
            i += 1
        else:
            arr[k] = aux[j]
            j += 1
        k += 1
    
    while i <= mid:
        arr[k] = aux[i]
        i += 1
        k += 1


def merge_sort_optimized(arr, threshold=16):
    """
    Optimized Merge Sort with hybrid approach.
    
    Uses insertion sort for small subarrays (below threshold)
    to reduce recursion overhead and improve performance.
    
    Also checks if subarrays are already in order to skip
    unnecessary merging.
    
    Time Complexity: O(n log n)
    Space Complexity: O(n)
    
    Args:
        arr: List of comparable elements
        threshold: Switch to insertion sort when n ≤ threshold
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [38, 27, 43, 3, 9, 82, 10]
        >>> merge_sort_optimized(arr)
        [3, 9, 10, 27, 38, 43, 82]
    """
    n = len(arr)
    if n <= 1:
        return arr[:]
    
    result = arr[:]
    auxiliary = [0] * n
    _merge_sort_optimized(result, auxiliary, 0, n - 1, threshold)
    return result


def _merge_sort_optimized(arr, aux, left, right, threshold):
    """Optimized recursive merge sort."""
    # Use insertion sort for small subarrays
    if right - left + 1 <= threshold:
        _insertion_sort_range(arr, left, right)
        return
    
    if left >= right:
        return
    
    mid = left + (right - left) // 2
    
    _merge_sort_optimized(arr, aux, left, mid, threshold)
    _merge_sort_optimized(arr, aux, mid + 1, right, threshold)
    
    # Skip merge if already sorted
    if arr[mid] <= arr[mid + 1]:
        return
    
    _merge_inplace(arr, aux, left, mid, right)


def _insertion_sort_range(arr, left, right):
    """Insertion sort for subarray [left, right]."""
    for i in range(left + 1, right + 1):
        key = arr[i]
        j = i - 1
        while j >= left and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key


def merge_sort_linked_list(head):
    """
    Merge Sort for singly linked lists.
    
    Sorts linked list in O(n log n) time with O(1) extra space
    (no auxiliary arrays needed — just pointer manipulation).
    
    Time Complexity: O(n log n)
    Space Complexity: O(log n) for recursion stack
    
    Args:
        head: ListNode (first node of linked list)
    
    Returns:
        ListNode: Head of sorted linked list
    
    Example:
        >>> # For a linked list: 4 -> 2 -> 1 -> 3
        >>> head = ListNode(4, ListNode(2, ListNode(1, ListNode(3))))
        >>> sorted_head = merge_sort_linked_list(head)
        >>> # Result: 1 -> 2 -> 3 -> 4
    """
    if head is None or head.next is None:
        return head
    
    # Find middle using slow/fast pointer
    mid_prev = _find_middle_prev(head)
    mid = mid_prev.next
    mid_prev.next = None  # Split the list
    
    # Recursively sort both halves
    left = merge_sort_linked_list(head)
    right = merge_sort_linked_list(mid)
    
    # Merge sorted halves
    return _merge_linked_lists(left, right)


def _find_middle_prev(head):
    """Find node just before the middle of linked list."""
    slow, fast = head, head.next
    
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    
    return slow


def _merge_linked_lists(l1, l2):
    """Merge two sorted linked lists."""
    # Dummy head simplifies edge cases
    dummy = type(l1)() if hasattr(l1, '__class__') else type('ListNode', (), {})()
    dummy.val = 0
    dummy.next = None
    current = dummy
    
    while l1 and l2:
        if l1.val <= l2.val:
            current.next = l1
            l1 = l1.next
        else:
            current.next = l2
            l2 = l2.next
        current = current.next
    
    current.next = l1 if l1 else l2
    
    return dummy.next


def count_inversions(arr):
    """
    Count inversions in array using Merge Sort.
    
    An inversion is a pair (i,j) where i < j but arr[i] > arr[j].
    Sorted array has 0 inversions; reverse-sorted has n(n-1)/2.
    
    Time Complexity: O(n log n)
    Space Complexity: O(n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        int: Number of inversions
    
    Example:
        >>> count_inversions([2, 4, 1, 3, 5])
        3  # Inversions: (2,1), (4,1), (4,3)
        >>> count_inversions([1, 2, 3, 4, 5])
        0  # Already sorted
    """
    if len(arr) <= 1:
        return 0
    
    arr_copy = arr[:]
    auxiliary = [0] * len(arr_copy)
    
    return _count_inversions(arr_copy, auxiliary, 0, len(arr_copy) - 1)


def _count_inversions(arr, aux, left, right):
    """Count inversions during merge sort."""
    if left >= right:
        return 0
    
    mid = left + (right - left) // 2
    
    # Count inversions in left and right halves
    inv_count = _count_inversions(arr, aux, left, mid)
    inv_count += _count_inversions(arr, aux, mid + 1, right)
    
    # Count split inversions during merge
    inv_count += _merge_and_count(arr, aux, left, mid, right)
    
    return inv_count


def _merge_and_count(arr, aux, left, mid, right):
    """Merge and count split inversions."""
    for i in range(left, right + 1):
        aux[i] = arr[i]
    
    i, j = left, mid + 1
    k = left
    inv_count = 0
    
    while i <= mid and j <= right:
        if aux[i] <= aux[j]:
            arr[k] = aux[i]
            i += 1
        else:
            arr[k] = aux[j]
            j += 1
            # All remaining elements in left half are greater than aux[j]
            inv_count += (mid - i + 1)
        k += 1
    
    while i <= mid:
        arr[k] = aux[i]
        i += 1
        k += 1
    
    while j <= right:
        arr[k] = aux[j]
        j += 1
        k += 1
    
    return inv_count