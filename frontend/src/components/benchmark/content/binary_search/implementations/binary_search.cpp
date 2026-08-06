#include <vector>
#include <optional>

using namespace std;

class BinarySearch {
public:
    optional<int> search(const vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return nullopt;
    }
    
    optional<int> search_recursive(const vector<int>& arr, int target, int left, int right) {
        if (left > right) {
            return nullopt;
        }
        
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            return search_recursive(arr, target, mid + 1, right);
        } else {
            return search_recursive(arr, target, left, mid - 1);
        }
    }
    
    optional<int> search_first_occurrence(const vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        optional<int> result = nullopt;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) {
                result = mid;
                right = mid - 1;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return result;
    }
    
    optional<int> search_last_occurrence(const vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        optional<int> result = nullopt;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) {
                result = mid;
                left = mid + 1;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return result;
    }
    
    int search_insert(const vector<int>& arr, int target) {
        int left = 0, right = arr.size() - 1;
        
        while (left <= right) {
            int mid = left + (right - left) / 2;
            
            if (arr[mid] == target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        return left;
    }
};