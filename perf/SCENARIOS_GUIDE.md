# K6 Scenarios: Complete Guide to Controlling Load Patterns

A comprehensive guide to using k6 scenarios and executors to simulate realistic load patterns and control test execution.

## Table of Contents

1. [What Are Scenarios?](#what-are-scenarios)
2. [Executor Types Overview](#executor-types-overview)
3. [Shared Iterations Executors](#shared-iterations-executors)
4. [VU-Based Executors](#vu-based-executors)
5. [Arrival Rate Executors](#arrival-rate-executors)
6. [Multiple Scenarios](#multiple-scenarios)
7. [Scenario Options](#scenario-options)
8. [Load Pattern Strategies](#load-pattern-strategies)
9. [Real-World Examples](#real-world-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## What Are Scenarios?

**Scenarios** define how k6 executes your test by controlling:
- **How many Virtual Users (VUs)** run
- **For how long** they run
- **How requests are distributed** over time
- **Which function** each scenario executes

### Without Scenarios (Simple Test)

```javascript
export const options = {
  vus: 10,
  duration: '30s'
};

export default function () {
  http.get('https://api.example.com/data');
}
```

**Behavior:** 10 VUs run continuously for 30 seconds, each looping through the default function as fast as possible.

### With Scenarios (Advanced Control)

```javascript
export const options = {
  scenarios: {
    smoke_test: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
}
```

**Behavior:** 1 VU runs exactly 5 iterations, then stops. More predictable and controlled.

---

## Executor Types Overview

k6 provides **7 executor types** for different load patterns:

| Executor | Use Case | Load Pattern |
|----------|----------|--------------|
| **shared-iterations** | Fixed total iterations | Shared across all VUs |
| **per-vu-iterations** | Fixed iterations per VU | Each VU runs N times |
| **constant-vus** | Steady load | Fixed VUs for duration |
| **ramping-vus** | Gradual load changes | VUs ramp up/down |
| **constant-arrival-rate** | Fixed throughput | Constant requests/second |
| **ramping-arrival-rate** | Variable throughput | Requests/second ramps |
| **externally-controlled** | Manual control | Control via API/CLI |

### Quick Decision Tree

```
Need exact iteration count?
├─ Yes → shared-iterations or per-vu-iterations
└─ No → Continue

Need fixed VU count?
├─ Yes → constant-vus
└─ No → Continue

Need gradual ramp-up?
├─ Yes (VU-based) → ramping-vus
└─ Yes (throughput-based) → ramping-arrival-rate

Need constant throughput?
└─ Yes → constant-arrival-rate
```

---

## Shared Iterations Executors

### 1. `shared-iterations`

**Total iterations shared across all VUs**

```javascript
export const options = {
  scenarios: {
    shared_test: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '1m'
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(1);
}
```

**Behavior:**
- 100 total iterations
- 10 VUs compete to execute them
- Faster VUs get more iterations
- Stops when all 100 iterations complete OR maxDuration reached

**Use cases:**
- Quick functional tests
- Data processing (100 records to process)
- When total work is fixed

**Example output:**
```
VU 1: 15 iterations
VU 2: 12 iterations
VU 3: 11 iterations
...
Total: 100 iterations
```

---

### 2. `per-vu-iterations`

**Each VU runs a fixed number of iterations**

```javascript
export const options = {
  scenarios: {
    per_vu_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      maxDuration: '2m'
    }
  }
};

export default function () {
  console.log(`VU ${__VU}, iteration ${__ITER}`);
  http.get('https://api.example.com/data');
  sleep(0.5);
}
```

**Behavior:**
- Each VU runs exactly 10 iterations
- 5 VUs × 10 iterations = 50 total iterations
- All VUs run in parallel
- Stops when all VUs complete OR maxDuration reached

**Use cases:**
- Smoke tests (predictable, small load)
- Statelessness validation (same VU, multiple runs)
- Per-user workflows

**Example output:**
```
VU 1: iterations 0-9 (10 total)
VU 2: iterations 0-9 (10 total)
VU 3: iterations 0-9 (10 total)
VU 4: iterations 0-9 (10 total)
VU 5: iterations 0-9 (10 total)
Total: 50 iterations
```

---

## VU-Based Executors

### 3. `constant-vus`

**Fixed number of VUs for a duration**

```javascript
export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m'
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(1);
}
```

**Behavior:**
- 50 VUs run continuously for 5 minutes
- Each VU loops through the test function
- Iteration count depends on test function duration

**Use cases:**
- Sustained load testing
- Baseline performance measurement
- Endurance testing

**Visual:**
```
VUs
50 ┤████████████████████████████
   │
   │
 0 └────────────────────────────
   0s                         5m
```

---

### 4. `ramping-vus`

**Gradually increase/decrease VUs over time**

```javascript
export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 VUs
        { duration: '5m', target: 50 },   // Stay at 50 VUs
        { duration: '2m', target: 100 },  // Ramp up to 100 VUs
        { duration: '5m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 }     // Ramp down to 0
      ],
      gracefulRampDown: '30s'
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(1);
}
```

**Behavior:**
- VUs increase/decrease smoothly over time
- Each stage defines target VU count and duration
- `gracefulRampDown` allows VUs to finish current iteration

**Use cases:**
- Load testing (realistic traffic patterns)
- Stress testing (find breaking point)
- Avoiding thundering herd

**Visual:**
```
VUs
100┤          ┌────────┐
   │         /          \
50 │  ┌────┐             \
   │ /                    \
 0 └─                      ─────
   0  2m  7m  9m    14m   16m
```

**Stage details:**
```javascript
stages: [
  { duration: '2m', target: 50 },   // Linear ramp: 0→50 over 2 minutes
  { duration: '5m', target: 50 },   // Constant: stay at 50 for 5 minutes
  { duration: '2m', target: 100 },  // Linear ramp: 50→100 over 2 minutes
  { duration: '5m', target: 100 },  // Constant: stay at 100 for 5 minutes
  { duration: '2m', target: 0 }     // Linear ramp: 100→0 over 2 minutes
]
```

---

## Arrival Rate Executors

**Arrival rate executors** control **throughput** (iterations per second) instead of VU count. k6 automatically scales VUs to maintain the target rate.

### 5. `constant-arrival-rate`

**Fixed number of iterations per second**

```javascript
export const options = {
  scenarios: {
    constant_rate: {
      executor: 'constant-arrival-rate',
      rate: 100,                // 100 iterations per second
      timeUnit: '1s',           // per second
      duration: '5m',
      preAllocatedVUs: 50,      // Start with 50 VUs
      maxVUs: 200               // Scale up to 200 if needed
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(0.5);
}
```

**Behavior:**
- k6 maintains exactly 100 iterations/second
- Automatically adds/removes VUs to maintain rate
- If VUs can't keep up, k6 adds more (up to maxVUs)
- If maxVUs reached and still can't keep up, iterations are dropped

**Use cases:**
- Throughput testing (requests per second)
- API rate limit testing
- Simulating constant traffic rate

**Visual:**
```
Rate (iter/s)
100┤████████████████████████████
   │
   │
 0 └────────────────────────────
   0s                         5m

VUs (auto-scaled)
200┤                    ┌───────
   │              ┌────┘
50 ┤─────────────┘
   │
 0 └────────────────────────────
   0s                         5m
```

**Important:** `preAllocatedVUs` should be enough to handle the rate. If not, k6 will scale up, but this adds overhead.

**Calculate preAllocatedVUs:**
```
preAllocatedVUs = (rate × avg_iteration_duration) + buffer

Example:
- rate = 100 iter/s
- avg iteration = 0.5s
- buffer = 20%
- preAllocatedVUs = (100 × 0.5) × 1.2 = 60
```

---

### 6. `ramping-arrival-rate`

**Gradually increase/decrease iterations per second**

```javascript
export const options = {
  scenarios: {
    ramping_rate: {
      executor: 'ramping-arrival-rate',
      startRate: 10,            // Start at 10 iter/s
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },   // Ramp to 50 iter/s
        { duration: '3m', target: 50 },   // Stay at 50 iter/s
        { duration: '1m', target: 100 },  // Ramp to 100 iter/s
        { duration: '3m', target: 100 },  // Stay at 100 iter/s
        { duration: '1m', target: 200 },  // Ramp to 200 iter/s
        { duration: '3m', target: 200 },  // Stay at 200 iter/s
        { duration: '1m', target: 0 }     // Ramp down
      ]
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(0.3);
}
```

**Behavior:**
- Throughput increases/decreases smoothly
- k6 auto-scales VUs to maintain target rate
- Useful for finding maximum sustainable throughput

**Use cases:**
- Stress testing (find max throughput)
- Capacity planning
- Gradual traffic increase simulation

**Visual:**
```
Rate (iter/s)
200┤              ┌────────┐
   │             /          \
100│      ┌────┐             \
   │     /                    \
10 ┤────┘                      ─
   │
 0 └──────────────────────────────
   0  1m  4m  5m  8m  9m  12m  13m
```

---

### 7. `externally-controlled`

**Control test execution via k6 REST API or CLI**

```javascript
export const options = {
  scenarios: {
    external: {
      executor: 'externally-controlled',
      vus: 10,
      maxVUs: 100,
      duration: '10m'
    }
  }
};

export default function () {
  http.get('https://api.example.com/data');
  sleep(1);
}
```

**Control via CLI:**
```bash
# Start test
k6 run --paused script.js

# In another terminal, scale VUs
k6 resume
k6 scale --vus 50
k6 scale --vus 100
k6 pause
```

**Control via API:**
```bash
# Start test with API enabled
k6 run --paused --address=:6565 script.js

# Scale via API
curl -X PATCH http://localhost:6565/v1/status \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"vus":50}}}'
```

**Use cases:**
- Manual exploratory testing
- Interactive debugging
- External orchestration

---

## Multiple Scenarios

Run different load patterns simultaneously:

```javascript
export const options = {
  scenarios: {
    // Scenario 1: Constant browsing traffic
    browse_products: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      exec: 'browseProducts',
      tags: { scenario: 'browse' }
    },
    
    // Scenario 2: Periodic purchases
    make_purchases: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'makePurchase',
      tags: { scenario: 'purchase' }
    },
    
    // Scenario 3: Admin tasks
    admin_tasks: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 100,
      exec: 'adminTask',
      tags: { scenario: 'admin' }
    }
  },
  
  thresholds: {
    'http_req_duration{scenario:browse}': ['p(95)<500'],
    'http_req_duration{scenario:purchase}': ['p(95)<1000'],
    'http_req_failed{scenario:purchase}': ['rate==0']
  }
};

export function browseProducts() {
  http.get('https://api.example.com/products', {
    tags: { endpoint: 'list' }
  });
  sleep(2);
}

export function makePurchase() {
  http.post('https://api.example.com/orders', JSON.stringify({
    product: 123,
    quantity: 1
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'checkout' }
  });
  sleep(1);
}

export function adminTask() {
  http.get('https://api.example.com/admin/stats', {
    tags: { endpoint: 'admin' }
  });
  sleep(5);
}
```

**Behavior:**
- All 3 scenarios run in parallel
- Each has independent VU pool
- Each can have different thresholds
- Total VUs = sum of all scenarios

---

## Scenario Options

### Common Options (All Executors)

```javascript
{
  executor: 'ramping-vus',
  
  // Execution control
  startTime: '10s',              // Delay start by 10 seconds
  gracefulStop: '30s',           // Wait 30s for VUs to finish
  
  // Function to execute
  exec: 'myFunction',            // Call this function (default: 'default')
  
  // Environment
  env: {                         // Scenario-specific env vars
    MY_VAR: 'value'
  },
  
  // Tags
  tags: {                        // Tags for all requests in scenario
    scenario: 'load_test'
  }
}
```

### Executor-Specific Options

#### Iterations-Based

```javascript
{
  executor: 'per-vu-iterations',
  vus: 10,
  iterations: 100,
  maxDuration: '5m'              // Safety timeout
}
```

#### VU-Based

```javascript
{
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [...],
  gracefulRampDown: '30s'        // Time to finish during ramp-down
}
```

#### Arrival Rate

```javascript
{
  executor: 'constant-arrival-rate',
  rate: 100,
  timeUnit: '1s',
  duration: '5m',
  preAllocatedVUs: 50,           // Initial VU pool
  maxVUs: 200                    // Maximum VU pool
}
```

---

## Load Pattern Strategies

### 1. Smoke Test Pattern

**Quick sanity check (< 30s)**

```javascript
export const options = {
  scenarios: {
    smoke: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 5
    }
  },
  thresholds: {
    'http_req_failed': ['rate==0'],
    'http_req_duration': ['p(95)<500']
  }
};
```

**Purpose:** Verify test works, catch obvious bugs

---

### 2. Load Test Pattern

**Realistic sustained traffic**

```javascript
export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '10m', target: 50 },  // Sustained load
        { duration: '1m', target: 0 }     // Ramp down
      ],
      gracefulRampDown: '30s'
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<800'],
    'http_req_failed': ['rate<0.01']
  }
};
```

**Purpose:** Measure performance under expected load

---

### 3. Stress Test Pattern

**Push beyond normal capacity**

```javascript
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },    // Normal load
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },   // High load
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },   // Extreme load
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  }
};
```

**Purpose:** Find breaking point, test auto-scaling

---

### 4. Spike Test Pattern

**Sudden traffic surge**

```javascript
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },  // Sudden spike
        { duration: '1m', target: 100 },   // Sustained spike
        { duration: '10s', target: 0 }     // Drop
      ]
    }
  }
};
```

**Purpose:** Test auto-scaling responsiveness, rate limiting

---

### 5. Soak Test Pattern

**Long-duration stability**

```javascript
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '4h'
    }
  }
};
```

**Purpose:** Find memory leaks, resource exhaustion

---

### 6. Breakpoint Test Pattern

**Find maximum capacity**

```javascript
export const options = {
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '2m', target: 400 },
        { duration: '2m', target: 800 },
        { duration: '2m', target: 1600 },
        { duration: '2m', target: 3200 }
      ]
    }
  }
};
```

**Purpose:** Find max sustainable throughput

---

## Real-World Examples

### Example 1: E-commerce Site

```javascript
export const options = {
  scenarios: {
    // 70% of users just browse
    browsers: {
      executor: 'constant-vus',
      vus: 70,
      duration: '10m',
      exec: 'browse'
    },
    
    // 20% add to cart
    shoppers: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      exec: 'shop'
    },
    
    // 10% complete purchase
    buyers: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 10,
      maxVUs: 30,
      exec: 'purchase'
    }
  },
  
  thresholds: {
    'http_req_duration{endpoint:browse}': ['p(95)<500'],
    'http_req_duration{endpoint:cart}': ['p(95)<800'],
    'http_req_duration{endpoint:checkout}': ['p(95)<2000'],
    'http_req_failed{endpoint:checkout}': ['rate==0']
  }
};

export function browse() {
  http.get('https://shop.example.com/api/products', {
    tags: { endpoint: 'browse' }
  });
  sleep(randomBetween(2, 5));
}

export function shop() {
  http.get('https://shop.example.com/api/products', {
    tags: { endpoint: 'browse' }
  });
  sleep(2);
  
  http.get('https://shop.example.com/api/products/123', {
    tags: { endpoint: 'details' }
  });
  sleep(3);
  
  http.post('https://shop.example.com/api/cart', JSON.stringify({
    product: 123
  }), {
    tags: { endpoint: 'cart' }
  });
  sleep(1);
}

export function purchase() {
  http.get('https://shop.example.com/api/products', {
    tags: { endpoint: 'browse' }
  });
  sleep(2);
  
  http.post('https://shop.example.com/api/cart', JSON.stringify({
    product: 123
  }), {
    tags: { endpoint: 'cart' }
  });
  sleep(1);
  
  http.post('https://shop.example.com/api/checkout', JSON.stringify({
    payment: 'card'
  }), {
    tags: { endpoint: 'checkout' }
  });
  sleep(1);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

---

### Example 2: API with Daily Traffic Pattern

```javascript
export const options = {
  scenarios: {
    daily_pattern: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Night (low traffic)
        { duration: '1m', target: 10 },
        { duration: '2m', target: 10 },
        
        // Morning ramp-up
        { duration: '2m', target: 50 },
        { duration: '3m', target: 50 },
        
        // Midday peak
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        
        // Afternoon decline
        { duration: '2m', target: 50 },
        { duration: '3m', target: 50 },
        
        // Evening low
        { duration: '2m', target: 10 },
        { duration: '2m', target: 10 },
        
        // Night
        { duration: '1m', target: 0 }
      ],
      gracefulRampDown: '30s'
    }
  }
};
```

---

### Example 3: Microservices Load Test

```javascript
export const options = {
  scenarios: {
    // User service
    user_service: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 150,
      exec: 'testUserService',
      tags: { service: 'user' }
    },
    
    // Product service
    product_service: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 300,
      exec: 'testProductService',
      tags: { service: 'product' }
    },
    
    // Order service (lower rate, critical)
    order_service: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 30,
      maxVUs: 100,
      exec: 'testOrderService',
      tags: { service: 'order' }
    }
  },
  
  thresholds: {
    'http_req_duration{service:user}': ['p(95)<300'],
    'http_req_duration{service:product}': ['p(95)<400'],
    'http_req_duration{service:order}': ['p(95)<1000'],
    'http_req_failed{service:order}': ['rate==0']
  }
};

export function testUserService() {
  http.get('https://api.example.com/users/123');
}

export function testProductService() {
  http.get('https://api.example.com/products');
}

export function testOrderService() {
  http.post('https://api.example.com/orders', JSON.stringify({
    user: 123,
    product: 456
  }));
}
```

---

### Example 4: Black Friday Simulation

```javascript
export const options = {
  scenarios: {
    black_friday: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        // Pre-sale (normal traffic)
        { duration: '5m', target: 100 },
        
        // Sale starts (massive spike)
        { duration: '30s', target: 1000 },
        
        // Peak traffic
        { duration: '10m', target: 1000 },
        
        // Gradual decline
        { duration: '5m', target: 500 },
        { duration: '10m', target: 500 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 100 }
      ]
    }
  }
};
```

---

## Best Practices

### 1. Choose the Right Executor

```javascript
// ✅ Good: Use per-vu-iterations for smoke tests
{
  executor: 'per-vu-iterations',
  vus: 1,
  iterations: 5
}

// ❌ Bad: Using ramping-vus for smoke test
{
  executor: 'ramping-vus',
  stages: [{ duration: '30s', target: 1 }]
}
```

### 2. Always Use Ramp-Up/Down

```javascript
// ✅ Good: Gradual ramp prevents thundering herd
stages: [
  { duration: '1m', target: 100 },   // Ramp up
  { duration: '5m', target: 100 },   // Sustained
  { duration: '1m', target: 0 }      // Ramp down
]

// ❌ Bad: Instant spike
stages: [
  { duration: '0s', target: 100 },   // Instant spike!
  { duration: '5m', target: 100 }
]
```

### 3. Set gracefulRampDown

```javascript
// ✅ Good: Allow VUs to finish
{
  executor: 'ramping-vus',
  stages: [...],
  gracefulRampDown: '30s'
}

// ❌ Bad: VUs killed mid-request
{
  executor: 'ramping-vus',
  stages: [...]
  // No gracefulRampDown
}
```

### 4. Calculate preAllocatedVUs Correctly

```javascript
// ✅ Good: Enough VUs for target rate
{
  executor: 'constant-arrival-rate',
  rate: 100,                    // 100 iter/s
  timeUnit: '1s',
  preAllocatedVUs: 60,          // 100 × 0.5s × 1.2 buffer
  maxVUs: 120
}

// ❌ Bad: Too few VUs
{
  executor: 'constant-arrival-rate',
  rate: 100,
  timeUnit: '1s',
  preAllocatedVUs: 10,          // Not enough!
  maxVUs: 50
}
```

### 5. Use Tags for Scenario Identification

```javascript
// ✅ Good: Tag scenarios
scenarios: {
  browse: {
    executor: 'constant-vus',
    vus: 50,
    duration: '5m',
    tags: { scenario: 'browse' }
  }
}

// Then filter in thresholds
thresholds: {
  'http_req_duration{scenario:browse}': ['p(95)<500']
}
```

### 6. Name Scenarios Descriptively

```javascript
// ✅ Good: Clear names
scenarios: {
  smoke_test_critical_endpoints: {...},
  load_test_normal_traffic: {...},
  stress_test_peak_hours: {...}
}

// ❌ Bad: Vague names
scenarios: {
  test1: {...},
  test2: {...},
  scenario: {...}
}
```

### 7. Start Small, Scale Up

```javascript
// ✅ Good: Progressive stages
stages: [
  { duration: '1m', target: 10 },    // Start small
  { duration: '2m', target: 10 },
  { duration: '1m', target: 50 },    // Increase
  { duration: '2m', target: 50 },
  { duration: '1m', target: 100 },   // Increase more
  { duration: '2m', target: 100 }
]

// ❌ Bad: Jump to max immediately
stages: [
  { duration: '5m', target: 1000 }   // Too much too fast
]
```

---

## Troubleshooting

### Problem: Dropped Iterations

**Symptom:**
```
WARN[0125] Insufficient VUs, reached 200 active VUs and cannot initialize more
dropped iterations: 1234
```

**Cause:** `maxVUs` too low for target arrival rate

**Solution:**
```javascript
{
  executor: 'constant-arrival-rate',
  rate: 100,
  preAllocatedVUs: 60,
  maxVUs: 200  // Increase this
}
```

---

### Problem: Test Runs Too Long

**Symptom:** Test doesn't stop when expected

**Cause:** No `maxDuration` set

**Solution:**
```javascript
{
  executor: 'per-vu-iterations',
  vus: 10,
  iterations: 100,
  maxDuration: '5m'  // Safety timeout
}
```

---

### Problem: VUs Don't Ramp Smoothly

**Symptom:** VUs jump instead of ramping

**Cause:** Stage duration too short

**Solution:**
```javascript
// ❌ Bad: Too short
stages: [
  { duration: '1s', target: 100 }  // Too fast
]

// ✅ Good: Gradual
stages: [
  { duration: '2m', target: 100 }  // Smooth ramp
]
```

---

### Problem: Scenario Doesn't Start

**Symptom:** Scenario shows 0 VUs

**Cause:** `startTime` delay or wrong executor config

**Solution:**
```javascript
// Check startTime
{
  executor: 'constant-vus',
  vus: 10,
  duration: '5m',
  startTime: '0s'  // Start immediately
}
```

---

### Problem: Memory Issues with Arrival Rate

**Symptom:** High memory usage, slow performance

**Cause:** Too many VUs allocated

**Solution:**
```javascript
// Reduce maxVUs and optimize test function
{
  executor: 'constant-arrival-rate',
  rate: 100,
  preAllocatedVUs: 50,
  maxVUs: 100  // Lower this
}

// And optimize test function
export default function () {
  http.get(url);
  // Don't store large data in VU memory
}
```

---

## Quick Reference

### Executor Selection Cheat Sheet

| Need | Executor | Example |
|------|----------|---------|
| Fixed total iterations | `shared-iterations` | 100 iterations total |
| Fixed iterations per VU | `per-vu-iterations` | 5 iterations × 10 VUs |
| Steady load | `constant-vus` | 50 VUs for 5 minutes |
| Gradual load increase | `ramping-vus` | 0→100 VUs over 5 min |
| Fixed throughput | `constant-arrival-rate` | 100 req/s |
| Variable throughput | `ramping-arrival-rate` | 10→200 req/s |

### Common Patterns

**Smoke:**
```javascript
{ executor: 'per-vu-iterations', vus: 1, iterations: 5 }
```

**Load:**
```javascript
{
  executor: 'ramping-vus',
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '1m', target: 0 }
  ]
}
```

**Stress:**
```javascript
{
  executor: 'ramping-vus',
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 }
  ]
}
```

**Spike:**
```javascript
{
  executor: 'ramping-vus',
  stages: [
    { duration: '10s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 }
  ]
}
```

---

## Summary

**Scenarios give you precise control over load patterns:**

- ✅ **Choose the right executor** for your test type
- ✅ **Use ramp-up/down** to avoid thundering herd
- ✅ **Set gracefulRampDown** to allow clean shutdown
- ✅ **Calculate preAllocatedVUs** for arrival rate executors
- ✅ **Tag scenarios** for granular thresholds
- ✅ **Start small, scale up** progressively
- ✅ **Use multiple scenarios** to simulate realistic traffic

**Master scenarios, and you'll create realistic, controlled performance tests.**
