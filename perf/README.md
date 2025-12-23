# K6 Performance Testing Guide

Complete guide to understanding and writing effective performance tests with k6.

## Table of Contents

1. [Tag-Based Thresholds Explained](#tag-based-thresholds-explained)
2. [K6 Metrics Reference](#k6-metrics-reference)
3. [Threshold Operators](#threshold-operators)
4. [Scenarios & Executors](#scenarios--executors)
5. [Checks vs Thresholds](#checks-vs-thresholds)
6. [Advanced Tagging Patterns](#advanced-tagging-patterns)
7. [Performance Testing Concepts](#performance-testing-concepts)
8. [Common Patterns & Examples](#common-patterns--examples)

---

## Tag-Based Thresholds Explained

### What Are Tag-Based Thresholds?

Tag-based thresholds are k6's built-in filtering mechanism that allows you to apply performance requirements to **specific subsets** of requests instead of all requests globally.

### Syntax Breakdown

```json
"http_req_failed{expected_response:true}": ["rate==0"]
```

**Components:**

1. **Metric name**: `http_req_failed`
   - Built-in k6 metric tracking failed HTTP requests
   - Considers non-2xx/3xx status codes as failures

2. **Tag filter**: `{expected_response:true}`
   - Curly braces `{}` contain tag filters
   - Format: `{tag_name:tag_value}`
   - Filters metric to only include requests with matching tags

3. **Threshold condition**: `["rate==0"]`
   - Array of conditions to evaluate
   - `rate` = failure rate (0.0 to 1.0)
   - `==0` = must equal zero (0% failures)

### How Tags Work

When you make an HTTP request:

```javascript
const response = http.get('http://api.example.com/users', {
  tags: { 
    endpoint: 'users',
    expected_response: 'true',
    api_version: 'v2'
  }
});
```

k6 **automatically attaches these tags** to all metrics for that request:
- `http_req_failed`
- `http_req_duration`
- `http_req_blocked`
- `http_req_connecting`
- `http_req_sending`
- `http_req_waiting`
- `http_req_receiving`
- `http_reqs` (counter)

### Tag Filtering Logic

Think of tag filters like SQL WHERE clauses:

```sql
-- No filter: all requests
SELECT AVG(duration) FROM requests;

-- Single tag filter
SELECT AVG(duration) FROM requests WHERE endpoint = 'users';

-- Multiple tag filters (AND logic)
SELECT AVG(duration) FROM requests 
WHERE endpoint = 'users' AND expected_response = 'true';
```

In k6:

```json
{
  // All requests
  "http_req_duration": ["p(95)<500"],
  
  // Only 'users' endpoint
  "http_req_duration{endpoint:users}": ["p(95)<300"],
  
  // 'users' endpoint AND expected successes
  "http_req_duration{endpoint:users,expected_response:true}": ["p(95)<250"]
}
```

### Why Use Tag-Based Thresholds?

#### Problem: Global Thresholds Are Too Broad

```javascript
// Test script
export default function () {
  http.get('/api/pokemon/1');        // Should succeed (200)
  http.get('/api/pokemon/99999');    // Should fail (404)
}
```

```json
// Without tags
{
  "thresholds": {
    "http_req_failed": ["rate==0"]  // ❌ FAILS: 50% failure rate
  }
}
```

The intentional 404 test breaks the threshold!

#### Solution: Tag Expected vs Unexpected Failures

```javascript
// Test script with tags
export default function () {
  http.get('/api/pokemon/1', {
    tags: { expected_response: 'true' }
  });
  
  http.get('/api/pokemon/99999', {
    tags: { expected_response: 'false' }  // Mark as intentional failure
  });
}
```

```json
// With tag filtering
{
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"]  // ✅ PASSES: 0% failure rate
  }
}
```

Now only the first request is evaluated against the threshold.

### Multiple Tag Filters (AND Logic)

Combine multiple tags with commas:

```json
"http_req_duration{endpoint:search,method:POST,expected_response:true}": ["p(95)<800"]
```

This applies to requests where **ALL** of these are true:
- `endpoint` = `'search'`
- `method` = `'POST'`
- `expected_response` = `'true'`

### Tag Naming Conventions

**Use descriptive, consistent names:**

```javascript
// ✅ Good
tags: { endpoint: 'list', expected_response: 'true', cache: 'miss' }

// ❌ Bad
tags: { e: 'list', ok: '1', c: 'no' }
```

**Common tag patterns:**
- `endpoint`: API endpoint type (`'list'`, `'details'`, `'search'`)
- `expected_response`: Whether success is expected (`'true'`, `'false'`)
- `method`: HTTP method (`'GET'`, `'POST'`, `'PUT'`)
- `api_version`: API version (`'v1'`, `'v2'`)
- `user_type`: User role (`'admin'`, `'user'`, `'guest'`)
- `cache`: Cache status (`'hit'`, `'miss'`)
- `region`: Geographic region (`'us-east'`, `'eu-west'`)

---

## K6 Metrics Reference

### Built-in HTTP Metrics

#### `http_req_duration`
**Total request time** (sending + waiting + receiving)

```json
"http_req_duration": ["avg<200", "p(95)<500", "p(99)<1000", "max<2000"]
```

**Use for:** Overall response time SLAs

---

#### `http_req_failed`
**Rate of failed requests** (non-2xx/3xx status codes)

```json
"http_req_failed": ["rate<0.01"]  // Allow 1% failures
```

**Use for:** Availability/reliability requirements

---

#### `http_req_blocked`
**Time spent blocked** (waiting for a free TCP connection slot)

```json
"http_req_blocked": ["avg<10"]
```

**Use for:** Detecting connection pool exhaustion

---

#### `http_req_connecting`
**Time spent establishing TCP connection**

```json
"http_req_connecting": ["avg<50", "p(95)<100"]
```

**Use for:** Network latency issues

---

#### `http_req_tls_handshaking`
**Time spent in TLS handshake**

```json
"http_req_tls_handshaking": ["avg<100", "p(95)<200"]
```

**Use for:** SSL/TLS performance

---

#### `http_req_sending`
**Time spent sending request data**

```json
"http_req_sending": ["avg<5"]
```

**Use for:** Upload performance (large POST/PUT bodies)

---

#### `http_req_waiting`
**Time to first byte (TTFB)** - server processing time

```json
"http_req_waiting": ["avg<150", "p(95)<300"]
```

**Use for:** Backend performance (excludes network overhead)

---

#### `http_req_receiving`
**Time spent receiving response data**

```json
"http_req_receiving": ["avg<10", "p(95)<50"]
```

**Use for:** Download performance (large responses)

---

#### `http_reqs`
**Total number of HTTP requests**

```json
"http_reqs": ["count>1000"]  // Must make at least 1000 requests
```

**Use for:** Ensuring test ran long enough

---

### Custom Metrics

Create your own metrics:

```javascript
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Counter: cumulative sum
const errorCounter = new Counter('custom_errors');

// Trend: statistical analysis (avg, min, max, percentiles)
const customDuration = new Trend('custom_duration');

// Rate: percentage (0.0 to 1.0)
const successRate = new Rate('custom_success_rate');

// Gauge: latest value
const activeUsers = new Gauge('custom_active_users');

export default function () {
  const start = Date.now();
  const response = http.get('http://api.example.com');
  const duration = Date.now() - start;
  
  // Record custom metrics
  customDuration.add(duration);
  successRate.add(response.status === 200);
  errorCounter.add(response.status >= 400 ? 1 : 0);
  activeUsers.add(__VU);  // Current VU count
}
```

**Apply thresholds to custom metrics:**

```json
{
  "thresholds": {
    "custom_duration": ["p(95)<500"],
    "custom_success_rate": ["rate>0.99"],
    "custom_errors": ["count<10"]
  }
}
```

---

## Threshold Operators

### Statistical Operators

#### `avg` - Average (mean)
```json
"http_req_duration": ["avg<200"]
```

#### `min` - Minimum value
```json
"http_req_duration": ["min>10"]  // Sanity check: no instant responses
```

#### `max` - Maximum value
```json
"http_req_duration": ["max<5000"]  // No request > 5s
```

#### `med` - Median (50th percentile)
```json
"http_req_duration": ["med<150"]
```

#### `p(N)` - Nth percentile
```json
"http_req_duration": [
  "p(90)<300",   // 90% of requests < 300ms
  "p(95)<500",   // 95% of requests < 500ms
  "p(99)<1000"   // 99% of requests < 1s
]
```

**Common percentiles:**
- `p(50)` = median (half faster, half slower)
- `p(90)` = 90% of users experience this or better
- `p(95)` = typical SLA target
- `p(99)` = worst-case for most users
- `p(99.9)` = tail latency (rare but important)

---

### Comparison Operators

#### `==` - Equals
```json
"http_req_failed": ["rate==0"]  // Zero failures
```

#### `!=` - Not equals
```json
"http_reqs": ["count!=0"]  // At least one request made
```

#### `<` - Less than
```json
"http_req_duration": ["p(95)<500"]
```

#### `<=` - Less than or equal
```json
"http_req_failed": ["rate<=0.01"]  // Max 1% failures
```

#### `>` - Greater than
```json
"http_reqs": ["count>100"]  // At least 100 requests
```

#### `>=` - Greater than or equal
```json
"http_req_duration": ["min>=10"]  // No instant responses
```

---

### Rate Operator

For `Rate` metrics and `http_req_failed`:

```json
"http_req_failed": ["rate<0.05"]  // Less than 5% failures
```

**Rate values:**
- `0.0` = 0%
- `0.01` = 1%
- `0.1` = 10%
- `1.0` = 100%

---

### Count Operator

For `Counter` metrics and `http_reqs`:

```json
"http_reqs": ["count>=1000"]  // At least 1000 requests
```

---

### Multiple Conditions (AND Logic)

All conditions must pass:

```json
"http_req_duration": [
  "avg<200",      // AND
  "p(95)<500",    // AND
  "p(99)<1000",   // AND
  "max<5000"      // All must be true
]
```

---

## Scenarios & Executors

### What Are Scenarios?

Scenarios define **how VUs (Virtual Users) execute your test**. Each scenario has an executor that controls:
- How many VUs run
- For how long
- How requests are distributed

### Executor Types

#### `per-vu-iterations`
**Each VU runs a fixed number of iterations**

```json
{
  "scenarios": {
    "smoke": {
      "executor": "per-vu-iterations",
      "vus": 1,
      "iterations": 5
    }
  }
}
```

**Use for:**
- Smoke tests (quick sanity checks)
- Statelessness validation (same VU, multiple runs)

**Behavior:**
- 1 VU × 5 iterations = 5 total test runs
- 10 VUs × 5 iterations = 50 total test runs

---

#### `constant-vus`
**Fixed number of VUs for a duration**

```json
{
  "scenarios": {
    "steady": {
      "executor": "constant-vus",
      "vus": 10,
      "duration": "30s"
    }
  }
}
```

**Use for:**
- Sustained load tests
- Baseline performance measurement

**Behavior:**
- 10 VUs run continuously for 30 seconds
- Each VU loops through test function as fast as possible

---

#### `ramping-vus`
**Gradually increase/decrease VUs over time**

```json
{
  "scenarios": {
    "load": {
      "executor": "ramping-vus",
      "startVUs": 0,
      "stages": [
        { "duration": "30s", "target": 10 },   // Ramp up to 10 VUs
        { "duration": "1m", "target": 10 },    // Stay at 10 VUs
        { "duration": "30s", "target": 0 }     // Ramp down to 0
      ],
      "gracefulRampDown": "10s"
    }
  }
}
```

**Use for:**
- Load tests (realistic traffic patterns)
- Finding breaking points
- Avoiding thundering herd

**Behavior:**
- Smooth ramp-up prevents sudden spikes
- Sustained period observes steady-state performance
- Graceful ramp-down allows in-flight requests to complete

---

#### `constant-arrival-rate`
**Fixed number of iterations per second**

```json
{
  "scenarios": {
    "constant_rate": {
      "executor": "constant-arrival-rate",
      "rate": 100,              // 100 iterations/second
      "timeUnit": "1s",
      "duration": "1m",
      "preAllocatedVUs": 50,    // Start with 50 VUs
      "maxVUs": 200             // Scale up to 200 if needed
    }
  }
}
```

**Use for:**
- Throughput testing (requests per second)
- Simulating constant traffic rate
- API rate limit testing

**Behavior:**
- k6 maintains exactly 100 iterations/second
- Automatically scales VUs to maintain rate
- More realistic than constant-vus (real traffic has consistent rate, not consistent users)

---

#### `ramping-arrival-rate`
**Gradually increase/decrease iterations per second**

```json
{
  "scenarios": {
    "ramping_rate": {
      "executor": "ramping-arrival-rate",
      "startRate": 10,
      "timeUnit": "1s",
      "preAllocatedVUs": 20,
      "maxVUs": 100,
      "stages": [
        { "duration": "30s", "target": 50 },   // Ramp to 50 iter/s
        { "duration": "1m", "target": 50 },    // Stay at 50 iter/s
        { "duration": "30s", "target": 0 }     // Ramp down
      ]
    }
  }
}
```

**Use for:**
- Stress testing (find max throughput)
- Gradual load increase
- Realistic traffic growth patterns

---

### Multiple Scenarios

Run different test patterns simultaneously:

```json
{
  "scenarios": {
    "browse": {
      "executor": "constant-vus",
      "vus": 50,
      "duration": "5m",
      "exec": "browseProducts"
    },
    "purchase": {
      "executor": "constant-arrival-rate",
      "rate": 10,
      "timeUnit": "1s",
      "duration": "5m",
      "preAllocatedVUs": 10,
      "exec": "makePurchase"
    },
    "admin": {
      "executor": "constant-vus",
      "vus": 2,
      "duration": "5m",
      "exec": "adminTasks"
    }
  }
}
```

```javascript
// Different functions for different scenarios
export function browseProducts() {
  http.get('/api/products');
}

export function makePurchase() {
  http.post('/api/orders', JSON.stringify({ product: 123 }));
}

export function adminTasks() {
  http.get('/api/admin/stats');
}
```

---

## Checks vs Thresholds

### Checks (Runtime Assertions)

**Checks** validate response correctness **during** test execution:

```javascript
import { check } from 'k6';

const response = http.get('http://api.example.com/users');

check(response, {
  'status is 200': (r) => r.status === 200,
  'has users array': (r) => Array.isArray(r.json().users),
  'response time < 500ms': (r) => r.timings.duration < 500,
});
```

**Characteristics:**
- ✅ Run during test execution
- ✅ Logged in real-time
- ✅ Don't stop test on failure
- ❌ Don't fail the test (just log failures)
- ❌ Can't use percentiles (per-request only)

**Use for:**
- Validating response structure
- Checking business logic
- Debugging during development

---

### Thresholds (Pass/Fail Criteria)

**Thresholds** define **pass/fail criteria** evaluated **after** test execution:

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.01"],
    "checks": ["rate>0.95"]  // 95% of checks must pass
  }
}
```

**Characteristics:**
- ✅ Evaluated after test completes
- ✅ Fail the entire test if violated
- ✅ Support statistical analysis (percentiles, averages)
- ✅ Can abort test early if threshold crossed
- ❌ Don't provide per-request feedback

**Use for:**
- SLA enforcement
- CI/CD gates
- Performance regression detection

---

### Using Both Together

```javascript
import { check } from 'k6';

export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'checks': ['rate>0.99']  // 99% of checks must pass
  }
};

export default function () {
  const response = http.get('http://api.example.com/users');
  
  // Check validates correctness (runtime)
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has users': (r) => r.json().users.length > 0,
  });
  
  // Threshold validates performance (after test)
  // No code needed - automatically tracked
}
```

**Result:**
- If 99% of checks pass AND p95 < 500ms → ✅ Test passes
- If checks fail OR p95 > 500ms → ❌ Test fails

---

## Advanced Tagging Patterns

### Pattern 1: Endpoint-Based Performance Budgets

```javascript
const endpoints = {
  list: { url: '/api/pokemon', budget: 300 },
  details: { url: '/api/pokemon/1', budget: 500 },
  search: { url: '/api/search/pokemon?q=pika', budget: 800 },
};

export default function () {
  Object.entries(endpoints).forEach(([name, config]) => {
    http.get(`${BASE_URL}${config.url}`, {
      tags: { endpoint: name }
    });
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    "http_req_duration{endpoint:search}": ["p(95)<800"]
  }
}
```

---

### Pattern 2: User Journey Tagging

```javascript
export default function () {
  // Journey: Browse → View → Add to Cart → Checkout
  
  http.get('/api/products', {
    tags: { journey: 'browse', step: '1' }
  });
  sleep(1);
  
  http.get('/api/products/123', {
    tags: { journey: 'browse', step: '2' }
  });
  sleep(2);
  
  http.post('/api/cart', payload, {
    tags: { journey: 'purchase', step: '3' }
  });
  sleep(1);
  
  http.post('/api/checkout', payload, {
    tags: { journey: 'purchase', step: '4' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{journey:browse}": ["p(95)<500"],
    "http_req_duration{journey:purchase}": ["p(95)<1000"],
    "http_req_failed{journey:purchase}": ["rate==0"]  // Zero tolerance for checkout failures
  }
}
```

---

### Pattern 3: Cache Performance Tracking

```javascript
export default function () {
  // First request (cache miss)
  http.get('/api/pokemon/1', {
    tags: { endpoint: 'details', cache: 'miss' }
  });
  
  // Second request (cache hit)
  http.get('/api/pokemon/1', {
    tags: { endpoint: 'details', cache: 'hit' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{cache:miss}": ["p(95)<500"],
    "http_req_duration{cache:hit}": ["p(95)<50"]  // Much faster with cache
  }
}
```

---

### Pattern 4: API Version Comparison

```javascript
export default function () {
  http.get('/api/v1/users', {
    tags: { api_version: 'v1' }
  });
  
  http.get('/api/v2/users', {
    tags: { api_version: 'v2' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{api_version:v1}": ["p(95)<600"],
    "http_req_duration{api_version:v2}": ["p(95)<400"]  // v2 should be faster
  }
}
```

---

### Pattern 5: Geographic Region Testing

```javascript
const regions = ['us-east', 'eu-west', 'ap-south'];

export default function () {
  const region = regions[__VU % regions.length];
  
  http.get(`https://${region}.api.example.com/data`, {
    tags: { region: region }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{region:us-east}": ["p(95)<200"],
    "http_req_duration{region:eu-west}": ["p(95)<300"],
    "http_req_duration{region:ap-south}": ["p(95)<400"]
  }
}
```

---

## Performance Testing Concepts

### Test Types

#### Smoke Test
**Quick sanity check** (1 VU, few iterations)

```json
{
  "executor": "per-vu-iterations",
  "vus": 1,
  "iterations": 5
}
```

**Purpose:**
- Verify test script works
- Catch obvious bugs
- Fast CI gate (< 30s)

---

#### Load Test
**Realistic sustained traffic**

```json
{
  "executor": "ramping-vus",
  "stages": [
    { "duration": "1m", "target": 50 },
    { "duration": "5m", "target": 50 },
    { "duration": "1m", "target": 0 }
  ]
}
```

**Purpose:**
- Measure performance under expected load
- Validate SLAs
- Find bottlenecks

---

#### Stress Test
**Push beyond normal capacity**

```json
{
  "executor": "ramping-vus",
  "stages": [
    { "duration": "2m", "target": 100 },
    { "duration": "5m", "target": 100 },
    { "duration": "2m", "target": 200 },
    { "duration": "5m", "target": 200 },
    { "duration": "2m", "target": 0 }
  ]
}
```

**Purpose:**
- Find breaking point
- Test auto-scaling
- Identify resource limits

---

#### Spike Test
**Sudden traffic surge**

```json
{
  "executor": "ramping-vus",
  "stages": [
    { "duration": "10s", "target": 100 },  // Sudden spike
    { "duration": "1m", "target": 100 },
    { "duration": "10s", "target": 0 }
  ]
}
```

**Purpose:**
- Test auto-scaling responsiveness
- Validate rate limiting
- Simulate viral events

---

#### Soak Test
**Long-duration stability test**

```json
{
  "executor": "constant-vus",
  "vus": 50,
  "duration": "4h"
}
```

**Purpose:**
- Find memory leaks
- Detect resource exhaustion
- Validate long-term stability

---

### Performance Metrics Explained

#### Latency vs Throughput

**Latency:** How long one request takes
```json
"http_req_duration": ["p(95)<500"]
```

**Throughput:** How many requests per second
```json
"http_reqs": ["rate>100"]  // 100 requests/second
```

**Trade-off:** Higher throughput often increases latency

---

#### Percentiles Explained

**Why percentiles matter more than averages:**

Example response times (ms):
```
[10, 15, 20, 25, 30, 35, 40, 45, 50, 5000]
```

- **Average:** 527ms (misleading!)
- **Median (p50):** 32.5ms (typical user)
- **p95:** 5000ms (worst 5% of users)

**The outlier (5000ms) ruins the average but is clearly visible in p95.**

**Common percentile targets:**
- `p(50)` - Median user experience
- `p(90)` - Good user experience
- `p(95)` - Standard SLA target
- `p(99)` - Premium SLA target
- `p(99.9)` - Tail latency (important for high-traffic sites)

---

#### Time to First Byte (TTFB)

**`http_req_waiting`** measures server processing time:

```json
"http_req_waiting": ["p(95)<200"]
```

**Breakdown:**
- `http_req_sending` - Upload time
- `http_req_waiting` - **Server processing** ← This is TTFB
- `http_req_receiving` - Download time

**Use TTFB to:**
- Isolate backend performance
- Exclude network latency
- Compare server implementations

---

### Think Time

**Simulate realistic user behavior** by adding pauses:

```javascript
import { sleep } from 'k6';

export default function () {
  http.get('/api/products');
  sleep(2);  // User reads product list for 2 seconds
  
  http.get('/api/products/123');
  sleep(5);  // User reads product details for 5 seconds
  
  http.post('/api/cart', payload);
  sleep(1);  // User confirms cart
}
```

**Why think time matters:**
- Without: Unrealistic hammering (100 req/s from 1 user)
- With: Realistic traffic (1 req/5s from 1 user)

**Randomized think time:**

```javascript
function thinkTime(min = 0.5, max = 3) {
  return min + Math.random() * (max - min);
}

export default function () {
  http.get('/api/products');
  sleep(thinkTime());  // Random 0.5-3 seconds
}
```

---

## Common Patterns & Examples

### Pattern: Weighted User Journeys

Simulate realistic traffic distribution:

```javascript
export default function () {
  const rand = Math.random();
  
  if (rand < 0.6) {
    // 60% browse only
    http.get('/api/products', {
      tags: { journey: 'browse' }
    });
  } else if (rand < 0.85) {
    // 25% browse + view details
    http.get('/api/products', {
      tags: { journey: 'browse' }
    });
    sleep(1);
    http.get('/api/products/123', {
      tags: { journey: 'view' }
    });
  } else {
    // 15% full purchase flow
    http.get('/api/products', {
      tags: { journey: 'browse' }
    });
    sleep(1);
    http.get('/api/products/123', {
      tags: { journey: 'view' }
    });
    sleep(2);
    http.post('/api/cart', payload, {
      tags: { journey: 'purchase' }
    });
    sleep(1);
    http.post('/api/checkout', payload, {
      tags: { journey: 'purchase' }
    });
  }
}
```

---

### Pattern: Data-Driven Testing

Load test data from file:

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const testData = new SharedArray('users', function () {
  return papaparse.parse(open('./users.csv'), { header: true }).data;
});

export default function () {
  const user = testData[__VU % testData.length];
  
  http.post('/api/login', JSON.stringify({
    username: user.username,
    password: user.password
  }), {
    tags: { user_type: user.role }
  });
}
```

---

### Pattern: Conditional Thresholds

Abort test early if threshold crossed:

```json
{
  "thresholds": {
    "http_req_failed": [
      { "threshold": "rate<0.1", "abortOnFail": true }
    ],
    "http_req_duration": [
      { "threshold": "p(95)<500", "abortOnFail": false }
    ]
  }
}
```

**Behavior:**
- If failure rate > 10% → Abort immediately (no point continuing)
- If p95 > 500ms → Continue test but mark as failed

---

### Pattern: Environment-Specific Configs

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DURATION = __ENV.DURATION || '30s';
const VUS = __ENV.VUS || 10;

export const options = {
  scenarios: {
    load: {
      executor: 'constant-vus',
      vus: parseInt(VUS),
      duration: DURATION,
    }
  }
};

export default function () {
  http.get(`${BASE_URL}/api/data`);
}
```

**Run with environment variables:**

```bash
# Local testing
k6 run script.js

# Staging
k6 run -e BASE_URL=https://staging.api.com -e VUS=50 script.js

# Production
k6 run -e BASE_URL=https://api.com -e VUS=100 -e DURATION=5m script.js
```

---

### Pattern: Custom Metrics for Business Logic

```javascript
import { Trend, Rate } from 'k6/metrics';

const checkoutDuration = new Trend('checkout_duration');
const paymentSuccess = new Rate('payment_success');

export const options = {
  thresholds: {
    'checkout_duration': ['p(95)<3000'],  // Checkout must complete in 3s
    'payment_success': ['rate>0.99']      // 99% payment success rate
  }
};

export default function () {
  const start = Date.now();
  
  const response = http.post('/api/checkout', payload);
  
  const duration = Date.now() - start;
  checkoutDuration.add(duration);
  
  const success = response.status === 200 && response.json().payment_status === 'success';
  paymentSuccess.add(success);
}
```

---

## Quick Reference

### Essential Threshold Examples

```json
{
  "thresholds": {
    // Availability
    "http_req_failed": ["rate<0.01"],
    
    // Latency
    "http_req_duration": ["p(95)<500", "p(99)<1000"],
    
    // Per-endpoint latency
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    
    // Server processing time
    "http_req_waiting": ["p(95)<200"],
    
    // Throughput
    "http_reqs": ["rate>100"],
    
    // Check success rate
    "checks": ["rate>0.95"]
  }
}
```

---

### Essential Tags

```javascript
http.get(url, {
  tags: {
    endpoint: 'list',              // Endpoint type
    expected_response: 'true',     // Expected success/failure
    method: 'GET',                 // HTTP method
    api_version: 'v2',             // API version
    user_type: 'authenticated',    // User role
    cache: 'miss',                 // Cache status
    region: 'us-east'              // Geographic region
  }
});
```

---

### Test Type Templates

**Smoke:**
```json
{ "executor": "per-vu-iterations", "vus": 1, "iterations": 5 }
```

**Load:**
```json
{
  "executor": "ramping-vus",
  "stages": [
    { "duration": "1m", "target": 50 },
    { "duration": "5m", "target": 50 },
    { "duration": "1m", "target": 0 }
  ]
}
```

**Stress:**
```json
{
  "executor": "ramping-arrival-rate",
  "startRate": 50,
  "timeUnit": "1s",
  "preAllocatedVUs": 50,
  "maxVUs": 500,
  "stages": [
    { "duration": "2m", "target": 100 },
    { "duration": "5m", "target": 100 },
    { "duration": "2m", "target": 200 },
    { "duration": "5m", "target": 200 }
  ]
}
```

---

## Further Reading

- [k6 Documentation](https://grafana.com/docs/k6/latest/)
- [k6 Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [k6 Tags](https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/)
- [k6 Metrics](https://grafana.com/docs/k6/latest/using-k6/metrics/)
- [k6 Scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/)
- [Performance Testing Best Practices](https://grafana.com/docs/k6/latest/testing-guides/)
