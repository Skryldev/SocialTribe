import random


def quick_sort(arr):
    """
    Quick Sort algorithm using Hoare partitioning and random pivot.
    
    Sorts array in-place with O(n log n) average time complexity.
    Uses recursion with tail call optimization.
    
    Time Complexity: O(n log n) average, O(n²) worst
    Space Complexity: O(log n) for recursion stack
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: The sorted list (sorted in-place, reference returned for convenience)
    
    Example:
        >>> arr = [3, 6, 8, 10, 1, 2, 1]
        >>> quick_sort(arr)
        [1, 1, 2, 3, 6, 8, 10]
    """
    if not arr:
        return arr
    
    _quick_sort_hoare(arr, 0, len(arr) - 1)
    return arr


def _quick_sort_hoare(arr, low, high):
    """
    Internal recursive Quick Sort with Hoare partitioning.
    
    Uses tail recursion elimination to limit stack depth to O(log n).
    """
    while low < high:
        # Partition the array
        pivot_idx = _hoare_partition(arr, low, high)
        
        # Recurse on smaller partition first (tail recursion optimization)
        if pivot_idx - low < high - pivot_idx:
            _quick_sort_hoare(arr, low, pivot_idx)
            low = pivot_idx + 1
        else:
            _quick_sort_hoare(arr, pivot_idx + 1, high)
            high = pivot_idx


def _hoare_partition(arr, low, high):
    """
    Hoare partitioning scheme.
    
    Uses two pointers scanning from both ends. More efficient
    than Lomuto with approximately n/3 swaps on average.
    
    Returns the index of the last element of the left partition.
    """
    # Median-of-three pivot selection
    mid = low + (high - low) // 2
    pivot = _median_of_three(arr, low, mid, high)
    
    i = low - 1
    j = high + 1
    
    while True:
        # Move i right while arr[i] < pivot
        i += 1
        while arr[i] < pivot:
            i += 1
        
        # Move j left while arr[j] > pivot
        j -= 1
        while arr[j] > pivot:
            j -= 1
        
        # If pointers crossed
        if i >= j:
            return j
        
        # Swap elements
        arr[i], arr[j] = arr[j], arr[i]


def _median_of_three(arr, a, b, c):
    """
    Select median of three elements as pivot.
    
    Reduces probability of worst-case partitioning by
    avoiding extreme values as pivot.
    """
    if arr[a] > arr[b]:
        arr[a], arr[b] = arr[b], arr[a]
    if arr[b] > arr[c]:
        arr[b], arr[c] = arr[c], arr[b]
        if arr[a] > arr[b]:
            arr[a], arr[b] = arr[b], arr[a]
    return arr[b]


def quick_sort_lomuto(arr):
    """
    Quick Sort with Lomuto partitioning scheme.
    
    Simpler to understand but performs more swaps than Hoare.
    Good for educational purposes.
    
    Time Complexity: O(n log n) average, O(n²) worst
    Space Complexity: O(log n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list
    """
    if not arr:
        return arr
    
    _quick_sort_lomuto(arr, 0, len(arr) - 1)
    return arr


def _quick_sort_lomuto(arr, low, high):
    """Internal Lomuto Quick Sort."""
    while low < high:
        pivot_idx = _lomuto_partition(arr, low, high)
        
        # Tail recursion optimization
        if pivot_idx - low < high - pivot_idx:
            _quick_sort_lomuto(arr, low, pivot_idx - 1)
            low = pivot_idx + 1
        else:
            _quick_sort_lomuto(arr, pivot_idx + 1, high)
            high = pivot_idx - 1


def _lomuto_partition(arr, low, high):
    """
    Lomuto partitioning scheme.
    
    Uses a single pointer scanning from left to right.
    Simpler than Hoare but uses more swaps.
    """
    # Random pivot for average-case guarantee
    pivot_idx = random.randint(low, high)
    arr[pivot_idx], arr[high] = arr[high], arr[pivot_idx]
    
    pivot = arr[high]
    i = low - 1
    
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1


def quick_sort_three_way(arr):
    """
    Three-way Quick Sort (Dutch National Flag problem).
    
    Partitions array into three regions:
    - Elements less than pivot
    - Elements equal to pivot
    - Elements greater than pivot
    
    Optimal for arrays with many duplicate keys.
    O(n) when all elements are equal.
    
    Time Complexity: O(n log n) average, O(n) for few unique keys
    Space Complexity: O(log n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [2, 1, 2, 3, 1, 2, 1]
        >>> quick_sort_three_way(arr)
        [1, 1, 1, 2, 2, 2, 3]
    """
    if not arr:
        return arr
    
    _quick_sort_three_way(arr, 0, len(arr) - 1)
    return arr


def _quick_sort_three_way(arr, low, high):
    """Internal three-way Quick Sort."""
    if low >= high:
        return
    
    # Three-way partition
    lt, gt = _three_way_partition(arr, low, high)
    
    # Recurse on < pivot and > pivot regions
    _quick_sort_three_way(arr, low, lt - 1)
    _quick_sort_three_way(arr, gt + 1, high)


