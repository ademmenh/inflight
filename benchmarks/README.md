# Benchmarks

Benchmarks comparing request deduplication with and without `inflight` across PostgreSQL and Valkey (Redis-compatible).

---

## Experiment 1: Concurrency 100, Keys 10

**Setup:**

- Duration: 30s
- Cache TTL: 5s
- Concurrency: 100
- Unique keys: 10

| Metric        | With Inflight | Without Inflight |
| ------------- | ------------- | ---------------- |
| QPS           | ~1,130,360    | ~174,950         |
| Total queries | 33,911,000    | 5,248,600        |
| DB calls      | 60            | 517              |
| Cache calls   | 3,391,021     | 5,248,600        |

**Insights:**

- DB calls saved: **56x**
- Cache calls saved: **10x**
- Total queries growth: **6.5x** (5.2M → 33.9M)

---

## Experiment 2: Concurrency 10, Keys 10

**Setup:**

- Duration: 30s
- Cache TTL: 5s
- Concurrency: 10
- Unique keys: 10

| Metric        | With Inflight | Without Inflight |
| ------------- | ------------- | ---------------- |
| QPS           | ~3,253,170    | ~161,271         |
| Total queries | 97,596,000    | 4,839,000        |
| DB calls      | 300           | 16,638           |
| Cache calls   | 975,960       | 4,839,000        |

**Insights:**

- DB calls saved: **1119x**
- Cache calls saved: **100x**
- Total queries growth: **20x** (4.8M → 97.6M)

---

## Key Takeaways

- **Massive throughput growth**: With inflight, the system handles 6.5x-20x more total queries in the same time window because deduplication eliminates redundant wait time
- **Higher concurrency reduces DB pressure**: At concurrency 100, DB calls drop to just 60 vs 517 (56x saved), compared to concurrency 10 with 300 vs 16,638 (1119x saved)
- **Cache efficiency**: 10-100x fewer cache calls by deduplicating concurrent requests
