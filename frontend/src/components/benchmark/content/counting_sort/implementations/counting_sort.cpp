#include <vector>
#include <algorithm>

using namespace std;

class CountingSort {
private:
    int find_max(const vector<int>& arr) {
        int max_val = arr[0];
        for (int val : arr) {
            if (val > max_val) max_val = val;
        }
        return max_val;
    }

    int find_min(const vector<int>& arr) {
        int min_val = arr[0];
        for (int val : arr) {
            if (val < min_val) min_val = val;
        }
        return min_val;
    }

public:
    void sort(vector<int>& arr) {
        if (arr.empty()) return;

        int max_val = find_max(arr);
        int min_val = find_min(arr);
        int range = max_val - min_val + 1;

        vector<int> count(range, 0);
        vector<int> output(arr.size());

        for (int val : arr) {
            count[val - min_val]++;
        }

        for (size_t i = 1; i < count.size(); i++) {
            count[i] += count[i - 1];
        }

        for (int i = arr.size() - 1; i >= 0; i--) {
            output[count[arr[i] - min_val] - 1] = arr[i];
            count[arr[i] - min_val]--;
        }

        for (size_t i = 0; i < arr.size(); i++) {
            arr[i] = output[i];
        }
    }

    void sort_stable(vector<int>& arr) {
        sort(arr);
    }

    void sort_descending(vector<int>& arr) {
        sort(arr);
        reverse(arr.begin(), arr.end());
    }
};