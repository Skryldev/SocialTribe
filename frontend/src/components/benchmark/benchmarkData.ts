export const benchmarkData = {
  // ==================== GRAPH TRAVERSAL ====================
  bfs: {
    small: { n: 100, time: 0.42, memory: 245, throughput: 238000 },
    medium: { n: 1000, time: 3.85, memory: 1840, throughput: 259000 },
    large: { n: 10000, time: 42.3, memory: 15200, throughput: 236000 },
  },
  dfs: {
    small: { n: 100, time: 0.38, memory: 198, throughput: 263000 },
    medium: { n: 1000, time: 3.52, memory: 1620, throughput: 284000 },
    large: { n: 10000, time: 38.7, memory: 13800, throughput: 258000 },
  },

  // ==================== SHORTEST PATH ====================
  dijkstra: {
    small: { n: 100, time: 0.95, memory: 520, throughput: 105000 },
    medium: { n: 1000, time: 11.2, memory: 4800, throughput: 89200 },
    large: { n: 10000, time: 145.8, memory: 42000, throughput: 68500 },
  },
  bellman_ford: {
    small: { n: 100, time: 1.85, memory: 380, throughput: 54000 },
    medium: { n: 1000, time: 24.6, memory: 3200, throughput: 40600 },
    large: { n: 10000, time: 310.5, memory: 28500, throughput: 32200 },
  },
  floyd_warshall: {
    small: { n: 100, time: 8.65, memory: 2340, throughput: 11500 },
    medium: { n: 1000, time: 1120.4, memory: 186500, throughput: 892 },
    large: { n: 10000, time: 124800, memory: 15200000, throughput: 80 },
  },
  johnson: {
    small: { n: 100, time: 2.45, memory: 890, throughput: 40800 },
    medium: { n: 1000, time: 32.8, memory: 8200, throughput: 30400 },
    large: { n: 10000, time: 425.6, memory: 78500, throughput: 23400 },
  },
  a_star: {
    small: { n: 100, time: 0.65, memory: 410, throughput: 153000 },
    medium: { n: 1000, time: 7.42, memory: 3850, throughput: 134000 },
    large: { n: 10000, time: 89.5, memory: 35200, throughput: 111000 },
  },

  // ==================== CENTRALITY METRICS ====================
  degree_centrality: {
    small: { n: 100, time: 0.12, memory: 85, throughput: 833000 },
    medium: { n: 1000, time: 1.15, memory: 640, throughput: 869000 },
    large: { n: 10000, time: 12.8, memory: 5200, throughput: 781000 },
  },
  betweenness_centrality: {
    small: { n: 100, time: 6.85, memory: 1850, throughput: 14600 },
    medium: { n: 1000, time: 745.2, memory: 145000, throughput: 1340 },
    large: { n: 10000, time: 89200, memory: 12400000, throughput: 112 },
  },
  closeness_centrality: {
    small: { n: 100, time: 4.25, memory: 1240, throughput: 23500 },
    medium: { n: 1000, time: 485.6, memory: 98500, throughput: 2060 },
    large: { n: 10000, time: 62450, memory: 8750000, throughput: 160 },
  },
  eigenvector_centrality: {
    small: { n: 100, time: 2.45, memory: 780, throughput: 40800 },
    medium: { n: 1000, time: 28.5, memory: 6800, throughput: 35000 },
    large: { n: 10000, time: 345.8, memory: 58500, throughput: 28900 },
  },
  harmonic_centrality: {
    small: { n: 100, time: 5.12, memory: 1480, throughput: 19500 },
    medium: { n: 1000, time: 568.4, memory: 112000, throughput: 1750 },
    large: { n: 10000, time: 71200, memory: 9200000, throughput: 140 },
  },

  // ==================== LINK PREDICTION ====================
  common_neighbors: {
    small: { n: 100, time: 0.28, memory: 165, throughput: 357000 },
    medium: { n: 1000, time: 2.85, memory: 1420, throughput: 350000 },
    large: { n: 10000, time: 31.2, memory: 12800, throughput: 320000 },
  },
  jaccard_similarity: {
    small: { n: 100, time: 0.35, memory: 195, throughput: 285000 },
    medium: { n: 1000, time: 3.65, memory: 1680, throughput: 273000 },
    large: { n: 10000, time: 40.8, memory: 15200, throughput: 245000 },
  },
  adamic_adar: {
    small: { n: 100, time: 0.56, memory: 310, throughput: 178000 },
    medium: { n: 1000, time: 5.42, memory: 2560, throughput: 184000 },
    large: { n: 10000, time: 58.7, memory: 21800, throughput: 170000 },
  },
  preferential_attachment: {
    small: { n: 100, time: 0.15, memory: 98, throughput: 666000 },
    medium: { n: 1000, time: 1.45, memory: 720, throughput: 689000 },
    large: { n: 10000, time: 15.8, memory: 6100, throughput: 632000 },
  },
  resource_allocation: {
    small: { n: 100, time: 0.62, memory: 345, throughput: 161000 },
    medium: { n: 1000, time: 6.85, memory: 2980, throughput: 145000 },
    large: { n: 10000, time: 75.4, memory: 25800, throughput: 132000 },
  },

  // ==================== SORTING ALGORITHMS ====================
  quick_sort: {
    small: { n: 100, time: 0.08, memory: 145, throughput: 1250000 },
    medium: { n: 1000, time: 0.95, memory: 980, throughput: 1052000 },
    large: { n: 10000, time: 11.2, memory: 8200, throughput: 892000 },
  },
  merge_sort: {
    small: { n: 100, time: 0.11, memory: 210, throughput: 909000 },
    medium: { n: 1000, time: 1.25, memory: 1650, throughput: 800000 },
    large: { n: 10000, time: 14.8, memory: 14200, throughput: 675000 },
  },
  counting_sort: {
    small: { n: 100, time: 0.05, memory: 165, throughput: 2000000 },
    medium: { n: 1000, time: 0.42, memory: 1200, throughput: 2380000 },
    large: { n: 10000, time: 4.85, memory: 9800, throughput: 2060000 },
  },
  radix_sort: {
    small: { n: 100, time: 0.07, memory: 185, throughput: 1428000 },
    medium: { n: 1000, time: 0.72, memory: 1450, throughput: 1388000 },
    large: { n: 10000, time: 8.45, memory: 11800, throughput: 1183000 },
  },

  // ==================== TREE & DATA STRUCTURES ====================
  binary_search: {
    small: { n: 100, time: 0.02, memory: 45, throughput: 5000000 },
    medium: { n: 1000, time: 0.04, memory: 52, throughput: 25000000 },
    large: { n: 10000, time: 0.06, memory: 58, throughput: 166000000 },
  },
  avl_tree: {
    small: { n: 100, time: 0.45, memory: 320, throughput: 222000 },
    medium: { n: 1000, time: 5.85, memory: 2850, throughput: 170000 },
    large: { n: 10000, time: 72.4, memory: 25800, throughput: 138000 },
  },
  red_black_tree: {
    small: { n: 100, time: 0.38, memory: 290, throughput: 263000 },
    medium: { n: 1000, time: 4.95, memory: 2580, throughput: 202000 },
    large: { n: 10000, time: 62.8, memory: 23200, throughput: 159000 },
  },
  segment_tree: {
    small: { n: 100, time: 0.18, memory: 285, throughput: 555000 },
    medium: { n: 1000, time: 2.15, memory: 2480, throughput: 465000 },
    large: { n: 10000, time: 25.8, memory: 22400, throughput: 387000 },
  },
  fenwick_tree: {
    small: { n: 100, time: 0.08, memory: 125, throughput: 1250000 },
    medium: { n: 1000, time: 0.85, memory: 890, throughput: 1176000 },
    large: { n: 10000, time: 9.45, memory: 7200, throughput: 1058000 },
  },
  union_find: {
    small: { n: 100, time: 0.06, memory: 95, throughput: 1666000 },
    medium: { n: 1000, time: 0.58, memory: 680, throughput: 1724000 },
    large: { n: 10000, time: 6.25, memory: 5800, throughput: 1600000 },
  },

  // ==================== COMMUNITY DETECTION ====================
  louvain: {
    small: { n: 100, time: 2.85, memory: 980, throughput: 35000 },
    medium: { n: 1000, time: 35.2, memory: 8900, throughput: 28400 },
    large: { n: 10000, time: 425.8, memory: 82000, throughput: 23400 },
  },
  leiden: {
    small: { n: 100, time: 2.45, memory: 850, throughput: 40800 },
    medium: { n: 1000, time: 28.5, memory: 7800, throughput: 35000 },
    large: { n: 10000, time: 345.2, memory: 72000, throughput: 28900 },
  },
  girvan_newman: {
    small: { n: 100, time: 12.45, memory: 2450, throughput: 8030 },
    medium: { n: 1000, time: 1680.5, memory: 185000, throughput: 595 },
    large: { n: 10000, time: 245000, memory: 16800000, throughput: 40 },
  },
  k_core_decomposition: {
    small: { n: 100, time: 0.45, memory: 210, throughput: 222000 },
    medium: { n: 1000, time: 4.85, memory: 1850, throughput: 206000 },
    large: { n: 10000, time: 52.4, memory: 16800, throughput: 190000 },
  },
  triangle_detection: {
    small: { n: 100, time: 0.72, memory: 380, throughput: 138000 },
    medium: { n: 1000, time: 8.45, memory: 3200, throughput: 118000 },
    large: { n: 10000, time: 95.8, memory: 28500, throughput: 104000 },
  },
  clustering_coefficient: {
    small: { n: 100, time: 0.85, memory: 420, throughput: 117000 },
    medium: { n: 1000, time: 9.85, memory: 3650, throughput: 101000 },
    large: { n: 10000, time: 112.5, memory: 32400, throughput: 88800 },
  },

  // ==================== PAGERANK ====================
  pagerank: {
    small: { n: 100, time: 1.85, memory: 620, throughput: 54000 },
    medium: { n: 1000, time: 22.4, memory: 5400, throughput: 44600 },
    large: { n: 10000, time: 268.5, memory: 48500, throughput: 37200 },
  },
};