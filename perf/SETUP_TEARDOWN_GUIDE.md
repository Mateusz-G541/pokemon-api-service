# K6 Setup & Teardown: Complete Guide to Test Lifecycle

A comprehensive guide to using k6's setup and teardown functions for test lifecycle management, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Are Setup & Teardown?](#what-are-setup--teardown)
2. [Test Lifecycle Theory: Deep Dive](#test-lifecycle-theory-deep-dive)
3. [Setup Function](#setup-function)
4. [Teardown Function](#teardown-function)
5. [Data Sharing Between Phases](#data-sharing-between-phases)
6. [Lifecycle Execution Order](#lifecycle-execution-order)
7. [Setup/Teardown vs VU Code](#setupteardown-vs-vu-code)
8. [Common Use Cases](#common-use-cases)
9. [Error Handling](#error-handling)
10. [Performance Considerations](#performance-considerations)
11. [Real-World Examples](#real-world-examples)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## What Are Setup & Teardown?

**Setup** and **teardown** are special lifecycle functions that run **once** before and after your load test, respectively.

### Core Concept

```javascript
export function setup() {
  // Runs ONCE before test starts
  console.log('Setting up test data...');
  return { testData: 'some data' };
}

export default function (data) {
  // Runs MANY times (once per VU iteration)
  console.log('Using data:', data.testData);
  http.get('https://api.example.com/data');
}

export function teardown(data) {
  // Runs ONCE after test ends
  console.log('Cleaning up test data...');
}
```

### Key Characteristics

| Aspect | Setup | Default (VU) | Teardown |
|--------|-------|--------------|----------|
| **Execution** | Once before test | Many times | Once after test |
| **Purpose** | Prepare test environment | Run actual test | Clean up |
| **Data** | Returns data to VUs | Receives data from setup | Receives data from setup |
| **Metrics** | Not counted | Counted | Not counted |
| **VU Context** | No (runs in init context) | Yes | No (runs in init context) |

---

## Test Lifecycle Theory: Deep Dive

### Complete Lifecycle Phases

k6 test execution has **4 distinct phases**:

```
1. Init Phase
   ↓
2. Setup Phase (optional)
   ↓
3. VU Phase (main test)
   ↓
4. Teardown Phase (optional)
```

### Detailed Execution Flow

```javascript
// 1. INIT PHASE - Runs once per VU
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'https://api.example.com';
console.log('Init: Loading modules');

// 2. SETUP PHASE - Runs once total
export function setup() {
  console.log('Setup: Creating test data');
  const res = http.post(`${BASE_URL}/test-data`, { name: 'test' });
  return { testId: res.json('id') };
}

// 3. VU PHASE - Runs many times
export default function (data) {
  console.log(`VU ${__VU}, iteration ${__ITER}: Using test ID ${data.testId}`);
  http.get(`${BASE_URL}/data/${data.testId}`);
}

// 4. TEARDOWN PHASE - Runs once total
export function teardown(data) {
  console.log('Teardown: Deleting test data');
  http.del(`${BASE_URL}/test-data/${data.testId}`);
}
```

### Execution Timeline

```
Time  | Phase      | What Happens
------|------------|------------------------------------------
0s    | Init       | Load script, import modules (per VU)
1s    | Setup      | Run setup() once
2s    | VU Start   | VU 1 starts, iteration 0
2.5s  | VU         | VU 1, iteration 1
3s    | VU Start   | VU 2 starts, iteration 0
3.5s  | VU         | VU 1, iteration 2
4s    | VU         | VU 2, iteration 1
...   | ...        | ...
30s   | VU End     | All VUs finish
31s   | Teardown   | Run teardown() once
32s   | Complete   | Test ends
```

### Init Phase Details

**Runs:** Once per VU when it's initialized

**Purpose:** Load modules, define constants, prepare VU-specific data

```javascript
// Init phase code (outside functions)
import http from 'k6/http';

const API_KEY = __ENV.API_KEY || 'default-key';
const BASE_URL = 'https://api.example.com';

// This runs once per VU
console.log(`VU ${__VU} initialized`);

export default function () {
  // VU phase
}
```

**Important:** Init code runs for **each VU**, not just once!

### Setup Phase Details

**Runs:** Once total, before any VUs start

**Purpose:** Prepare shared test environment

```javascript
export function setup() {
  console.log('Setup runs once');
  
  // Create test users
  const users = [];
  for (let i = 0; i < 10; i++) {
    const res = http.post('/api/users', { name: `user${i}` });
    users.push(res.json());
  }
  
  return { users };  // Share with VUs
}
```

**Characteristics:**
- ✅ Runs in init context (no VU)
- ✅ Can make HTTP requests
- ✅ Can return data to VUs
- ❌ Metrics not counted in test results
- ❌ No access to `__VU` or `__ITER`

### VU Phase Details

**Runs:** Many times (iterations × VUs)

**Purpose:** Execute the actual load test

```javascript
export default function (data) {
  // This runs many times
  console.log(`VU ${__VU}, iteration ${__ITER}`);
  
  // Use data from setup
  const user = data.users[__VU % data.users.length];
  http.get(`/api/users/${user.id}`);
}
```

**Characteristics:**
- ✅ Runs in VU context
- ✅ Has access to `__VU` and `__ITER`
- ✅ Metrics counted in test results
- ✅ Receives data from setup

### Teardown Phase Details

**Runs:** Once total, after all VUs finish

**Purpose:** Clean up test environment

```javascript
export function teardown(data) {
  console.log('Teardown runs once');
  
  // Delete test users
  data.users.forEach(user => {
    http.del(`/api/users/${user.id}`);
  });
}
```

**Characteristics:**
- ✅ Runs in init context (no VU)
- ✅ Can make HTTP requests
- ✅ Receives data from setup
- ❌ Metrics not counted in test results
- ❌ No access to `__VU` or `__ITER`

---

## Setup Function

### Basic Setup

```javascript
export function setup() {
  console.log('Running setup...');
  
  // Prepare test environment
  const response = http.post('https://api.example.com/init', {
    testRun: Date.now()
  });
  
  // Return data to VUs
  return {
    testRunId: response.json('id'),
    timestamp: Date.now()
  };
}
```

### Setup Return Value

**What you can return:**

```javascript
export function setup() {
  return {
    // Primitives
    string: 'value',
    number: 123,
    boolean: true,
    
    // Objects
    config: {
      apiKey: 'secret',
      baseUrl: 'https://api.example.com'
    },
    
    // Arrays
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ],
    
    // Nested structures
    testData: {
      users: [...],
      products: [...],
      settings: { ... }
    }
  };
}
```

**What you CANNOT return:**
- ❌ Functions
- ❌ HTTP response objects (extract data first)
- ❌ Promises
- ❌ Circular references

### Setup Without Return Value

```javascript
export function setup() {
  // Just prepare environment, don't return data
  http.post('https://api.example.com/reset-database');
  console.log('Database reset complete');
  // No return statement
}

export default function () {
  // data parameter will be undefined
  http.get('https://api.example.com/data');
}
```

### Setup with Authentication

```javascript
export function setup() {
  // Authenticate and get token
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    username: 'admin',
    password: __ENV.ADMIN_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const token = loginRes.json('token');
  
  // Create test data using authenticated session
  const dataRes = http.post('https://api.example.com/test-data', JSON.stringify({
    count: 100
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  
  return {
    token: token,
    testDataId: dataRes.json('id')
  };
}
```

### Setup with Multiple API Calls

```javascript
export function setup() {
  console.log('Creating test environment...');
  
  // Create users
  const users = [];
  for (let i = 0; i < 10; i++) {
    const res = http.post('/api/users', JSON.stringify({
      name: `testuser${i}`,
      email: `user${i}@test.com`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    users.push(res.json());
  }
  
  // Create products
  const products = [];
  for (let i = 0; i < 20; i++) {
    const res = http.post('/api/products', JSON.stringify({
      name: `Product ${i}`,
      price: (i + 1) * 10
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    products.push(res.json());
  }
  
  // Create categories
  const categories = http.get('/api/categories').json();
  
  return {
    users: users,
    products: products,
    categories: categories
  };
}
```

---

## Teardown Function

### Basic Teardown

```javascript
export function teardown(data) {
  console.log('Running teardown...');
  
  // Clean up test data
  http.del(`https://api.example.com/test-data/${data.testRunId}`);
  
  console.log('Cleanup complete');
}
```

### Teardown with Data from Setup

```javascript
export function setup() {
  const res = http.post('/api/test-session');
  return { sessionId: res.json('id') };
}

export function teardown(data) {
  // Use data from setup
  http.del(`/api/test-session/${data.sessionId}`);
  console.log(`Deleted session ${data.sessionId}`);
}
```

### Teardown with Multiple Cleanup Tasks

```javascript
export function teardown(data) {
  console.log('Starting cleanup...');
  
  // Delete test users
  console.log(`Deleting ${data.users.length} test users...`);
  data.users.forEach(user => {
    http.del(`/api/users/${user.id}`);
  });
  
  // Delete test products
  console.log(`Deleting ${data.products.length} test products...`);
  data.products.forEach(product => {
    http.del(`/api/products/${product.id}`);
  });
  
  // Reset database state
  console.log('Resetting database...');
  http.post('/api/admin/reset-test-data');
  
  console.log('Cleanup complete');
}
```

### Teardown with Error Handling

```javascript
export function teardown(data) {
  try {
    console.log('Cleaning up test data...');
    
    const deleteRes = http.del(`/api/test-data/${data.testId}`);
    
    if (deleteRes.status !== 204) {
      console.error(`Failed to delete test data: ${deleteRes.status}`);
      console.error(`Response: ${deleteRes.body}`);
    } else {
      console.log('Cleanup successful');
    }
  } catch (error) {
    console.error(`Teardown error: ${error}`);
  }
}
```

---

## Data Sharing Between Phases

### Setup → VU

```javascript
export function setup() {
  return {
    apiKey: 'secret-key-123',
    baseUrl: 'https://api.example.com',
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  };
}

export default function (data) {
  // Access setup data
  const user = data.users[__VU % data.users.length];
  
  http.get(`${data.baseUrl}/users/${user.id}`, {
    headers: { 'X-API-Key': data.apiKey }
  });
}
```

### Setup → Teardown

```javascript
export function setup() {
  const res = http.post('/api/test-environment');
  return {
    environmentId: res.json('id'),
    createdAt: Date.now()
  };
}

export default function (data) {
  // VU uses data
  http.get(`/api/environment/${data.environmentId}/data`);
}

export function teardown(data) {
  // Teardown receives same data
  console.log(`Deleting environment created at ${data.createdAt}`);
  http.del(`/api/test-environment/${data.environmentId}`);
}
```

### Data Immutability

**Important:** Data from setup is **read-only** in VUs!

```javascript
export function setup() {
  return { counter: 0 };
}

export default function (data) {
  // ❌ This does NOT modify the shared data
  data.counter++;
  console.log(data.counter);  // Always 1, not cumulative!
  
  // Each VU gets its own copy of the data
}
```

### Large Data Sharing

```javascript
import { SharedArray } from 'k6/data';

export function setup() {
  // Load large dataset
  const users = [];
  for (let i = 0; i < 10000; i++) {
    users.push({ id: i, name: `user${i}` });
  }
  
  return { users };
}

export default function (data) {
  // ❌ Bad: Each VU gets a copy (memory intensive)
  const user = data.users[__VU % data.users.length];
}
```

**Better approach for large datasets:**

```javascript
import { SharedArray } from 'k6/data';

// Use SharedArray instead
const users = new SharedArray('users', function () {
  const data = [];
  for (let i = 0; i < 10000; i++) {
    data.push({ id: i, name: `user${i}` });
  }
  return data;
});

export default function () {
  // All VUs share one copy in memory
  const user = users[__VU % users.length];
}
```

---

## Lifecycle Execution Order

### Complete Execution Sequence

```javascript
console.log('1. Init: Script loaded');

export function setup() {
  console.log('2. Setup: Running once');
  return { value: 'test' };
}

export default function (data) {
  console.log(`3. VU ${__VU}, iteration ${__ITER}: Running many times`);
}

export function teardown(data) {
  console.log('4. Teardown: Running once');
}
```

**Output with 2 VUs, 2 iterations each:**
```
1. Init: Script loaded
1. Init: Script loaded
2. Setup: Running once
3. VU 1, iteration 0: Running many times
3. VU 2, iteration 0: Running many times
3. VU 1, iteration 1: Running many times
3. VU 2, iteration 1: Running many times
4. Teardown: Running once
```

### Timing Diagram

```
VU 1 Init ─┐
VU 2 Init ─┤
           │
           ├─ Setup (once)
           │
VU 1 ───────┬─ Iteration 0
            ├─ Iteration 1
            └─ Done
            
VU 2 ───────┬─ Iteration 0
            ├─ Iteration 1
            └─ Done
            │
            └─ Teardown (once)
```

### Scenarios and Lifecycle

```javascript
export const options = {
  scenarios: {
    scenario1: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 3
    },
    scenario2: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 2,
      startTime: '5s'
    }
  }
};

export function setup() {
  console.log('Setup runs ONCE before all scenarios');
  return { data: 'shared' };
}

export default function (data) {
  console.log('Default function runs in all scenarios');
}

export function teardown(data) {
  console.log('Teardown runs ONCE after all scenarios complete');
}
```

**Execution:**
```
Setup (once)
  ↓
Scenario 1 starts (2 VUs × 3 iterations = 6 total)
  ↓
Scenario 2 starts at 5s (1 VU × 2 iterations = 2 total)
  ↓
All scenarios complete
  ↓
Teardown (once)
```

---

## Setup/Teardown vs VU Code

### What Belongs in Setup

```javascript
export function setup() {
  // ✅ Good: One-time preparation
  
  // Authentication
  const token = authenticate();
  
  // Create test data
  const testData = createTestData();
  
  // Initialize test environment
  resetDatabase();
  
  // Load configuration
  const config = loadConfig();
  
  return { token, testData, config };
}
```

### What Belongs in VU Code

```javascript
export default function (data) {
  // ✅ Good: Repeated test actions
  
  // Make API calls
  http.get('/api/data');
  
  // Validate responses
  check(response, { 'status ok': (r) => r.status === 200 });
  
  // Simulate user behavior
  sleep(1);
  
  // Use different data per VU
  const userId = __VU;
}
```

### What Belongs in Teardown

```javascript
export function teardown(data) {
  // ✅ Good: One-time cleanup
  
  // Delete test data
  deleteTestData(data.testData);
  
  // Logout/invalidate tokens
  logout(data.token);
  
  // Reset environment
  resetDatabase();
  
  // Generate reports
  generateReport();
}
```

### Anti-Patterns

```javascript
// ❌ Bad: Don't put test logic in setup
export function setup() {
  // This should be in VU code!
  for (let i = 0; i < 100; i++) {
    http.get('/api/data');
  }
}

// ❌ Bad: Don't create test data in VU code
export default function () {
  // This should be in setup!
  http.post('/api/test-data', { name: 'test' });
  
  // Then use it
  http.get('/api/test-data');
}

// ❌ Bad: Don't clean up in VU code
export default function () {
  http.get('/api/data');
  
  // This should be in teardown!
  http.del('/api/test-data');
}
```

---

## Common Use Cases

### 1. Authentication Token

```javascript
export function setup() {
  const loginRes = http.post('https://api.example.com/login', JSON.stringify({
    username: 'testuser',
    password: 'testpass'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return {
    token: loginRes.json('token')
  };
}

export default function (data) {
  http.get('https://api.example.com/protected', {
    headers: { 'Authorization': `Bearer ${data.token}` }
  });
}

export function teardown(data) {
  http.post('https://api.example.com/logout', null, {
    headers: { 'Authorization': `Bearer ${data.token}` }
  });
}
```

### 2. Test Data Creation

```javascript
export function setup() {
  console.log('Creating test data...');
  
  const products = [];
  for (let i = 0; i < 100; i++) {
    const res = http.post('/api/products', JSON.stringify({
      name: `Test Product ${i}`,
      price: (i + 1) * 10,
      stock: 100
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    products.push(res.json());
  }
  
  console.log(`Created ${products.length} test products`);
  return { products };
}

export default function (data) {
  // Each VU tests different products
  const product = data.products[__VU % data.products.length];
  http.get(`/api/products/${product.id}`);
}

export function teardown(data) {
  console.log('Deleting test data...');
  
  data.products.forEach(product => {
    http.del(`/api/products/${product.id}`);
  });
  
  console.log('Cleanup complete');
}
```

### 3. Database Reset

```javascript
export function setup() {
  console.log('Resetting database to known state...');
  
  http.post('https://api.example.com/admin/reset-database', JSON.stringify({
    seedData: true
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': __ENV.ADMIN_KEY
    }
  });
  
  console.log('Database reset complete');
}

export default function () {
  // Test against clean database
  http.get('https://api.example.com/data');
}

export function teardown() {
  console.log('Restoring production data...');
  
  http.post('https://api.example.com/admin/restore-database', null, {
    headers: { 'X-Admin-Key': __ENV.ADMIN_KEY }
  });
}
```

### 4. Configuration Loading

```javascript
export function setup() {
  // Load test configuration from API
  const configRes = http.get('https://api.example.com/test-config');
  const config = configRes.json();
  
  return {
    apiEndpoints: config.endpoints,
    testUsers: config.users,
    rateLimit: config.rateLimit
  };
}

export default function (data) {
  // Use configuration
  const endpoint = data.apiEndpoints[__VU % data.apiEndpoints.length];
  http.get(endpoint);
  
  // Respect rate limit
  sleep(1 / data.rateLimit);
}
```

### 5. External Service Initialization

```javascript
export function setup() {
  console.log('Starting external services...');
  
  // Start mock server
  const mockRes = http.post('https://mock-service.example.com/start', JSON.stringify({
    port: 8080,
    responses: {
      '/api/data': { status: 200, body: { data: 'test' } }
    }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  return {
    mockServiceId: mockRes.json('id'),
    mockServiceUrl: mockRes.json('url')
  };
}

export default function (data) {
  // Test against mock service
  http.get(`${data.mockServiceUrl}/api/data`);
}

export function teardown(data) {
  console.log('Stopping external services...');
  
  http.post(`https://mock-service.example.com/stop/${data.mockServiceId}`);
}
```

---

## Error Handling

### Setup Error Handling

```javascript
export function setup() {
  try {
    const res = http.post('/api/test-environment');
    
    if (res.status !== 201) {
      throw new Error(`Setup failed: ${res.status} ${res.body}`);
    }
    
    return { envId: res.json('id') };
  } catch (error) {
    console.error(`Setup error: ${error}`);
    throw error;  // Re-throw to fail the test
  }
}
```

**If setup fails:** Test is aborted, teardown does NOT run

### Teardown Error Handling

```javascript
export function teardown(data) {
  try {
    console.log('Cleaning up...');
    
    const res = http.del(`/api/test-environment/${data.envId}`);
    
    if (res.status !== 204) {
      console.error(`Cleanup failed: ${res.status}`);
      // Don't throw - let teardown complete
    }
  } catch (error) {
    console.error(`Teardown error: ${error}`);
    // Log but don't throw - cleanup should be best-effort
  }
}
```

### Conditional Teardown

```javascript
export function setup() {
  const res = http.post('/api/test-data');
  
  if (res.status === 201) {
    return {
      testDataCreated: true,
      testDataId: res.json('id')
    };
  } else {
    return {
      testDataCreated: false
    };
  }
}

export function teardown(data) {
  if (data.testDataCreated) {
    console.log('Deleting test data...');
    http.del(`/api/test-data/${data.testDataId}`);
  } else {
    console.log('No test data to clean up');
  }
}
```

---

## Performance Considerations

### Setup/Teardown Don't Count in Metrics

```javascript
export function setup() {
  // This takes 10 seconds but doesn't affect test metrics
  for (let i = 0; i < 100; i++) {
    http.post('/api/data', { index: i });
    sleep(0.1);
  }
  
  return { ready: true };
}

export default function () {
  // Only THIS is measured
  http.get('/api/data');
}
```

**Test metrics:** Only VU phase is measured

### Optimize Setup Time

```javascript
// ❌ Bad: Sequential (slow)
export function setup() {
  const users = [];
  for (let i = 0; i < 100; i++) {
    const res = http.post('/api/users', { name: `user${i}` });
    users.push(res.json());
  }
  return { users };
}

// ✅ Good: Batch requests (faster)
export function setup() {
  const requests = [];
  for (let i = 0; i < 100; i++) {
    requests.push([
      'POST',
      '/api/users',
      JSON.stringify({ name: `user${i}` }),
      { headers: { 'Content-Type': 'application/json' } }
    ]);
  }
  
  const responses = http.batch(requests);
  const users = responses.map(r => r.json());
  
  return { users };
}
```

### Minimize Data Size

```javascript
// ❌ Bad: Return entire response objects
export function setup() {
  const res = http.get('/api/users');
  return { response: res };  // Includes headers, timings, etc.
}

// ✅ Good: Extract only needed data
export function setup() {
  const res = http.get('/api/users');
  return { users: res.json() };  // Only the data
}
```

---

## Real-World Examples

### Example 1: E-commerce Load Test

```javascript
export function setup() {
  console.log('Setting up e-commerce test environment...');
  
  // 1. Authenticate as admin
  const adminToken = http.post('/api/auth/login', JSON.stringify({
    username: 'admin',
    password: __ENV.ADMIN_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' }
  }).json('token');
  
  // 2. Create test products
  console.log('Creating test products...');
  const products = [];
  const categories = ['Electronics', 'Clothing', 'Books'];
  
  for (let i = 0; i < 50; i++) {
    const res = http.post('/api/products', JSON.stringify({
      name: `Test Product ${i}`,
      category: categories[i % categories.length],
      price: (i + 1) * 10,
      stock: 100
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    products.push(res.json());
  }
  
  // 3. Create test users
  console.log('Creating test users...');
  const users = [];
  
  for (let i = 0; i < 20; i++) {
    const res = http.post('/api/users', JSON.stringify({
      username: `testuser${i}`,
      email: `user${i}@test.com`,
      password: 'testpass123'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    users.push(res.json());
  }
  
  console.log(`Setup complete: ${products.length} products, ${users.length} users`);
  
  return {
    adminToken,
    products,
    users
  };
}

export default function (data) {
  // Simulate user browsing and purchasing
  const user = data.users[__VU % data.users.length];
  const product = data.products[Math.floor(Math.random() * data.products.length)];
  
  // Login
  const loginRes = http.post('/api/auth/login', JSON.stringify({
    username: user.username,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const token = loginRes.json('token');
  
  // Browse products
  http.get('/api/products');
  sleep(1);
  
  // View product details
  http.get(`/api/products/${product.id}`);
  sleep(2);
  
  // Add to cart
  http.post('/api/cart', JSON.stringify({
    productId: product.id,
    quantity: 1
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  sleep(1);
}

export function teardown(data) {
  console.log('Cleaning up test environment...');
  
  // Delete test products
  console.log(`Deleting ${data.products.length} test products...`);
  data.products.forEach(product => {
    http.del(`/api/products/${product.id}`, null, {
      headers: { 'Authorization': `Bearer ${data.adminToken}` }
    });
  });
  
  // Delete test users
  console.log(`Deleting ${data.users.length} test users...`);
  data.users.forEach(user => {
    http.del(`/api/users/${user.id}`, null, {
      headers: { 'Authorization': `Bearer ${data.adminToken}` }
    });
  });
  
  console.log('Cleanup complete');
}
```

### Example 2: API Integration Test

```javascript
export function setup() {
  console.log('Initializing API integration test...');
  
  // 1. Check API health
  const healthRes = http.get('https://api.example.com/health');
  if (healthRes.status !== 200) {
    throw new Error('API is not healthy, aborting test');
  }
  
  // 2. Get API version
  const versionRes = http.get('https://api.example.com/version');
  const apiVersion = versionRes.json('version');
  console.log(`Testing API version: ${apiVersion}`);
  
  // 3. Create test workspace
  const workspaceRes = http.post('https://api.example.com/workspaces', JSON.stringify({
    name: `load-test-${Date.now()}`,
    description: 'Automated load test workspace'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': __ENV.API_KEY
    }
  });
  
  const workspaceId = workspaceRes.json('id');
  
  // 4. Seed test data in workspace
  console.log('Seeding test data...');
  const seedRes = http.post(`https://api.example.com/workspaces/${workspaceId}/seed`, JSON.stringify({
    recordCount: 1000
  }), {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': __ENV.API_KEY
    }
  });
  
  return {
    apiVersion,
    workspaceId,
    recordCount: seedRes.json('recordCount')
  };
}

export default function (data) {
  // Test API operations
  http.get(`https://api.example.com/workspaces/${data.workspaceId}/records`, {
    headers: { 'X-API-Key': __ENV.API_KEY }
  });
  
  sleep(0.5);
}

export function teardown(data) {
  console.log(`Deleting test workspace ${data.workspaceId}...`);
  
  const deleteRes = http.del(`https://api.example.com/workspaces/${data.workspaceId}`, null, {
    headers: { 'X-API-Key': __ENV.API_KEY }
  });
  
  if (deleteRes.status === 204) {
    console.log('Workspace deleted successfully');
  } else {
    console.error(`Failed to delete workspace: ${deleteRes.status}`);
  }
}
```

### Example 3: Database Performance Test

```javascript
export function setup() {
  console.log('Preparing database for performance test...');
  
  // 1. Connect to admin API
  const adminToken = http.post('https://db-admin.example.com/auth', JSON.stringify({
    username: 'admin',
    password: __ENV.DB_ADMIN_PASSWORD
  }), {
    headers: { 'Content-Type': 'application/json' }
  }).json('token');
  
  // 2. Create test database
  console.log('Creating test database...');
  const dbRes = http.post('https://db-admin.example.com/databases', JSON.stringify({
    name: `loadtest_${Date.now()}`,
    size: 'medium'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const dbName = dbRes.json('name');
  const dbConnectionString = dbRes.json('connectionString');
  
  // 3. Create schema
  console.log('Creating schema...');
  http.post(`https://db-admin.example.com/databases/${dbName}/schema`, JSON.stringify({
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'int', primaryKey: true },
          { name: 'name', type: 'varchar(255)' },
          { name: 'email', type: 'varchar(255)' }
        ]
      }
    ]
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  // 4. Insert test data
  console.log('Inserting test data...');
  http.post(`https://db-admin.example.com/databases/${dbName}/seed`, JSON.stringify({
    table: 'users',
    count: 10000
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  console.log('Database setup complete');
  
  return {
    adminToken,
    dbName,
    dbConnectionString
  };
}

export default function (data) {
  // Test database queries
  const userId = Math.floor(Math.random() * 10000) + 1;
  
  http.get(`https://api.example.com/users/${userId}`, {
    headers: { 'X-DB-Connection': data.dbConnectionString }
  });
  
  sleep(0.1);
}

export function teardown(data) {
  console.log(`Deleting test database ${data.dbName}...`);
  
  http.del(`https://db-admin.example.com/databases/${data.dbName}`, null, {
    headers: { 'Authorization': `Bearer ${data.adminToken}` }
  });
  
  console.log('Database cleanup complete');
}
```

---

## Best Practices

### 1. Keep Setup/Teardown Fast

```javascript
// ✅ Good: Minimal setup
export function setup() {
  const token = authenticate();
  return { token };
}

// ❌ Bad: Slow setup
export function setup() {
  // Creating 10,000 records takes minutes!
  for (let i = 0; i < 10000; i++) {
    http.post('/api/data', { index: i });
  }
}
```

### 2. Always Clean Up in Teardown

```javascript
// ✅ Good: Cleanup ensures no test pollution
export function teardown(data) {
  data.testIds.forEach(id => {
    http.del(`/api/test-data/${id}`);
  });
}

// ❌ Bad: No cleanup
export function teardown(data) {
  // Test data left in system!
}
```

### 3. Handle Setup Failures

```javascript
// ✅ Good: Fail fast if setup fails
export function setup() {
  const res = http.post('/api/init');
  
  if (res.status !== 200) {
    throw new Error(`Setup failed: ${res.body}`);
  }
  
  return { initId: res.json('id') };
}
```

### 4. Return Only Necessary Data

```javascript
// ✅ Good: Minimal data
export function setup() {
  const res = http.get('/api/config');
  return {
    apiKey: res.json('apiKey'),
    baseUrl: res.json('baseUrl')
  };
}

// ❌ Bad: Entire response
export function setup() {
  const res = http.get('/api/config');
  return { response: res };  // Includes headers, timings, etc.
}
```

### 5. Use Environment Variables for Secrets

```javascript
// ✅ Good: Secrets from environment
export function setup() {
  const token = http.post('/api/auth', JSON.stringify({
    apiKey: __ENV.API_KEY,
    secret: __ENV.API_SECRET
  })).json('token');
  
  return { token };
}

// ❌ Bad: Hardcoded secrets
export function setup() {
  const token = http.post('/api/auth', JSON.stringify({
    apiKey: 'hardcoded-key-123',
    secret: 'hardcoded-secret-456'
  })).json('token');
  
  return { token };
}
```

### 6. Log Setup/Teardown Progress

```javascript
// ✅ Good: Clear logging
export function setup() {
  console.log('Starting setup...');
  
  console.log('Creating test users...');
  const users = createUsers();
  
  console.log('Creating test products...');
  const products = createProducts();
  
  console.log(`Setup complete: ${users.length} users, ${products.length} products`);
  
  return { users, products };
}
```

### 7. Make Teardown Idempotent

```javascript
// ✅ Good: Safe to run multiple times
export function teardown(data) {
  if (data && data.testId) {
    const res = http.del(`/api/test-data/${data.testId}`);
    
    if (res.status === 404) {
      console.log('Test data already deleted');
    } else if (res.status === 204) {
      console.log('Test data deleted successfully');
    } else {
      console.error(`Unexpected status: ${res.status}`);
    }
  }
}
```

---

## Troubleshooting

### Problem: Setup Data Not Available in VU

**Symptom:** `data` parameter is undefined in VU function

**Cause:** Setup didn't return anything

```javascript
// ❌ Bad: No return
export function setup() {
  http.post('/api/init');
  // Missing return!
}

// ✅ Good: Return data
export function setup() {
  const res = http.post('/api/init');
  return { initId: res.json('id') };
}
```

---

### Problem: Teardown Not Running

**Symptom:** Teardown function never executes

**Cause:** Setup failed or test was interrupted

**Solution:** Ensure setup succeeds and test completes normally

---

### Problem: Setup Takes Too Long

**Symptom:** Test startup is very slow

**Cause:** Too much work in setup

**Solution:** Minimize setup work or use batch requests

```javascript
// ❌ Bad: Sequential requests
export function setup() {
  for (let i = 0; i < 100; i++) {
    http.post('/api/data', { index: i });
  }
}

// ✅ Good: Batch requests
export function setup() {
  const requests = Array.from({ length: 100 }, (_, i) => [
    'POST', '/api/data', JSON.stringify({ index: i })
  ]);
  
  http.batch(requests);
}
```

---

### Problem: Data Modified in VU Not Visible

**Symptom:** Changes to `data` object don't persist

**Cause:** Each VU gets a copy of the data

**Solution:** Understand that data is read-only

```javascript
export function setup() {
  return { counter: 0 };
}

export default function (data) {
  data.counter++;  // This only affects THIS VU's copy
  console.log(data.counter);  // Always 1, not cumulative
}
```

---

## Quick Reference

### Basic Pattern

```javascript
export function setup() {
  // Prepare test environment
  return { data: 'value' };
}

export default function (data) {
  // Use data from setup
  http.get(`/api/${data.value}`);
}

export function teardown(data) {
  // Clean up using data from setup
  http.del(`/api/${data.value}`);
}
```

### Lifecycle Order

```
Init (per VU) → Setup (once) → VU Phase (many) → Teardown (once)
```

### Data Flow

```
Setup returns data → VUs receive copy → Teardown receives same data
```

---

## Summary

**Setup and teardown manage test lifecycle:**

- ✅ **Use setup** to prepare test environment once
- ✅ **Use teardown** to clean up after test
- ✅ **Return data** from setup to share with VUs
- ✅ **Keep setup/teardown fast** - they don't count in metrics
- ✅ **Handle errors** in setup/teardown
- ✅ **Always clean up** in teardown
- ✅ **Log progress** for debugging
- ✅ **Use environment variables** for secrets

**Master setup/teardown, and you'll have clean, repeatable, isolated load tests.**
