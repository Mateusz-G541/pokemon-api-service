# K6 Execution Context: Complete Guide to Advanced Scenarios

A comprehensive guide to understanding k6's execution context, built-in variables, and advanced scenario patterns, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Execution Context?](#what-is-execution-context)
2. [Execution Context Theory: Deep Dive](#execution-context-theory-deep-dive)
3. [Built-in Variables](#built-in-variables)
4. [Execution Phases](#execution-phases)
5. [VU Lifecycle](#vu-lifecycle)
6. [Context-Aware Programming](#context-aware-programming)
7. [Advanced Scenario Patterns](#advanced-scenario-patterns)
8. [Multi-Scenario Execution](#multi-scenario-execution)
9. [Real-World Examples](#real-world-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## What Is Execution Context?

**Execution context** is the runtime environment in which your k6 test code executes, including the current phase, VU state, and available variables.

### Core Concept

```javascript
export default function () {
  // What VU am I?
  console.log(`VU: ${__VU}`);
  
  // What iteration is this?
  console.log(`Iteration: ${__ITER}`);
  
  // What environment am I in?
  console.log(`Environment: ${__ENV.ENVIRONMENT}`);
}
```

**Output (VU 3, iteration 5):**
```
VU: 3
Iteration: 5
Environment: production
```

### Why Context Matters

**Different behavior per VU:**
```javascript
export default function () {
  if (__VU === 1) {
    // VU 1: Admin user
    http.get('/api/admin/dashboard');
  } else {
    // Other VUs: Regular users
    http.get('/api/user/dashboard');
  }
}
```

**Different behavior per iteration:**
```javascript
export default function () {
  if (__ITER === 0) {
    // First iteration: Login
    http.post('/api/login', credentials);
  } else {
    // Subsequent iterations: Use cached session
    http.get('/api/data');
  }
}
```

---

## Execution Context Theory: Deep Dive

### k6 Execution Model

```
┌─────────────────────────────────────────────────────┐
│                 k6 Process                          │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │         Init Context                         │  │
│  │  - Load modules                              │  │
│  │  - Define constants                          │  │
│  │  - Create metrics                            │  │
│  │  - Runs once per VU                          │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │         VU Context                           │  │
│  │  - Execute default function                  │  │
│  │  - Access __VU, __ITER                       │  │
│  │  - Make HTTP requests                        │  │
│  │  - Runs many times                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  VU 1    VU 2    VU 3    ...    VU N               │
│  ↓       ↓       ↓              ↓                  │
│  Iter 0  Iter 0  Iter 0         Iter 0             │
│  Iter 1  Iter 1  Iter 1         Iter 1             │
│  Iter 2  Iter 2  Iter 2         Iter 2             │
│  ...     ...     ...            ...                │
└─────────────────────────────────────────────────────┘
```

### Context Hierarchy

```javascript
// GLOBAL SCOPE (Init Context)
import http from 'k6/http';
const BASE_URL = 'https://api.example.com';
console.log('Init: This runs once per VU');

// SETUP CONTEXT (runs once total)
export function setup() {
  console.log('Setup: This runs once before all VUs');
  return { data: 'shared' };
}

// VU CONTEXT (runs many times)
export default function (data) {
  console.log(`VU ${__VU}, Iteration ${__ITER}`);
  http.get(BASE_URL);
}

// TEARDOWN CONTEXT (runs once total)
export function teardown(data) {
  console.log('Teardown: This runs once after all VUs');
}
```

### Execution Timeline

```
Time    | Phase          | Context      | Runs
--------|----------------|--------------|------------------
0s      | Init           | Init         | Once per VU
1s      | Setup          | Setup        | Once total
2s      | VU Start       | VU           | VU 1, Iter 0
2.5s    | VU Iteration   | VU           | VU 1, Iter 1
3s      | VU Start       | VU           | VU 2, Iter 0
3.5s    | VU Iteration   | VU           | VU 2, Iter 1
...     | ...            | ...          | ...
30s     | VU End         | -            | All VUs finish
31s     | Teardown       | Teardown     | Once total
```

### Context Isolation

**Each VU has isolated context:**

```javascript
// Init context - separate per VU
let vuLocalCounter = 0;

export default function () {
  vuLocalCounter++;
  console.log(`VU ${__VU}: counter = ${vuLocalCounter}`);
}
```

**Output with 3 VUs, 2 iterations:**
```
VU 1: counter = 1
VU 2: counter = 1
VU 3: counter = 1
VU 1: counter = 2
VU 2: counter = 2
VU 3: counter = 2
```

Each VU has its own `vuLocalCounter`!

---

## Built-in Variables

### __VU (Virtual User ID)

**Type:** Number (1-indexed)

**Purpose:** Unique identifier for the current VU

```javascript
export default function () {
  console.log(`I am VU ${__VU}`);
}
```

**Use cases:**
- Assign different users to different VUs
- Distribute workload
- Create unique data per VU

**Example: User assignment**
```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  // Each VU gets a different user
  const user = users[(__VU - 1) % users.length];
  
  http.post('/api/login', {
    username: user.username,
    password: user.password
  });
}
```

**Important:** `__VU` is 1-indexed (starts at 1, not 0)

---

### __ITER (Iteration Number)

**Type:** Number (0-indexed)

**Purpose:** Current iteration number for this VU

```javascript
export default function () {
  console.log(`VU ${__VU}, Iteration ${__ITER}`);
}
```

**Use cases:**
- First-iteration setup
- Progressive behavior
- Iteration-specific logic

**Example: First iteration login**
```javascript
let token = null;

export default function () {
  if (__ITER === 0) {
    // First iteration: Login
    const loginRes = http.post('/api/login', credentials);
    token = loginRes.json('token');
  }
  
  // All iterations: Use token
  http.get('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

**Important:** `__ITER` is 0-indexed (starts at 0)

---

### __ENV (Environment Variables)

**Type:** Object

**Purpose:** Access environment variables

```javascript
export default function () {
  const apiKey = __ENV.API_KEY;
  const baseUrl = __ENV.BASE_URL || 'https://api.example.com';
  
  http.get(`${baseUrl}/data`, {
    headers: { 'X-API-Key': apiKey }
  });
}
```

**Setting environment variables:**
```bash
# Command line
k6 run -e API_KEY=secret123 -e BASE_URL=https://staging.api.com script.js

# Environment file
k6 run --env-file .env script.js
```

**.env file:**
```
API_KEY=secret123
BASE_URL=https://staging.api.com
ENVIRONMENT=staging
```

**Use cases:**
- Configuration per environment
- Secrets management
- Feature flags

---

### __VU and __ITER Combined

```javascript
export default function () {
  // Unique ID per iteration across all VUs
  const uniqueId = `${__VU}-${__ITER}`;
  
  http.post('/api/data', {
    id: uniqueId,
    timestamp: Date.now()
  });
}
```

**Output:**
```
VU 1, Iter 0: id = "1-0"
VU 2, Iter 0: id = "2-0"
VU 1, Iter 1: id = "1-1"
VU 2, Iter 1: id = "2-1"
```

---

## Execution Phases

### 1. Init Phase

**When:** Once per VU when initialized

**Purpose:** Load modules, define constants, prepare VU

**Available:**
- ✅ Module imports
- ✅ Constant definitions
- ✅ Metric creation
- ❌ `__VU` (always 0)
- ❌ `__ITER` (always 0)
- ❌ HTTP requests (technically possible but not recommended)

```javascript
// Init phase
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const BASE_URL = 'https://api.example.com';
const myCounter = new Counter('my_counter');

console.log('Init phase: Loading VU');
console.log(`__VU in init: ${__VU}`);  // Always 0!

export default function () {
  // VU phase
  console.log(`__VU in VU phase: ${__VU}`);  // Actual VU number
}
```

---

### 2. Setup Phase

**When:** Once total, before any VUs start

**Purpose:** Prepare test environment

**Available:**
- ✅ HTTP requests
- ✅ Return data to VUs
- ❌ `__VU` (always 0)
- ❌ `__ITER` (always 0)

```javascript
export function setup() {
  console.log('Setup phase');
  console.log(`__VU in setup: ${__VU}`);  // Always 0
  
  const res = http.post('/api/test-data');
  return { testId: res.json('id') };
}
```

---

### 3. VU Phase

**When:** Many times (iterations × VUs)

**Purpose:** Execute the actual test

**Available:**
- ✅ `__VU` (actual VU number)
- ✅ `__ITER` (actual iteration number)
- ✅ HTTP requests
- ✅ All k6 functions

```javascript
export default function (data) {
  console.log(`VU ${__VU}, Iteration ${__ITER}`);
  http.get('/api/data');
}
```

---

### 4. Teardown Phase

**When:** Once total, after all VUs finish

**Purpose:** Clean up test environment

**Available:**
- ✅ HTTP requests
- ✅ Data from setup
- ❌ `__VU` (always 0)
- ❌ `__ITER` (always 0)

```javascript
export function teardown(data) {
  console.log('Teardown phase');
  console.log(`__VU in teardown: ${__VU}`);  // Always 0
  
  http.del(`/api/test-data/${data.testId}`);
}
```

---

## VU Lifecycle

### VU State Machine

```
┌─────────────────────────────────────────────┐
│              VU Lifecycle                   │
│                                             │
│  [Created] ──→ [Init] ──→ [Running]        │
│                            ↓   ↑            │
│                            └───┘            │
│                         (iterations)        │
│                            ↓                │
│                        [Finished]           │
└─────────────────────────────────────────────┘
```

### VU Initialization

```javascript
// Init context (runs once per VU)
let vuState = {
  id: null,
  iterationCount: 0,
  startTime: null
};

export default function () {
  // First iteration: Initialize
  if (__ITER === 0) {
    vuState.id = __VU;
    vuState.startTime = Date.now();
  }
  
  vuState.iterationCount++;
  
  console.log(`VU ${vuState.id}: Iteration ${vuState.iterationCount}`);
  
  http.get('/api/data');
}
```

### VU-Local Storage

```javascript
// VU-local cache
let cache = {};

export default function () {
  const userId = __VU;
  
  // Check cache
  if (!cache[userId]) {
    // Cache miss: Fetch from API
    const res = http.get(`/api/users/${userId}`);
    cache[userId] = res.json();
  }
  
  // Use cached data
  const user = cache[userId];
  console.log(`Using cached user: ${user.name}`);
}
```

---

## Context-Aware Programming

### Different Behavior per VU

```javascript
export default function () {
  if (__VU === 1) {
    // VU 1: Admin workflow
    http.get('/api/admin/dashboard');
    http.get('/api/admin/users');
    http.get('/api/admin/settings');
  } else if (__VU <= 10) {
    // VUs 2-10: Power users
    http.get('/api/dashboard');
    http.get('/api/reports');
  } else {
    // VUs 11+: Regular users
    http.get('/api/dashboard');
  }
}
```

### Different Behavior per Iteration

```javascript
export default function () {
  if (__ITER === 0) {
    // First iteration: Full workflow
    http.post('/api/login', credentials);
    http.get('/api/profile');
    http.get('/api/settings');
  } else if (__ITER % 10 === 0) {
    // Every 10th iteration: Refresh
    http.get('/api/refresh');
  } else {
    // Regular iterations: Quick check
    http.get('/api/health');
  }
}
```

### VU-Based Data Distribution

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));
const products = new SharedArray('products', () => JSON.parse(open('./products.json')));

export default function () {
  // Each VU gets consistent user
  const user = users[(__VU - 1) % users.length];
  
  // Each iteration gets different product
  const product = products[__ITER % products.length];
  
  console.log(`VU ${__VU}: User ${user.name}, Product ${product.name}`);
}
```

---

## Advanced Scenario Patterns

### Pattern 1: Progressive Load

```javascript
export const options = {
  scenarios: {
    progressive_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 }
      ]
    }
  }
};

export default function () {
  // Behavior adapts to current VU count
  if (__VU <= 10) {
    // Low load: Full workflow
    fullWorkflow();
  } else if (__VU <= 50) {
    // Medium load: Core workflow
    coreWorkflow();
  } else {
    // High load: Minimal workflow
    minimalWorkflow();
  }
}

function fullWorkflow() {
  http.get('/api/users');
  http.get('/api/products');
  http.get('/api/orders');
}

function coreWorkflow() {
  http.get('/api/products');
  http.get('/api/orders');
}

function minimalWorkflow() {
  http.get('/api/health');
}
```

### Pattern 2: User Type Distribution

```javascript
export default function () {
  // Distribute user types based on VU number
  const userType = getUserType(__VU);
  
  switch (userType) {
    case 'admin':
      adminWorkflow();
      break;
    case 'power_user':
      powerUserWorkflow();
      break;
    case 'regular_user':
      regularUserWorkflow();
      break;
    case 'guest':
      guestWorkflow();
      break;
  }
}

function getUserType(vu) {
  // 5% admin (VU 1-5 out of 100)
  if (vu <= 5) return 'admin';
  
  // 15% power users (VU 6-20)
  if (vu <= 20) return 'power_user';
  
  // 60% regular users (VU 21-80)
  if (vu <= 80) return 'regular_user';
  
  // 20% guests (VU 81-100)
  return 'guest';
}

function adminWorkflow() {
  http.get('/api/admin/dashboard');
  http.get('/api/admin/users');
  http.post('/api/admin/settings', settingsData);
}

function powerUserWorkflow() {
  http.get('/api/dashboard');
  http.get('/api/reports/advanced');
  http.post('/api/data/export', exportParams);
}

function regularUserWorkflow() {
  http.get('/api/dashboard');
  http.get('/api/data');
}

function guestWorkflow() {
  http.get('/api/public/data');
}
```

### Pattern 3: Iteration-Based Progression

```javascript
let sessionToken = null;

export default function () {
  if (__ITER === 0) {
    // Iteration 0: Login
    const loginRes = http.post('/api/login', credentials);
    sessionToken = loginRes.json('token');
    console.log(`VU ${__VU}: Logged in`);
  } else if (__ITER < 10) {
    // Iterations 1-9: Browse
    http.get('/api/products', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } else if (__ITER < 20) {
    // Iterations 10-19: Add to cart
    http.post('/api/cart', cartData, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } else if (__ITER === 20) {
    // Iteration 20: Checkout
    http.post('/api/checkout', orderData, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } else {
    // Iterations 21+: Post-purchase
    http.get('/api/orders', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  }
}
```

### Pattern 4: Time-Based Behavior

```javascript
export default function () {
  const now = new Date();
  const hour = now.getHours();
  
  // Different behavior based on time of day
  if (hour >= 9 && hour < 17) {
    // Business hours: High activity
    businessHoursWorkflow();
  } else if (hour >= 17 && hour < 22) {
    // Evening: Medium activity
    eveningWorkflow();
  } else {
    // Night: Low activity
    nightWorkflow();
  }
}

function businessHoursWorkflow() {
  http.get('/api/dashboard');
  http.get('/api/reports');
  http.post('/api/data', data);
  sleep(randomBetween(1, 3));
}

function eveningWorkflow() {
  http.get('/api/dashboard');
  sleep(randomBetween(3, 8));
}

function nightWorkflow() {
  http.get('/api/health');
  sleep(randomBetween(10, 30));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

---

## Multi-Scenario Execution

### Scenario Context Variables

```javascript
export const options = {
  scenarios: {
    scenario1: {
      executor: 'constant-vus',
      vus: 10,
      duration: '1m',
      exec: 'scenario1Function'
    },
    scenario2: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'scenario2Function'
    }
  }
};

export function scenario1Function() {
  console.log(`Scenario 1: VU ${__VU}, Iteration ${__ITER}`);
  http.get('/api/endpoint1');
}

export function scenario2Function() {
  console.log(`Scenario 2: VU ${__VU}, Iteration ${__ITER}`);
  http.get('/api/endpoint2');
}
```

### Shared State Across Scenarios

```javascript
// Shared state (init context)
let sharedCounter = 0;

export const options = {
  scenarios: {
    writers: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'writeData'
    },
    readers: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'readData',
      startTime: '5s'  // Start after writers
    }
  }
};

export function writeData() {
  sharedCounter++;
  http.post('/api/data', { count: sharedCounter });
}

export function readData() {
  http.get('/api/data');
  console.log(`Shared counter: ${sharedCounter}`);
}
```

### Scenario-Specific Behavior

```javascript
export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      exec: 'smokeTest',
      tags: { test_type: 'smoke' }
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 }
      ],
      exec: 'loadTest',
      tags: { test_type: 'load' }
    }
  }
};

