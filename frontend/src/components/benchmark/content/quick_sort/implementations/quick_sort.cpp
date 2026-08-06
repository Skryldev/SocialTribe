#include <vector>
#include <algorithm>

using namespace std;

class QuickSort {
private:
    int partition(vector<int>& arr, int low, int high) {
        int pivot = arr[high];
        int i = low - 1;
        
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(arr[i], arr[j]);
            }
        }
        swap(arr[i + 1], arr[high]);
        return i + 1;
    }

    int partition_random(vector<int>& arr, int low, int high) {
        int random_idx = low + rand() % (high - low + 1);
        swap(arr[random_idx], arr[high]);
        return partition(arr, low, high);
    }

    void quick_sort_recursive(vector<int>& arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quick_sort_recursive(arr, low, pi - 1);
            quick_sort_recursive(arr, pi + 1, high);
        }
    }

    void quick_sort_random_recursive(vector<int>& arr, int low, int high) {
        if (low < high) {
            int pi = partition_random(arr, low, high);
            quick_sort_random_recursive(arr, low, pi - 1);
            quick_sort_random_recursive(arr, pi + 1, high);
        }
    }

public:
    void sort(vector<int>& arr) {
        quick_sort_recursive(arr, 0, arr.size() - 1);
    }

    void sort_random(vector<int>& arr) {
        quick_sort_random_recursive(arr, 0, arr.size() - 1);
    }

    void sort_iterative(vector<int>& arr) {
        vector<pair<int, int>> stack;
        stack.push_back({0, (int)arr.size() - 1});
        
        while (!stack.empty()) {
            auto [low, high] = stack.back();
            stack.pop_back();
            
            if (low < high) {
                int pi = partition(arr, low, high);
                stack.push_back({low, pi - 1});
                stack.push_back({pi + 1, high});
            }
        }
    }

    void sort_three_way(vector<int>& arr) {
        three_way_partition(arr, 0, arr.size() - 1);
    }

    void three_way_partition(vector<int>& arr, int low, int high) {
        if (low >= high) return;
        
        int lt = low, gt = high;
        int pivot = arr[low];
        int i = low;
        
        while (i <= gt) {
            if (arr[i] < pivot) {
                swap(arr[lt], arr[i]);
                lt++;
                i++;
            } else if (arr[i] > pivot) {
                swap(arr[i], arr[gt]);
                gt--;
            } else {
                i++;
            }
        }
        
        three_way_partition(arr, low, lt - 1);
        three_way_partition(arr, gt + 1, high);
    }
};