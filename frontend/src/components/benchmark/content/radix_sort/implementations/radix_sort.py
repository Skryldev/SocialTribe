def counting_sort_for_radix(arr, exp, base=10):
    """
    Counting Sort subroutine for Radix Sort.
    
    Sorts array based on a specific digit determined by exp and base.
    This is the stable sorting primitive used by Radix Sort.
    
    Time Complexity: O(n + base)
    Space Complexity: O(n + base)
    
    Args:
        arr: List of integers
        exp: Current digit position (base^0, base^1, base^2, ...)
        base: Number base (default: 10 for decimal)
    
    Returns:
        list: Array sorted by the digit at position exp
    """
    n = len(arr)
    output = [0] * n
    count = [0] * base
    
    # Count occurrences of each digit
    for num in arr:
        digit = (num // exp) % base
        count[digit] += 1
    
    # Cumulative sum for stable placement
    for i in range(1, base):
        count[i] += count[i - 1]
    
    # Build output (reverse iteration for stability)
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % base
        position = count[digit] - 1
        output[position] = arr[i]
        count[digit] -= 1
    
    return output


def radix_sort_lsd(arr, base=10):
    """
    LSD (Least Significant Digit) Radix Sort.
    
    Sorts integers by repeatedly applying stable Counting Sort
    on each digit from least to most significant.
    
    Time Complexity: O(d * (n + base)) where d = number of digits
    Space Complexity: O(n + base)
    
    Args:
        arr: List of non-negative integers
        base: Number base for digit extraction (default: 10)
    
    Returns:
        list: Sorted list (new list, original unchanged)
    
    Example:
        >>> arr = [170, 45, 75, 90, 802, 24, 2, 66]
        >>> radix_sort_lsd(arr)
        [2, 24, 45, 66, 75, 90, 170, 802]
        >>> radix_sort_lsd(arr, base=256)  # Faster for large numbers
        [2, 24, 45, 66, 75, 90, 170, 802]
    """
    if not arr:
        return []
    
    # Find maximum to know number of digits
    max_val = max(arr)
    
    # Apply Counting Sort for each digit position
    result = arr[:]
    exp = 1
    
    while max_val // exp > 0:
        result = counting_sort_for_radix(result, exp, base)
        exp *= base
    
    return result


def radix_sort_lsd_inplace(arr, base=10):
    """
    In-place LSD Radix Sort (modifies original array).
    
    Time Complexity: O(d * (n + base))
    Space Complexity: O(n + base) for temporary arrays
    
    Args:
        arr: List of non-negative integers
        base: Number base
    
    Returns:
        list: Sorted list (in-place, reference returned for convenience)
    """
    if not arr:
        return arr
    
    max_val = max(arr)
    exp = 1
    
    while max_val // exp > 0:
        sorted_arr = counting_sort_for_radix(arr, exp, base)
        for i in range(len(arr)):
            arr[i] = sorted_arr[i]
        exp *= base
    
    return arr


def radix_sort_msd(arr, base=10):
    """
    MSD (Most Significant Digit) Radix Sort.
    
    Recursively sorts from most significant digit to least.
    Can be faster than LSD when data is well-distributed
    because it can stop early on small buckets.
    
    Time Complexity: O(d * (n + base)) worst case
    Space Complexity: O(n + d * base) for recursion
    
    Args:
        arr: List of non-negative integers
        base: Number base
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [170, 45, 75, 90, 802, 24, 2, 66]
        >>> radix_sort_msd(arr)
        [2, 24, 45, 66, 75, 90, 170, 802]
    """
    if not arr:
        return []
    
    max_val = max(arr)
    
    # Find most significant digit position
    max_exp = 1
    while max_val // (max_exp * base) > 0:
        max_exp *= base
    
    return _radix_sort_msd_recursive(arr, max_exp, base)


def _radix_sort_msd_recursive(arr, exp, base):
    """
    Recursive MSD Radix Sort helper.
    """
    if len(arr) <= 1 or exp == 0:
        return arr[:]
    
    # Create buckets for each digit
    buckets = [[] for _ in range(base)]
    
    for num in arr:
        digit = (num // exp) % base
        buckets[digit].append(num)
    
    # Recursively sort each non-empty bucket
    result = []
    next_exp = exp // base
    
    for bucket in buckets:
        if bucket:
            if next_exp > 0:
                result.extend(_radix_sort_msd_recursive(bucket, next_exp, base))
            else:
                result.extend(bucket)
    
    return result


def radix_sort_32bit(arr):
    """
    Optimized Radix Sort for 32-bit integers using base 256 (byte).
    
    Processes integers byte-by-byte (4 passes for 32-bit ints).
    Uses Counting Sort with base 256 for hardware-efficient access.
    
    Time Complexity: O(4 * (n + 256)) = O(n)
    Space Complexity: O(n + 256)
    
    Args:
        arr: List of 32-bit integers
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [1234567, 42, 999999, 1, 500000]
        >>> radix_sort_32bit(arr)
        [1, 42, 500000, 999999, 1234567]
    """
    if not arr:
        return []
    
    result = arr[:]
    n = len(result)
    
    # Process each byte (4 passes for 32-bit integers)
    for byte_pos in range(4):
        # Counting sort on current byte
        count = [0] * 256
        output = [0] * n
        
        shift = byte_pos * 8
        mask = 0xFF << shift
        
        # Count frequencies
        for num in result:
            byte_val = (num & mask) >> shift
            count[byte_val] += 1
        
        # Cumulative sum
        for i in range(1, 256):
            count[i] += count[i - 1]
        
        # Build output (stable)
        for i in range(n - 1, -1, -1):
            byte_val = (result[i] & mask) >> shift
            position = count[byte_val] - 1
            output[position] = result[i]
            count[byte_val] -= 1
        
        result = output
    
    return result


def radix_sort_64bit(arr):
    """
    Optimized Radix Sort for 64-bit integers using base 2¹⁶ (65536).
    
    Processes integers in 4 passes of 16 bits each.
    Larger base means fewer passes but more memory for counting array.
    
    Time Complexity: O(4 * (n + 65536)) = O(n)
    Space Complexity: O(n + 65536)
    
    Args:
        arr: List of 64-bit integers
    
    Returns:
        list: Sorted list
    """
    if not arr:
        return []
    
    BASE = 65536  # 2^16
    MASK = BASE - 1
    result = arr[:]
    n = len(result)
    
    for shift in range(0, 64, 16):
        count = [0] * BASE
        output = [0] * n
        
        # Count
        for num in result:
            digit = (num >> shift) & MASK
            count[digit] += 1
        
        # Cumulative sum
        for i in range(1, BASE):
            count[i] += count[i - 1]
        
        # Build output
        for i in range(n - 1, -1, -1):
            digit = (result[i] >> shift) & MASK
            position = count[digit] - 1
            output[position] = result[i]
            count[digit] -= 1
        
        result = output
    
    return result


def radix_sort_signed(arr):
    """
    Radix Sort for signed integers (including negative numbers).
    
    Handles sign by flipping the sign bit so that negative numbers
    map to smaller unsigned values, then flipping back after sorting.
    
    This works because of how two's complement representation
    orders negative numbers: -1 (all 1s) becomes largest unsigned.
    
    Time Complexity: O(d * (n + b))
    Space Complexity: O(n + b)
    
    Args:
        arr: List of signed integers
    
    Returns:
        list: Sorted list
    
    Example:
        >>> arr = [-5, 3, -2, 0, 7, -10, 4]
        >>> radix_sort_signed(arr)
        [-10, -5, -2, 0, 3, 4, 7]
    """
    if not arr:
        return []
    
    # Convert to unsigned by flipping sign bit
    # In two's complement: negate sign bit maps [-2^31, 2^31-1] to [0, 2^32-1]
    SIGN_BIT = 1 << 31
    
    unsigned_arr = [num ^ SIGN_BIT for num in arr]
    
    # Sort as unsigned 32-bit integers
    sorted_unsigned = radix_sort_32bit(unsigned_arr)
    
    # Convert back by flipping sign bit again
    return [num ^ SIGN_BIT for num in sorted_unsigned]


def radix_sort_strings(strings):
    """
    LSD Radix Sort for fixed-length strings.
    
    Sorts strings character by character from right to left.
    Assumes all strings have the same length.
    
    Time Complexity: O(L * (n + 256)) where L is string length
    Space Complexity: O(n + 256)
    
    Args:
        strings: List of strings of equal length
    
    Returns:
        list: Sorted list of strings
    
    Example:
        >>> strings = ["cat", "dog", "bat", "car", "bar"]
        >>> radix_sort_strings(strings)
        ['bar', 'bat', 'car', 'cat', 'dog']
    """
    if not strings:
        return []
    
    # Verify equal length
    length = len(strings[0])
    if not all(len(s) == length for s in strings):
        raise ValueError("All strings must have the same length")
    
    result = strings[:]
    
    # Process each character position from right to left
    for pos in range(length - 1, -1, -1):
        result = _counting_sort_chars(result, pos)
    
    return result


def _counting_sort_chars(strings, position):
    """
    Counting Sort for a specific character position.
    """
    n = len(strings)
    RADIX = 256  # ASCII range
    output = [""] * n
    count = [0] * RADIX
    
    # Count characters at position
    for s in strings:
        char_code = ord(s[position])
        count[char_code] += 1
    
    # Cumulative sum
    for i in range(1, RADIX):
        count[i] += count[i - 1]
    
    # Build output
    for i in range(n - 1, -1, -1):
        char_code = ord(strings[i][position])
        position_out = count[char_code] - 1
        output[position_out] = strings[i]
        count[char_code] -= 1
    
    return output