export function smokeTest() {
  // Comprehensive checks
  const res = http.get('/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has correct headers': (r) => r.headers['Content-Type'] === 'application/json'
  });
}

export function loadTest() {
  // Minimal checks
  const res = http.get('/api/data');
  check(res, {
    'status is 200': (r) => r.status === 200
  });
}
```

---

## Real-World Examples

### Example 1: E-commerce User Journey

```javascript
import { SharedArray } from 'k6/data';
import { sleep } from 'k6';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));
const products = new SharedArray('products', () => JSON.parse(open('./products.json')));

// VU-local state
let userSession = {
  token: null,
  cart: [],
  orderHistory: []
};

export default function () {
  const user = users[(__VU - 1) % users.length];
  
  // Iteration 0: Login
  if (__ITER === 0) {
    const loginRes = http.post('/api/login', JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    userSession.token = loginRes.json('token');
    console.log(`VU ${__VU}: User ${user.email} logged in`);
  }
  
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${userSession.token}`,
      'Content-Type': 'application/json'
    }
  };
  
  // Iterations 1-5: Browse products
  if (__ITER >= 1 && __ITER <= 5) {
    const product = products[__ITER % products.length];
    http.get(`/api/products/${product.id}`, authHeaders);
    sleep(randomBetween(2, 5));
  }
  
  // Iteration 6: Add to cart
  if (__ITER === 6) {
    const product = products[0];
    const cartRes = http.post('/api/cart', JSON.stringify({
      productId: product.id,
      quantity: 1
    }), authHeaders);
    
    userSession.cart = cartRes.json('items');
    console.log(`VU ${__VU}: Added ${product.name} to cart`);
    sleep(1);
  }
  
  // Iteration 7: Checkout
  if (__ITER === 7) {
    const orderRes = http.post('/api/checkout', JSON.stringify({
      paymentMethod: 'card',
      shippingAddress: user.address
    }), authHeaders);
    
    const order = orderRes.json();
    userSession.orderHistory.push(order);
    console.log(`VU ${__VU}: Order placed: ${order.id}`);
    sleep(2);
  }
  
  // Iterations 8+: View order history
  if (__ITER >= 8) {
    http.get('/api/orders', authHeaders);
    sleep(randomBetween(3, 10));
  }
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

### Example 2: SaaS Application with User Roles

```javascript
export const options = {
  scenarios: {
    admins: {
      executor: 'constant-vus',
      vus: 2,
      duration: '5m',
      exec: 'adminWorkflow'
    },
    power_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'powerUserWorkflow'
    },
    regular_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      exec: 'regularUserWorkflow'
    }
  }
};

