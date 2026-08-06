def binary_search(arr, target):
    """
    Standard binary search for exact match.
    
    Finds the index of target in a sorted array. Returns -1
    if target is not present.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list of comparable elements
        target: Element to find
    
    Returns:
        int: Index of target (0-based) or -1 if not found
    
    Example:
        >>> arr = [1, 3, 5, 7, 9, 11, 13]
        >>> binary_search(arr, 7)
        3
        >>> binary_search(arr, 8)
        -1
    """
    if not arr:
        return -1
    
    left, right = 0, len(arr) - 1
    
    while left <= right:
        # Safe midpoint calculation (prevents integer overflow)
        mid = left + (right - left) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:  # arr[mid] > target
            right = mid - 1
    
    return -1


def binary_search_recursive(arr, target, left=0, right=None):
    """
    Recursive implementation of binary search.
    
    More elegant but uses O(log n) stack space due to recursion.
    
    Time Complexity: O(log n)
    Space Complexity: O(log n) for recursion stack
    
    Args:
        arr: Sorted list
        target: Element to find
        left: Left boundary (default: 0)
        right: Right boundary (default: len(arr) - 1)
    
    Returns:
        int: Index of target or -1
    """
    if right is None:
        right = len(arr) - 1
    
    if left > right:
        return -1
    
    mid = left + (right - left) // 2
    
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search_recursive(arr, target, mid + 1, right)
    else:
        return binary_search_recursive(arr, target, left, mid - 1)


def binary_search_lower_bound(arr, target):
    """
    Lower bound: first index where arr[i] >= target.
    
    Returns the leftmost insertion point for target in sorted array.
    Useful for finding first occurrence or insertion position.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list
        target: Search target
    
    Returns:
        int: First index i where arr[i] >= target
    
    Example:
        >>> arr = [1, 2, 2, 2, 3, 4]
        >>> binary_search_lower_bound(arr, 2)
        1  # First occurrence of 2
        >>> binary_search_lower_bound(arr, 5)
        6  # Insertion point (beyond end)
    """
    if not arr:
        return 0
    
    left, right = 0, len(arr)
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    return left


def binary_search_upper_bound(arr, target):
    """
    Upper bound: first index where arr[i] > target.
    
    Returns the rightmost insertion point for target.
    Useful for finding the end of duplicate range.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list
        target: Search target
    
    Returns:
        int: First index i where arr[i] > target
    
    Example:
        >>> arr = [1, 2, 2, 2, 3, 4]
        >>> binary_search_upper_bound(arr, 2)
        4  # First element greater than 2
    """
    if not arr:
        return 0
    
    left, right = 0, len(arr)
    
    while left < right:
        mid = left + (right - left) // 2
        
        if arr[mid] <= target:
            left = mid + 1
        else:
            right = mid
    
    return left


def binary_search_range(arr, target):
    """
    Find the range [first, last) of target in sorted array.
    
    Combines lower_bound and upper_bound for efficient
    range queries on duplicates.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list (may contain duplicates)
        target: Search target
    
    Returns:
        tuple: (first_index, last_index) where target appears in arr[first:last]
               Returns (-1, -1) if target not found
    
    Example:
        >>> arr = [1, 2, 2, 2, 3, 4]
        >>> binary_search_range(arr, 2)
        (1, 4)  # target at indices 1, 2, 3
        >>> binary_search_range(arr, 5)
        (-1, -1)  # not found
    """
    first = binary_search_lower_bound(arr, target)
    
    if first == len(arr) or arr[first] != target:
        return -1, -1
    
    last = binary_search_upper_bound(arr, target)
    
    return first, last


def binary_search_first_true(predicate, left, right):
    """
    Binary search on monotonic predicate function.
    
    Finds the first index in [left, right] where predicate(i) is True.
    Assumes predicate is monotonic: False for i < k, True for i >= k.
    
    Time Complexity: O(log n) predicate evaluations
    Space Complexity: O(1)
    
    Args:
        predicate: Function(int) -> bool (monotonic)
        left: Left bound of search range (inclusive)
        right: Right bound of search range (inclusive)
    
    Returns:
        int: First index where predicate is True, or right+1 if never True
    
    Example:
        >>> # Find first number >= 5 in a function
        >>> def is_greater_equal_5(x):
        ...     return x >= 5
        >>> binary_search_first_true(is_greater_equal_5, 0, 10)
        5
        >>> # Find first n where n² >= 100
        >>> binary_search_first_true(lambda n: n*n >= 100, 0, 20)
        10
    """
    while left < right:
        mid = left + (right - left) // 2
        
        if predicate(mid):
            right = mid
        else:
            left = mid + 1
    
    return left if predicate(left) else left + 1


def binary_search_float(arr, target, epsilon=1e-9):
    """
    Binary search on sorted array of floating-point numbers.
    
    Uses tolerance instead of exact equality comparison
    to handle floating-point imprecision.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list of floats
        target: Float to find
        epsilon: Tolerance for equality check
    
    Returns:
        int: Index of closest element or -1 if none within epsilon
    """
    if not arr:
        return -1
    
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        
        if abs(arr[mid] - target) < epsilon:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1


def exponential_search(arr, target):
    """
    Exponential search for unbounded or very large sorted arrays.
    
    Finds target by first finding range where target might exist
    (exponential probing) and then performing binary search.
    
    Useful when array is very large and target is near the beginning.
    
    Time Complexity: O(log i) where i is target's position
    Space Complexity: O(1)
    
    Args:
        arr: Sorted list
        target: Element to find
    
    Returns:
        int: Index of target or -1
    
    Example:
        >>> arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        >>> exponential_search(arr, 3)
        2  # Found quickly near start
        >>> exponential_search(arr, 50)
        -1
    """
    if not arr:
        return -1
    
    if arr[0] == target:
        return 0
    
    # Exponential probing
    bound = 1
    while bound < len(arr) and arr[bound] < target:
        bound *= 2
    
    # Binary search in [bound/2, min(bound, n-1)]
    left = bound // 2
    right = min(bound, len(arr) - 1)
    
    while left <= right:
        mid = left + (right - left) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1


def binary_search_rotated(arr, target):
    """
    Binary search in a rotated sorted array.
    
    Finds target in an array that was sorted then rotated
    at an unknown pivot point.
    
    Time Complexity: O(log n)
    Space Complexity: O(1)
    
    Args:
        arr: Rotated sorted array (e.g., [4,5,6,7,0,1,2])
        target: Element to find
    
    Returns:
        int: Index of target or -1
    
    Example:
        >>> arr = [4, 5, 6, 7, 0, 1, 2]
        >>> binary_search_rotated(arr, 0)
        4
        >>> binary_search_rotated(arr, 3)
        -1
    """
    if not arr:
        return -1
    
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        
        if arr[mid] == target:
            return mid
        
        # Determine which half is sorted
        if arr[left] <= arr[mid]:
            # Left half is sorted
            if arr[left] <= target < arr[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            # Right half is sorted
            if arr[mid] < target <= arr[right]:
                left = mid + 1
            else:
                right = mid - 1
    
    return -1