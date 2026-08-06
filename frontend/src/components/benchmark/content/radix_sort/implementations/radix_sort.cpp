#include <vector>
#include <algorithm>

using namespace std;

class RadixSort {
private:
    void counting_sort(vector<int>& arr, int exp) {
        int n = arr.size();
        vector<int> output(n);
        vector<int> count(10, 0);
        
        for (int i = 0; i < n; i++) {
            int index = (arr[i] / exp) % 10;
            count[index]++;
        }
        
        for (int i = 1; i < 10; i++) {
            count[i] += count[i - 1];
        }
        
        for (int i = n - 1; i >= 0; i--) {
            int index = (arr[i] / exp) % 10;
            output[count[index] - 1] = arr[i];
            count[index]--;
        }
        
        for (int i = 0; i < n; i++) {
            arr[i] = output[i];
        }
    }

public:
    void sort(vector<int>& arr) {
        if (arr.empty()) return;
        
        int max_val = *max_element(arr.begin(), arr.end());
        int exp = 1;
        
        while (max_val / exp > 0) {
            counting_sort(arr, exp);
            exp *= 10;
        }
    }
    
    void sort_negative(vector<int>& arr) {
        if (arr.empty()) return;
        
        vector<int> negatives, positives;
        
        for (int x : arr) {
            if (x < 0) negatives.push_back(-x);
            else positives.push_back(x);
        }
        
        sort(negatives);
        sort(positives);
        
        arr.clear();
        for (int i = negatives.size() - 1; i >= 0; i--) {
            arr.push_back(-negatives[i]);
        }
        arr.insert(arr.end(), positives.begin(), positives.end());
    }
};