// Admin workflow
export function adminWorkflow() {
  const adminToken = loginAsAdmin();
  
  if (__ITER === 0) {
    // First iteration: Dashboard overview
    http.get('/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  } else if (__ITER % 5 === 0) {
    // Every 5th iteration: User management
    http.get('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  } else {
    // Regular iterations: System monitoring
    http.get('/api/admin/metrics', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
  }
  
  sleep(randomBetween(5, 15));
}

// Power user workflow
export function powerUserWorkflow() {
  const token = loginAsPowerUser(__VU);
  
  // Generate reports
  if (__ITER % 3 === 0) {
    http.post('/api/reports/generate', JSON.stringify({
      type: 'advanced',
      dateRange: 'last-30-days'
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    // View dashboard
    http.get('/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  
  sleep(randomBetween(3, 10));
}

// Regular user workflow
export function regularUserWorkflow() {
  const token = loginAsRegularUser(__VU);
  
  // Simple dashboard view
  http.get('/api/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  sleep(randomBetween(5, 20));
}

function loginAsAdmin() {
  const res = http.post('/api/login', JSON.stringify({
    email: 'admin@example.com',
    password: __ENV.ADMIN_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json('token');
}

function loginAsPowerUser(vu) {
  const res = http.post('/api/login', JSON.stringify({
    email: `poweruser${vu}@example.com`,
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json('token');
}

function loginAsRegularUser(vu) {
  const res = http.post('/api/login', JSON.stringify({
    email: `user${vu}@example.com`,
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json('token');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

### Example 3: API with Rate Limiting

```javascript
import { Rate, Counter } from 'k6/metrics';

const rateLimitHits = new Counter('rate_limit_hits');
const successRate = new Rate('success_rate');

// VU-local rate limiting state
let requestsThisSecond = 0;
let windowStart = Date.now();

const RATE_LIMIT_PER_VU = 10;  // 10 requests per second per VU

export default function () {
  const now = Date.now();
  
  // Reset window every second
  if (now - windowStart >= 1000) {
    console.log(`VU ${__VU}: Made ${requestsThisSecond} requests in last second`);
    requestsThisSecond = 0;
    windowStart = now;
  }
  
  // Check if we're within rate limit
  if (requestsThisSecond < RATE_LIMIT_PER_VU) {
    const res = http.get('/api/data', {
      tags: { vu: __VU }
    });
    
    requestsThisSecond++;
    
    if (res.status === 200) {
      successRate.add(1);
    } else if (res.status === 429) {
      rateLimitHits.add(1);
      successRate.add(0);
      console.error(`VU ${__VU}: Rate limited!`);
    } else {
      successRate.add(0);
    }
  } else {
    // Wait for next window
    const remaining = 1000 - (now - windowStart);
    if (remaining > 0) {
      sleep(remaining / 1000);
    }
  }
}
```

---

## Best Practices

### 1. Use __VU for User Assignment

```javascript
// ✅ Good: Consistent user per VU
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  const user = users[(__VU - 1) % users.length];
  // VU always uses same user
}

// ❌ Bad: Random user
export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  // VU uses different user each time
}
```

### 2. Use __ITER for Progressive Behavior

```javascript
// ✅ Good: First iteration setup
let token = null;

export default function () {
  if (__ITER === 0) {
    const res = http.post('/api/login', credentials);
    token = res.json('token');
  }
  
  http.get('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### 3. Remember __VU is 1-indexed

```javascript
// ✅ Good: Account for 1-indexing
const user = users[(__VU - 1) % users.length];

// ❌ Bad: Treats as 0-indexed
const user = users[__VU % users.length];  // Skips first user!
```

### 4. Use __ENV for Configuration

```javascript
// ✅ Good: Environment-based config
const BASE_URL = __ENV.BASE_URL || 'https://api.example.com';
const API_KEY = __ENV.API_KEY;

export default function () {
  http.get(`${BASE_URL}/data`, {
    headers: { 'X-API-Key': API_KEY }
  });
}
```

### 5. Initialize VU State in Init Context

```javascript
// ✅ Good: Init in init context
let vuState = {
  id: null,
  token: null,
  cache: {}
};

export default function () {
  if (__ITER === 0) {
    vuState.id = __VU;
  }
  // Use vuState
}
```

### 6. Don't Rely on __VU in Init/Setup/Teardown

```javascript
// ❌ Bad: __VU is always 0 in setup
export function setup() {
  console.log(__VU);  // Always 0!
}

// ✅ Good: Use in VU phase only
export default function () {
  console.log(__VU);  // Actual VU number
}
```

### 7. Use Context for Realistic Scenarios

```javascript
// ✅ Good: Context-aware behavior
export default function () {
  // Different users
  const userType = __VU % 3;
  
  // Progressive journey
  if (__ITER < 5) {
    browsePhase();
  } else if (__ITER < 10) {
    purchasePhase();
  } else {
    postPurchasePhase();
  }
}
```

---

## Troubleshooting

### Problem: __VU is Always 0

**Symptom:** `__VU` shows 0 instead of VU number

**Cause:** Using `__VU` in init, setup, or teardown context

**Solution:** Use `__VU` only in VU phase (default function)

```javascript
// ❌ Bad
console.log(__VU);  // In init context: 0

export function setup() {
  console.log(__VU);  // In setup: 0
}

// ✅ Good
export default function () {
  console.log(__VU);  // In VU phase: actual number
}
```

---

### Problem: VU State Not Persisting

**Symptom:** Variables reset between iterations

**Cause:** Variables declared in VU context instead of init

**Solution:** Declare in init context (outside default function)

```javascript
// ❌ Bad: Resets every iteration
export default function () {
  let counter = 0;  // Resets to 0 each iteration!
  counter++;
  console.log(counter);  // Always 1
}

// ✅ Good: Persists across iterations
let counter = 0;  // In init context

export default function () {
  counter++;
  console.log(counter);  // Increments: 1, 2, 3, ...
}
```

---

### Problem: Array Index Out of Bounds

**Symptom:** Error accessing array with `__VU`

**Cause:** Forgetting `__VU` is 1-indexed

**Solution:** Subtract 1 when using as array index

```javascript
const users = ['Alice', 'Bob', 'Charlie'];

// ❌ Bad: __VU is 1-indexed
const user = users[__VU];  // VU 3 tries to access index 3 (out of bounds!)

// ✅ Good: Subtract 1
const user = users[(__VU - 1) % users.length];
```

---

### Problem: Environment Variable Not Found

**Symptom:** `__ENV.VARIABLE` is undefined

**Cause:** Environment variable not set

**Solution:** Provide default or check existence

```javascript
// ✅ Good: Provide default
const apiKey = __ENV.API_KEY || 'default-key';

// ✅ Good: Check existence
if (!__ENV.API_KEY) {
  throw new Error('API_KEY environment variable required');
}
```

---

## Quick Reference

### Built-in Variables

| Variable | Type | Range | Context | Purpose |
|----------|------|-------|---------|---------|
| `__VU` | Number | 1-N | VU phase | Virtual User ID |
| `__ITER` | Number | 0-∞ | VU phase | Iteration number |
| `__ENV` | Object | - | All | Environment variables |

### Context Availability

| Feature | Init | Setup | VU | Teardown |
|---------|------|-------|-----|----------|
| `__VU` | ❌ (0) | ❌ (0) | ✅ | ❌ (0) |
| `__ITER` | ❌ (0) | ❌ (0) | ✅ | ❌ (0) |
| `__ENV` | ✅ | ✅ | ✅ | ✅ |
| HTTP requests | ⚠️ | ✅ | ✅ | ✅ |
| Metrics | ✅ | ❌ | ✅ | ❌ |

### Common Patterns

```javascript
// User assignment
const user = users[(__VU - 1) % users.length];

// First iteration setup
if (__ITER === 0) {
  // Initialize
}

// Periodic action
if (__ITER % 10 === 0) {
  // Every 10th iteration
}

// VU-based distribution
if (__VU <= 10) {
  // First 10 VUs
} else {
  // Remaining VUs
}

// Environment config
const baseUrl = __ENV.BASE_URL || 'https://api.example.com';
```

---

## Summary

**Execution context enables sophisticated, realistic load testing:**

- ✅ **Use `__VU` for user assignment** - Consistent users per VU
- ✅ **Use `__ITER` for progressive behavior** - First iteration setup
- ✅ **Use `__ENV` for configuration** - Environment-specific settings
- ✅ **Remember `__VU` is 1-indexed** - Subtract 1 for array access
- ✅ **Initialize in init context** - VU-local state persists
- ✅ **Context-aware programming** - Different behavior per VU/iteration
- ✅ **Multi-scenario execution** - Different workflows simultaneously
- ❌ **Don't use `__VU` in init/setup/teardown** - Always 0 there
- ❌ **Don't declare state in VU phase** - Resets every iteration

**Master execution context, and you'll create sophisticated load tests that accurately simulate complex user behaviors and realistic traffic patterns.**
