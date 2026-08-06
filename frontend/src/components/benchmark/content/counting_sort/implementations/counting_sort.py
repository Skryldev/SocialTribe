def counting_sort(arr):
    """
    Counting Sort for arrays of non-negative integers.
    
    Sorts array in O(n + k) time where k is the range of values.
    Stable and non-comparison-based.
    
    Time Complexity: O(n + k)
    Space Complexity: O(n + k)
    
    Args:
        arr: List of non-negative integers
    
    Returns:
        list: Sorted list (new list, original unchanged)
    
    Example:
        >>> arr = [4, 2, 2, 8, 3, 3, 1]
        >>> counting_sort(arr)
        [1, 2, 2, 3, 3, 4, 8]
    """
    if not arr:
        return []
    
    # Find the range of values
    max_val = max(arr)
    
    # Create counting array
    count = [0] * (max_val + 1)
    
    # Count frequencies
    for num in arr:
        count[num] += 1
    
    # Compute cumulative sums
    for i in range(1, len(count)):
        count[i] += count[i - 1]
    
    # Build output array (iterate in reverse for stability)
    output = [0] * len(arr)
    for num in reversed(arr):
        position = count[num] - 1
        output[position] = num
        count[num] -= 1
    
    return output


def counting_sort_inplace(arr):
    """
    In-place Counting Sort (modifies original array).
    
    Time Complexity: O(n + k)
    Space Complexity: O(k) for counting array only
    
    Args:
        arr: List of non-negative integers
    
    Returns:
        list: The sorted list (sorted in-place, reference returned for convenience)
    
    Example:
        >>> arr = [4, 2, 2, 8, 3, 3, 1]
        >>> counting_sort_inplace(arr)
        [1, 2, 2, 3, 3, 4, 8]
    """
    if not arr:
        return arr
    
    # Find range
    max_val = max(arr)
    
    # Count frequencies
    count = [0] * (max_val + 1)
    for num in arr:
        count[num] += 1
    
    # Reconstruct sorted array in-place
    index = 0
    for value in range(max_val + 1):
        for _ in range(count[value]):
            arr[index] = value
            index += 1
    
    return arr


def counting_sort_general(arr, key_func=None):
    """
    General Counting Sort for any integer range (including negative).
    
    Handles negative numbers by shifting values to non-negative range.
    Accepts optional key function to extract integer key from objects.
    
    Time Complexity: O(n + k) where k = max_key - min_key
    Space Complexity: O(n + k)
    
    Args:
        arr: List of integers or objects with integer key
        key_func: Function to extract integer key from element
    
    Returns:
        list: Sorted list (new list, original unchanged)
    
    Example:
        >>> arr = [-5, -2, 0, 3, 1, -5]
        >>> counting_sort_general(arr)
        [-5, -5, -2, 0, 1, 3]
        >>> # Sort objects by age
        >>> people = [('Alice', 25), ('Bob', 20), ('Charlie', 25)]
        >>> counting_sort_general(people, key_func=lambda p: p[1])
        [('Bob', 20), ('Alice', 25), ('Charlie', 25)]
    """
    if not arr:
        return []
    
    # Extract keys
    if key_func is None:
        keys = arr[:]  # Use values directly
    else:
        keys = [key_func(x) for x in arr]
    
    # Find range
    min_val = min(keys)
    max_val = max(keys)
    range_size = max_val - min_val + 1
    
    # Create counting array (shifted by min_val)
    count = [0] * range_size
    
    # Count frequencies
    for key in keys:
        count[key - min_val] += 1
    
    # Compute cumulative sums
    for i in range(1, range_size):
        count[i] += count[i - 1]
    
    # Build output (reverse iteration for stability)
    output = [None] * len(arr)
    for i in range(len(arr) - 1, -1, -1):
        key = keys[i]
        shifted_key = key - min_val
        position = count[shifted_key] - 1
        output[position] = arr[i]
        count[shifted_key] -= 1
    
    return output


