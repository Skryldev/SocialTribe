#include <vector>

using namespace std;

class MergeSort {
private:
    void merge(vector<int>& arr, int left, int mid, int right) {
        int n1 = mid - left + 1;
        int n2 = right - mid;
        
        vector<int> L(n1), R(n2);
        
        for (int i = 0; i < n1; i++) {
            L[i] = arr[left + i];
        }
        for (int j = 0; j < n2; j++) {
            R[j] = arr[mid + 1 + j];
        }
        
        int i = 0, j = 0, k = left;
        
        while (i < n1 && j < n2) {
            if (L[i] <= R[j]) {
                arr[k] = L[i];
                i++;
            } else {
                arr[k] = R[j];
                j++;
            }
            k++;
        }
        
        while (i < n1) {
            arr[k] = L[i];
            i++;
            k++;
        }
        
        while (j < n2) {
            arr[k] = R[j];
            j++;
            k++;
        }
    }

    void merge_sort_recursive(vector<int>& arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            merge_sort_recursive(arr, left, mid);
            merge_sort_recursive(arr, mid + 1, right);
            merge(arr, left, mid, right);
        }
    }

public:
    void sort(vector<int>& arr) {
        merge_sort_recursive(arr, 0, arr.size() - 1);
    }

    void sort_iterative(vector<int>& arr) {
        int n = arr.size();
        
        for (int size = 1; size < n; size *= 2) {
            for (int left = 0; left < n - size; left += 2 * size) {
                int mid = left + size - 1;
                int right = min(left + 2 * size - 1, n - 1);
                merge(arr, left, mid, right);
            }
        }
    }

    void sort_in_place(vector<int>& arr) {
        merge_sort_in_place(arr, 0, arr.size() - 1);
    }

    void merge_sort_in_place(vector<int>& arr, int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            merge_sort_in_place(arr, left, mid);
            merge_sort_in_place(arr, mid + 1, right);
            merge_in_place(arr, left, mid, right);
        }
    }

    void merge_in_place(vector<int>& arr, int left, int mid, int right) {
        int i = left;
        int j = mid + 1;
        
        while (i <= mid && j <= right) {
            if (arr[i] <= arr[j]) {
                i++;
            } else {
                int temp = arr[j];
                for (int k = j; k > i; k--) {
                    arr[k] = arr[k - 1];
                }
                arr[i] = temp;
                i++;
                mid++;
                j++;
            }
        }
    }
};