def _three_way_partition(arr, low, high):
    """
    Dijkstra's three-way partitioning.
    
    Divides array into: [ < pivot | == pivot | > pivot ]
    Returns (lt, gt) where lt is first == pivot, gt is last == pivot.
    """
    # Random pivot
    pivot_idx = random.randint(low, high)
    arr[low], arr[pivot_idx] = arr[pivot_idx], arr[low]
    
    pivot = arr[low]
    lt = low       # arr[low..lt-1] < pivot
    gt = high      # arr[gt+1..high] > pivot
    i = low        # arr[lt..i-1] == pivot, arr[i..gt] unexplored
    
    while i <= gt:
        if arr[i] < pivot:
            arr[lt], arr[i] = arr[i], arr[lt]
            lt += 1
            i += 1
        elif arr[i] > pivot:
            arr[i], arr[gt] = arr[gt], arr[i]
            gt -= 1
        else:  # arr[i] == pivot
            i += 1
    
    return lt, gt


def quick_sort_iterative(arr):
    """
    Iterative Quick Sort using an explicit stack.
    
    Eliminates recursion completely, avoiding stack overflow
    on worst-case inputs.
    
    Time Complexity: O(n log n) average, O(n²) worst
    Space Complexity: O(log n) for explicit stack
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list
    """
    if not arr:
        return arr
    
    stack = [(0, len(arr) - 1)]
    
    while stack:
        low, high = stack.pop()
        
        if low < high:
            pivot_idx = _lomuto_partition(arr, low, high)
            
            # Push larger partition first (so smaller is processed first)
            if pivot_idx - low > high - pivot_idx:
                stack.append((low, pivot_idx - 1))
                stack.append((pivot_idx + 1, high))
            else:
                stack.append((pivot_idx + 1, high))
                stack.append((low, pivot_idx - 1))
    
    return arr


def intro_sort(arr):
    """
    Introsort: hybrid of Quick Sort and Heap Sort.
    
    Starts with Quick Sort, but switches to Heap Sort if
    recursion depth exceeds 2 * floor(log₂ n), guaranteeing
    O(n log n) worst-case performance.
    
    Used in C++ STL std::sort and many standard libraries.
    
    Time Complexity: O(n log n) worst-case guaranteed
    Space Complexity: O(log n)
    
    Args:
        arr: List of comparable elements
    
    Returns:
        list: Sorted list
    """
    if not arr:
        return arr
    
    max_depth = 2 * _log2(len(arr))
    _intro_sort(arr, 0, len(arr) - 1, max_depth)
    return arr


def _intro_sort(arr, low, high, depth_limit):
    """Internal Introsort."""
    # Base case: use insertion sort for small arrays
    if high - low < 16:
        _insertion_sort_range(arr, low, high)
        return
    
    # Switch to heap sort if depth limit exceeded
    if depth_limit == 0:
        _heap_sort_range(arr, low, high)
        return
    
    # Quick Sort partitioning
    pivot_idx = _lomuto_partition(arr, low, high)
    
    _intro_sort(arr, low, pivot_idx - 1, depth_limit - 1)
    _intro_sort(arr, pivot_idx + 1, high, depth_limit - 1)


def _heap_sort_range(arr, low, high):
    """Heap sort for a subarray [low, high]."""
    import heapq
    sub = arr[low:high + 1]
    heapq.heapify(sub)
    for i in range(low, high + 1):
        arr[i] = heapq.heappop(sub)


def _insertion_sort_range(arr, low, high):
    """Insertion sort for a subarray [low, high]."""
    for i in range(low + 1, high + 1):
        key = arr[i]
        j = i - 1
        while j >= low and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key


def _log2(n):
    """Compute floor(log₂(n))."""
    if n <= 1:
        return 0
    result = 0
    while n > 1:
        n >>= 1
        result += 1
    return result


def quick_select(arr, k):
    """
    QuickSelect: find k-th smallest element in unsorted array.
    
    Uses Quick Sort's partitioning to achieve O(n) average time
    without fully sorting the array.
    
    Time Complexity: O(n) average, O(n²) worst
    Space Complexity: O(1)
    
    Args:
        arr: List of comparable elements
        k: 0-based index of element to find (0 ≤ k < len(arr))
    
    Returns:
        The k-th smallest element
    
    Example:
        >>> arr = [3, 1, 4, 1, 5, 9, 2, 6]
        >>> quick_select(arr, 3)
        3  # 4th smallest element (0-indexed k=3)
    """
    if not arr or k < 0 or k >= len(arr):
        raise IndexError(f"k={k} out of range for array of size {len(arr)}")
    
    arr_copy = arr[:]  # Work on a copy to avoid modifying original
    low, high = 0, len(arr_copy) - 1
    
    while low <= high:
        pivot_idx = _lomuto_partition(arr_copy, low, high)
        
        if pivot_idx == k:
            return arr_copy[k]
        elif pivot_idx < k:
            low = pivot_idx + 1
        else:
            high = pivot_idx - 1
    
    return arr_copy[k]