def counting_sort_characters(string):
    """
    Counting Sort for strings (sorts characters alphabetically).
    
    Time Complexity: O(n + 256) for ASCII
    Space Complexity: O(n + 256)
    
    Args:
        string: String to sort character-wise
    
    Returns:
        str: String with characters sorted
    
    Example:
        >>> counting_sort_characters("hello")
        'ehllo'
        >>> counting_sort_characters("sorting")
        'ginorst'
    """
    if not string:
        return ""
    
    # ASCII has 256 characters
    CHAR_RANGE = 256
    count = [0] * CHAR_RANGE
    
    # Count characters
    for char in string:
        count[ord(char)] += 1
    
    # Build sorted string
    result = []
    for char_code in range(CHAR_RANGE):
        result.extend([chr(char_code)] * count[char_code])
    
    return ''.join(result)


def counting_sort_with_satellite(arr, satellite):
    """
    Counting Sort with satellite data (sort arr, reorder satellite accordingly).
    
    Useful when you need to sort one array and apply the same
    permutation to another array (e.g., sorting keys with associated values).
    
    Time Complexity: O(n + k)
    Space Complexity: O(n + k)
    
    Args:
        arr: List of integer keys to sort by
        satellite: List of associated values (same length as arr)
    
    Returns:
        tuple: (sorted_arr, sorted_satellite)
    
    Example:
        >>> keys = [3, 1, 4, 1, 5]
        >>> values = ['c', 'a', 'd', 'b', 'e']
        >>> sorted_keys, sorted_values = counting_sort_with_satellite(keys, values)
        >>> sorted_keys
        [1, 1, 3, 4, 5]
        >>> sorted_values
        ['a', 'b', 'c', 'd', 'e']
    """
    if not arr:
        return [], []
    
    if len(arr) != len(satellite):
        raise ValueError("Arrays must have same length")
    
    min_val = min(arr)
    max_val = max(arr)
    range_size = max_val - min_val + 1
    
    count = [0] * range_size
    
    for key in arr:
        count[key - min_val] += 1
    
    for i in range(1, range_size):
        count[i] += count[i - 1]
    
    sorted_arr = [0] * len(arr)
    sorted_satellite = [None] * len(arr)
    
    for i in range(len(arr) - 1, -1, -1):
        key = arr[i]
        shifted_key = key - min_val
        position = count[shifted_key] - 1
        
        sorted_arr[position] = key
        sorted_satellite[position] = satellite[i]
        count[shifted_key] -= 1
    
    return sorted_arr, sorted_satellite


def counting_sort_digit(arr, exp):
    """
    Counting Sort for a specific digit (used in Radix Sort).
    
    Sorts array based on the digit at position exp
    (1s, 10s, 100s, etc.). This is the core subroutine
    of Radix Sort.
    
    Time Complexity: O(n + 10)
    Space Complexity: O(n)
    
    Args:
        arr: List of non-negative integers
        exp: Current digit position (1, 10, 100, ...)
    
    Returns:
        list: Array sorted by the digit at position exp
    
    Example:
        >>> arr = [170, 45, 75, 90, 802, 24, 2, 66]
        >>> counting_sort_digit(arr, 1)  # Sort by ones digit
        [170, 90, 802, 2, 24, 45, 75, 66]
    """
    n = len(arr)
    output = [0] * n
    count = [0] * 10  # Base 10 digits (0-9)
    
    # Count occurrences of each digit
    for num in arr:
        digit = (num // exp) % 10
        count[digit] += 1
    
    # Cumulative sum
    for i in range(1, 10):
        count[i] += count[i - 1]
    
    # Build output (reverse for stability)
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        position = count[digit] - 1
        output[position] = arr[i]
        count[digit] -= 1
    
    return output


def radix_sort(arr):
    """
    Radix Sort using Counting Sort as subroutine.
    
    Sorts integers by processing each digit from least
    significant to most significant using stable Counting Sort.
    
    Time Complexity: O(d * (n + 10)) where d is number of digits
    Space Complexity: O(n)
    
    Args:
        arr: List of non-negative integers
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [170, 45, 75, 90, 802, 24, 2, 66]
        >>> radix_sort(arr)
        [2, 24, 45, 66, 75, 90, 170, 802]
    """
    if not arr:
        return []
    
    # Find max to know number of digits
    max_val = max(arr)
    
    # Counting sort for each digit
    result = arr[:]
    exp = 1
    while max_val // exp > 0:
        result = counting_sort_digit(result, exp)
        exp *= 10
    
    return result