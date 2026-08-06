# Theory

Radix Sort is a non-comparison sorting algorithm that sorts integers by processing individual digits. First used in the 1880s by Herman Hollerith for the U.S. Census tabulating machines (punch card sorting), it's one of the oldest sorting algorithms still in widespread use. The name "radix" comes from the Latin word for "root," referring to the base of the number system.

## Key Concepts

- **Digit-by-Digit Sorting**: Sorts numbers one digit position at a time
- **LSD (Least Significant Digit)**: Processes from rightmost digit to leftmost
- **MSD (Most Significant Digit)**: Processes from leftmost digit to rightmost
- **Stable Sub-sort**: Each digit pass must be stable to preserve previous ordering
- **Base (Radix)**: The number system base (10 for decimal, 256 for byte)
- **Linear Time**: Achieves O(n) when number of digits is constant
- **No Comparisons**: Never compares two elements directly
