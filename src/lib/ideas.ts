export type Category = "basics" | "ds" | "graph" | "dp" | "math" | "string";
export type Idea = { slug: string; zh: string; en: string; cat: Category };

export const CATEGORIES: Category[] = ["basics", "ds", "graph", "dp", "math", "string"];

// The fixed taxonomy. Pack builder may only tag problems with these slugs.
export const IDEAS: Idea[] = [
  { slug: "prefix-sum", zh: "前缀和与差分", en: "Prefix sums & differences", cat: "basics" },
  { slug: "congruence", zh: "同余与取模", en: "Congruence & modulo", cat: "basics" },
  { slug: "two-pointers", zh: "双指针", en: "Two pointers", cat: "basics" },
  { slug: "binary-search", zh: "二分查找", en: "Binary search", cat: "basics" },
  { slug: "binary-answer", zh: "二分答案", en: "Binary search on answer", cat: "basics" },
  { slug: "greedy", zh: "贪心", en: "Greedy", cat: "basics" },
  { slug: "sorting", zh: "排序与离散化", en: "Sorting & compression", cat: "basics" },
  { slug: "enumeration", zh: "枚举与剪枝", en: "Enumeration & pruning", cat: "basics" },
  { slug: "simulation", zh: "模拟", en: "Simulation", cat: "basics" },
  { slug: "bit-ops", zh: "位运算", en: "Bit manipulation", cat: "basics" },
  { slug: "divide-conquer", zh: "递归与分治", en: "Recursion & divide and conquer", cat: "basics" },
  { slug: "monotonic-stack", zh: "单调栈", en: "Monotonic stack", cat: "ds" },
  { slug: "monotonic-queue", zh: "单调队列", en: "Monotonic queue", cat: "ds" },
  { slug: "heap", zh: "堆与优先队列", en: "Heap & priority queue", cat: "ds" },
  { slug: "dsu", zh: "并查集", en: "Disjoint set union", cat: "ds" },
  { slug: "fenwick", zh: "树状数组", en: "Fenwick tree", cat: "ds" },
  { slug: "segment-tree", zh: "线段树", en: "Segment tree", cat: "ds" },
  { slug: "sparse-table", zh: "ST 表", en: "Sparse table", cat: "ds" },
  { slug: "hashing", zh: "哈希表", en: "Hash tables", cat: "ds" },
  { slug: "trie", zh: "字典树", en: "Trie", cat: "ds" },
  { slug: "search", zh: "搜索 BFS/DFS", en: "BFS / DFS", cat: "graph" },
  { slug: "shortest-path", zh: "最短路", en: "Shortest paths", cat: "graph" },
  { slug: "mst", zh: "最小生成树", en: "Minimum spanning tree", cat: "graph" },
  { slug: "topo-sort", zh: "拓扑排序", en: "Topological sort", cat: "graph" },
  { slug: "lca", zh: "最近公共祖先", en: "Lowest common ancestor", cat: "graph" },
  { slug: "tree-diff", zh: "树上差分", en: "Differences on trees", cat: "graph" },
  { slug: "scc", zh: "强连通分量", en: "Strongly connected components", cat: "graph" },
  { slug: "bipartite", zh: "二分图", en: "Bipartite graphs", cat: "graph" },
  { slug: "linear-dp", zh: "线性 DP", en: "Linear DP", cat: "dp" },
  { slug: "knapsack", zh: "背包 DP", en: "Knapsack DP", cat: "dp" },
  { slug: "interval-dp", zh: "区间 DP", en: "Interval DP", cat: "dp" },
  { slug: "tree-dp", zh: "树形 DP", en: "Tree DP", cat: "dp" },
  { slug: "bitmask-dp", zh: "状压 DP", en: "Bitmask DP", cat: "dp" },
  { slug: "digit-dp", zh: "数位 DP", en: "Digit DP", cat: "dp" },
  { slug: "dp-optimization", zh: "DP 优化", en: "DP optimization", cat: "dp" },
  { slug: "primes", zh: "质数与筛法", en: "Primes & sieves", cat: "math" },
  { slug: "gcd", zh: "最大公约数", en: "GCD & Euclid", cat: "math" },
  { slug: "fast-pow", zh: "快速幂与逆元", en: "Fast power & inverses", cat: "math" },
  { slug: "combinatorics", zh: "组合计数", en: "Combinatorics", cat: "math" },
  { slug: "matrix", zh: "矩阵快速幂", en: "Matrix exponentiation", cat: "math" },
  { slug: "kmp", zh: "KMP", en: "KMP", cat: "string" },
  { slug: "string-hash", zh: "字符串哈希", en: "String hashing", cat: "string" },
];

export const IDEA_BY_SLUG = new Map(IDEAS.map((i) => [i.slug, i]));
export const ideaName = (slug: string, lang: "zh" | "en") => IDEA_BY_SLUG.get(slug)?.[lang] ?? slug;
