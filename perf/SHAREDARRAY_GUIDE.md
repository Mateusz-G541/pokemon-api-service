# K6 SharedArray: Complete Guide to Efficient Data Sharing

A comprehensive guide to using k6's SharedArray for memory-efficient data sharing across Virtual Users, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is SharedArray?](#what-is-sharedarray)
2. [Memory Problem: Deep Dive](#memory-problem-deep-dive)
3. [SharedArray Theory](#sharedarray-theory)
4. [Basic Usage](#basic-usage)
5. [Loading Data from Files](#loading-data-from-files)
6. [Advanced Patterns](#advanced-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Common Use Cases](#common-use-cases)
9. [SharedArray vs Alternatives](#sharedarray-vs-alternatives)
10. [Real-World Examples](#real-world-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## What Is SharedArray?

**SharedArray** is k6's mechanism for sharing large datasets across all Virtual Users (VUs) **without duplicating the data in memory**.

### The Problem

```javascript
// ❌ BAD: Each VU gets its own copy
const users = JSON.parse(open('./users.json'));  // 10MB file

export default function () {
  const user = users[__VU % users.length];
  http.get(`/api/users/${user.id}`);
}
```

**Memory usage with 1000 VUs:**
- 1000 VUs × 10MB = **10,000 MB (10 GB)** of RAM!

### The Solution

```javascript
// ✅ GOOD: All VUs share one copy
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));  // 10MB file
});

export default function () {
  const user = users[__VU % users.length];
  http.get(`/api/users/${user.id}`);
}
```

**Memory usage with 1000 VUs:**
- 1 copy × 10MB = **10 MB** of RAM!

**Savings: 99.9% less memory!**

---

## Memory Problem: Deep Dive

### How k6 VUs Work

Each VU is a **separate JavaScript execution context**:

```javascript
// This code runs in INIT phase
const data = loadData();  // Loaded once per VU

export default function () {
  // VU phase - uses data
  console.log(data);
}
```

**With 10 VUs:**
```
VU 1: Has its own copy of data
VU 2: Has its own copy of data
VU 3: Has its own copy of data
...
VU 10: Has its own copy of data
```

### Memory Duplication

```javascript
// Example: 1MB array
const largeArray = [];
for (let i = 0; i < 100000; i++) {
  largeArray.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    data: 'x'.repeat(100)
  });
}
// Size: ~1MB per VU
```

**Memory usage:**
- 1 VU: 1 MB
- 10 VUs: 10 MB
- 100 VUs: 100 MB
- 1000 VUs: 1000 MB (1 GB)
- 10000 VUs: 10000 MB (10 GB) ❌ **Out of memory!**

### Why This Happens

k6's architecture:

```
┌─────────────────────────────────────┐
│         k6 Process                  │
│                                     │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │ VU1 │  │ VU2 │  │ VU3 │  ...   │
│  │     │  │     │  │     │        │
│  │data │  │data │  │data │        │
│  │copy │  │copy │  │copy │        │
│  └─────┘  └─────┘  └─────┘        │
│                                     │
└─────────────────────────────────────┘
```

Each VU has its own isolated memory space.

### SharedArray Solution

```
┌─────────────────────────────────────┐
│         k6 Process                  │
│                                     │
│  ┌──────────────────────┐          │
│  │   Shared Memory      │          │
│  │   [data array]       │          │
│  └──────────────────────┘          │
│           ↑  ↑  ↑                  │
│           │  │  │                  │
│  ┌─────┐  │  │  │  ┌─────┐        │
│  │ VU1 │──┘  │  └──│ VU3 │  ...   │
│  └─────┘     │     └─────┘        │
│         ┌─────┐                    │
│         │ VU2 │                    │
│         └─────┘                    │
│                                     │
└─────────────────────────────────────┘
```

All VUs reference the **same data in memory**.

---

## SharedArray Theory

### How SharedArray Works

SharedArray uses **Go's shared memory** under the hood:

1. **Initialization:** Data is loaded once in Go runtime
2. **Sharing:** All VUs get a reference (pointer) to the same data
3. **Access:** VUs read from shared memory (read-only)
4. **Efficiency:** No duplication, minimal memory overhead

### Immutability

**Critical:** SharedArray data is **read-only**!

```javascript
const users = new SharedArray('users', function () {
  return [{ id: 1, name: 'Alice' }];
});

export default function () {
  // ✅ OK: Read access
  console.log(users[0].name);  // 'Alice'
  
  // ❌ ERROR: Cannot modify
  users[0].name = 'Bob';  // Throws error!
  users.push({ id: 2 });  // Throws error!
}
```

**Why immutable?**
- Prevents race conditions between VUs
- Ensures data consistency
- Allows safe concurrent access

### Initialization Function

```javascript
new SharedArray(name, initFunction)
```

**Parameters:**
1. `name` (string): Unique identifier for this SharedArray
2. `initFunction` (function): Function that returns the array data

**The init function:**
- Runs **once** when SharedArray is created
- Must return an array
- Can load files, parse JSON, generate data, etc.
- Executed in init context (before VUs start)

```javascript
const data = new SharedArray('myData', function () {
  // This runs ONCE
  console.log('Loading data...');
  
  const result = [];
  for (let i = 0; i < 1000; i++) {
    result.push({ id: i, value: `item${i}` });
  }
  
  console.log('Data loaded');
  return result;  // Must return array
});
```

### Accessing SharedArray

SharedArray behaves like a regular array for **read operations**:

```javascript
const users = new SharedArray('users', () => [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' }
]);

export default function () {
  // ✅ Array access
  console.log(users[0]);           // { id: 1, name: 'Alice' }
  console.log(users.length);       // 3
  
  // ✅ Array methods (read-only)
  const names = users.map(u => u.name);
  const alice = users.find(u => u.name === 'Alice');
  const ids = users.filter(u => u.id > 1);
  
  // ✅ Iteration
  users.forEach(user => console.log(user.name));
  for (const user of users) {
    console.log(user.name);
  }
  
  // ❌ Mutation methods (will fail)
  // users.push({ id: 4 });
  // users[0] = { id: 99 };
  // users.sort();
}
```

---

## Basic Usage

### Simple Array

```javascript
import { SharedArray } from 'k6/data';

const numbers = new SharedArray('numbers', function () {
  return [1, 2, 3, 4, 5];
});

export default function () {
  const num = numbers[__VU % numbers.length];
  console.log(`VU ${__VU} got number: ${num}`);
}
```

### Array of Objects

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];
});

export default function () {
  const user = users[__VU % users.length];
  
  http.post('https://api.example.com/login', JSON.stringify({
    email: user.email,
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Generated Data

```javascript
import { SharedArray } from 'k6/data';

const testData = new SharedArray('testData', function () {
  const data = [];
  
  for (let i = 0; i < 1000; i++) {
    data.push({
      id: i,
      username: `user${i}`,
      email: `user${i}@test.com`,
      age: 20 + (i % 50)
    });
  }
  
  return data;
});

export default function () {
  const user = testData[__VU % testData.length];
  http.get(`https://api.example.com/users/${user.id}`);
}
```

---

## Loading Data from Files

### JSON File

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

export default function () {
  const user = users[__VU % users.length];
  http.get(`/api/users/${user.id}`);
}
```

**users.json:**
```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" },
  { "id": 3, "name": "Charlie", "email": "charlie@example.com" }
]
```

### CSV File

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const users = new SharedArray('users', function () {
  const csvData = open('./data/users.csv');
  const parsed = papaparse.parse(csvData, { header: true });
  return parsed.data;
});

export default function () {
  const user = users[__VU % users.length];
  http.post('/api/login', JSON.stringify({
    username: user.username,
    password: user.password
  }));
}
```

**users.csv:**
```csv
username,password,email
alice,pass123,alice@example.com
bob,pass456,bob@example.com
charlie,pass789,charlie@example.com
```

### Text File (Line by Line)

```javascript
import { SharedArray } from 'k6/data';

const urls = new SharedArray('urls', function () {
  const fileContent = open('./data/urls.txt');
  return fileContent.split('\n').filter(line => line.trim() !== '');
});

export default function () {
  const url = urls[__VU % urls.length];
  http.get(url);
}
```

**urls.txt:**
```
https://example.com/page1
https://example.com/page2
https://example.com/page3
```

### Multiple Files

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

const products = new SharedArray('products', function () {
  return JSON.parse(open('./data/products.json'));
});

const orders = new SharedArray('orders', function () {
  return JSON.parse(open('./data/orders.json'));
});

export default function () {
  const user = users[__VU % users.length];
  const product = products[Math.floor(Math.random() * products.length)];
  
  http.post('/api/orders', JSON.stringify({
    userId: user.id,
    productId: product.id,
    quantity: 1
  }));
}
```

---

## Advanced Patterns

### Random Selection

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  // Random user
  const randomIndex = Math.floor(Math.random() * users.length);
  const user = users[randomIndex];
  
  http.get(`/api/users/${user.id}`);
}
```

### Round-Robin Distribution

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  // Each VU gets a different user
  const user = users[__VU % users.length];
  
  // Each iteration cycles through users
  const userByIteration = users[__ITER % users.length];
  
  http.get(`/api/users/${user.id}`);
}
```

### Weighted Selection

```javascript
import { SharedArray } from 'k6/data';

const scenarios = new SharedArray('scenarios', function () {
  return [
    { name: 'browse', weight: 70 },      // 70% probability
    { name: 'purchase', weight: 20 },    // 20% probability
    { name: 'admin', weight: 10 }        // 10% probability
  ];
});

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

export default function () {
  const scenario = weightedRandom(scenarios);
  
  if (scenario.name === 'browse') {
    http.get('/api/products');
  } else if (scenario.name === 'purchase') {
    http.post('/api/orders', orderData);
  } else {
    http.get('/api/admin/stats');
  }
}
```

### Filtering and Mapping

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  const allUsers = JSON.parse(open('./users.json'));
  
  // Filter only active users
  return allUsers.filter(user => user.status === 'active');
});

const userEmails = new SharedArray('userEmails', function () {
  const allUsers = JSON.parse(open('./users.json'));
  
  // Extract just emails
  return allUsers.map(user => user.email);
});

export default function () {
  const user = users[__VU % users.length];
  const email = userEmails[__VU % userEmails.length];
  
  http.post('/api/login', JSON.stringify({ email }));
}
```

### Combining Multiple Sources

```javascript
import { SharedArray } from 'k6/data';

const testData = new SharedArray('testData', function () {
  const users = JSON.parse(open('./users.json'));
  const products = JSON.parse(open('./products.json'));
  
  // Combine into test scenarios
  const scenarios = [];
  
  users.forEach(user => {
    products.forEach(product => {
      scenarios.push({
        userId: user.id,
        userEmail: user.email,
        productId: product.id,
        productName: product.name,
        productPrice: product.price
      });
    });
  });
  
  return scenarios;
});

export default function () {
  const scenario = testData[__VU % testData.length];
  
  http.post('/api/orders', JSON.stringify({
    userId: scenario.userId,
    productId: scenario.productId,
    quantity: 1
  }));
}
```

---

## Performance Optimization

### Memory Comparison

```javascript
// ❌ WITHOUT SharedArray
const largeData = JSON.parse(open('./large-file.json'));  // 100MB

// With 1000 VUs: 1000 × 100MB = 100GB RAM!
```

```javascript
// ✅ WITH SharedArray
import { SharedArray } from 'k6/data';

const largeData = new SharedArray('largeData', function () {
  return JSON.parse(open('./large-file.json'));  // 100MB
});

// With 1000 VUs: 1 × 100MB = 100MB RAM!
```

**Savings: 99.9%**

### Initialization Time

```javascript
import { SharedArray } from 'k6/data';

const data = new SharedArray('data', function () {
  console.time('Loading data');
  
  const result = JSON.parse(open('./large-file.json'));
  
  console.timeEnd('Loading data');
  // Output: Loading data: 2.5s
  
  return result;
});

// This runs ONCE, not per VU
// With 1000 VUs: 2.5s total (not 2500s!)
```

### Access Performance

```javascript
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

export default function () {
  // ✅ Fast: Direct index access
  const user = users[__VU % users.length];
  
  // ✅ Fast: Array methods create new arrays (not modifying original)
  const activeUsers = users.filter(u => u.active);
  
  // ⚠️ Slower: Searching large arrays
  const found = users.find(u => u.id === 12345);  // O(n)
  
  // ✅ Better: Use index access if possible
  const userById = users[12345];  // O(1) if using index
}
```

---

## Common Use Cases

### 1. User Credentials

```javascript
import { SharedArray } from 'k6/data';

const credentials = new SharedArray('credentials', function () {
  return JSON.parse(open('./credentials.json'));
});

export default function () {
  const cred = credentials[__VU % credentials.length];
  
  const loginRes = http.post('/api/login', JSON.stringify({
    username: cred.username,
    password: cred.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const token = loginRes.json('token');
  
  // Use token for authenticated requests
  http.get('/api/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### 2. Test Data IDs

```javascript
import { SharedArray } from 'k6/data';

const productIds = new SharedArray('productIds', function () {
  const products = JSON.parse(open('./products.json'));
  return products.map(p => p.id);
});

export default function () {
  const productId = productIds[Math.floor(Math.random() * productIds.length)];
  
  http.get(`/api/products/${productId}`);
}
```

### 3. API Endpoints

```javascript
import { SharedArray } from 'k6/data';

const endpoints = new SharedArray('endpoints', function () {
  return [
    { path: '/api/users', weight: 50 },
    { path: '/api/products', weight: 30 },
    { path: '/api/orders', weight: 15 },
    { path: '/api/admin', weight: 5 }
  ];
});

export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  http.get(endpoint.path);
}
```

### 4. Search Queries

```javascript
import { SharedArray } from 'k6/data';

const searchQueries = new SharedArray('searchQueries', function () {
  return [
    'laptop',
    'phone',
    'tablet',
    'headphones',
    'keyboard',
    'mouse',
    'monitor',
    'webcam'
  ];
});

export default function () {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  http.get(`/api/search?q=${query}`);
}
```

### 5. Realistic User Behavior Data

```javascript
import { SharedArray } from 'k6/data';

const userJourneys = new SharedArray('userJourneys', function () {
  return [
    {
      type: 'browser',
      actions: ['homepage', 'category', 'product'],
      thinkTime: [2, 3, 5]
    },
    {
      type: 'buyer',
      actions: ['homepage', 'search', 'product', 'cart', 'checkout'],
      thinkTime: [2, 1, 5, 2, 3]
    },
    {
      type: 'researcher',
      actions: ['search', 'product', 'product', 'product', 'compare'],
      thinkTime: [1, 5, 5, 5, 10]
    }
  ];
});

export default function () {
  const journey = userJourneys[__VU % userJourneys.length];
  
  journey.actions.forEach((action, index) => {
    if (action === 'homepage') {
      http.get('/');
    } else if (action === 'search') {
      http.get('/search?q=laptop');
    } else if (action === 'product') {
      http.get('/products/123');
    }
    // ... more actions
    
    sleep(journey.thinkTime[index]);
  });
}
```

---

## SharedArray vs Alternatives

### vs Regular Arrays

```javascript
// Regular Array (duplicated per VU)
const data = [1, 2, 3, 4, 5];

// SharedArray (shared across VUs)
import { SharedArray } from 'k6/data';
const data = new SharedArray('data', () => [1, 2, 3, 4, 5]);
```

| Aspect | Regular Array | SharedArray |
|--------|---------------|-------------|
| **Memory** | Duplicated per VU | Shared (one copy) |
| **Modification** | Can modify | Read-only |
| **Use case** | Small data | Large data |
| **Performance** | Faster access | Slightly slower access |

**Rule of thumb:** Use SharedArray for data > 1MB or with many VUs

### vs Setup Function

```javascript
// Setup function (returns data to VUs)
export function setup() {
  return { data: [1, 2, 3, 4, 5] };
}

export default function (data) {
  console.log(data.data);
}

// SharedArray
import { SharedArray } from 'k6/data';
const data = new SharedArray('data', () => [1, 2, 3, 4, 5]);

export default function () {
  console.log(data);
}
```

| Aspect | Setup | SharedArray |
|--------|-------|-------------|
| **Memory** | Duplicated per VU | Shared (one copy) |
| **When loaded** | Before test starts | During init |
| **Can use HTTP** | Yes | No |
| **Use case** | Dynamic data from API | Static data from files |

### vs External Files (Direct)

```javascript
// Direct file loading (duplicated per VU)
const data = JSON.parse(open('./data.json'));

// SharedArray (shared across VUs)
import { SharedArray } from 'k6/data';
const data = new SharedArray('data', () => JSON.parse(open('./data.json')));
```

**Always use SharedArray for file loading!**

---

## Real-World Examples

### Example 1: E-commerce Load Test

```javascript
import { SharedArray } from 'k6/data';
import http from 'k6/http';
import { sleep } from 'k6';

// Load user credentials (10,000 users)
const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

// Load product catalog (5,000 products)
const products = new SharedArray('products', function () {
  return JSON.parse(open('./data/products.json'));
});

// Load categories
const categories = new SharedArray('categories', function () {
  return ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
});

export default function () {
  // Each VU represents a different user
  const user = users[__VU % users.length];
  
  // Login
  const loginRes = http.post('/api/login', JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const token = loginRes.json('token');
  
  // Browse random category
  const category = categories[Math.floor(Math.random() * categories.length)];
  http.get(`/api/products?category=${category}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(2);
  
  // View random product
  const product = products[Math.floor(Math.random() * products.length)];
  http.get(`/api/products/${product.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(3);
  
  // Add to cart (30% of users)
  if (Math.random() < 0.3) {
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
}
```

**Memory savings:**
- Users: 10,000 × 1KB = 10MB (not 10GB with 1000 VUs)
- Products: 5,000 × 2KB = 10MB (not 10GB with 1000 VUs)
- **Total savings: ~20GB → 20MB**

### Example 2: API Testing with CSV Data

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import http from 'k6/http';

// Load test scenarios from CSV
const testCases = new SharedArray('testCases', function () {
  const csvData = open('./test-cases.csv');
  const parsed = papaparse.parse(csvData, { header: true });
  return parsed.data;
});

export default function () {
  // Each iteration tests a different case
  const testCase = testCases[__ITER % testCases.length];
  
  const response = http.request(
    testCase.method,
    testCase.url,
    testCase.body ? JSON.parse(testCase.body) : null,
    {
      headers: testCase.headers ? JSON.parse(testCase.headers) : {}
    }
  );
  
  check(response, {
    [`status is ${testCase.expectedStatus}`]: (r) => r.status == testCase.expectedStatus
  });
}
```

**test-cases.csv:**
```csv
method,url,body,headers,expectedStatus
GET,/api/users,,,200
POST,/api/users,"{""name"":""Alice""}","{""Content-Type"":""application/json""}",201
GET,/api/users/999,,,404
DELETE,/api/users/1,,,204
```

### Example 3: Multi-Region Testing

```javascript
import { SharedArray } from 'k6/data';
import http from 'k6/http';

// Load regional endpoints
const regions = new SharedArray('regions', function () {
  return [
    { name: 'us-east', url: 'https://us-east.api.example.com', sla: 200 },
    { name: 'us-west', url: 'https://us-west.api.example.com', sla: 250 },
    { name: 'eu-west', url: 'https://eu-west.api.example.com', sla: 300 },
    { name: 'ap-south', url: 'https://ap-south.api.example.com', sla: 400 }
  ];
});

// Load test data
const testData = new SharedArray('testData', function () {
  return JSON.parse(open('./test-data.json'));
});

export default function () {
  // Each VU tests a different region
  const region = regions[__VU % regions.length];
  const data = testData[Math.floor(Math.random() * testData.length)];
  
  const response = http.post(`${region.url}/api/data`, JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    tags: { region: region.name }
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    [`response time < ${region.sla}ms`]: (r) => r.timings.duration < region.sla
  });
}
```

---

## Best Practices

### 1. Always Use for Large Datasets

```javascript
// ✅ Good: Large dataset (> 1MB)
import { SharedArray } from 'k6/data';
const largeData = new SharedArray('largeData', () => JSON.parse(open('./large.json')));

// ❌ Bad: Large dataset without SharedArray
const largeData = JSON.parse(open('./large.json'));
```

### 2. Use Descriptive Names

```javascript
// ✅ Good: Descriptive names
const userCredentials = new SharedArray('userCredentials', ...);
const productCatalog = new SharedArray('productCatalog', ...);

// ❌ Bad: Generic names
const data1 = new SharedArray('data1', ...);
const arr = new SharedArray('arr', ...);
```

### 3. Don't Modify SharedArray Data

```javascript
const users = new SharedArray('users', () => [...]);

export default function () {
  // ✅ Good: Read-only operations
  const user = users[0];
  const names = users.map(u => u.name);
  
  // ❌ Bad: Trying to modify
  // users[0].name = 'Changed';  // Error!
  // users.push({ id: 99 });     // Error!
}
```

### 4. Load Files in Init Function

```javascript
// ✅ Good: Load in init function
const data = new SharedArray('data', function () {
  return JSON.parse(open('./data.json'));
});

// ❌ Bad: Load outside init function
const fileContent = open('./data.json');  // Loaded per VU!
const data = new SharedArray('data', () => JSON.parse(fileContent));
```

### 5. Minimize Processing in Init Function

```javascript
// ✅ Good: Simple processing
const data = new SharedArray('data', function () {
  const raw = JSON.parse(open('./data.json'));
  return raw.filter(item => item.active);
});

// ❌ Bad: Heavy processing
const data = new SharedArray('data', function () {
  const raw = JSON.parse(open('./data.json'));
  
  // Complex transformations slow down test startup
  return raw.map(item => {
    // Heavy computation
    for (let i = 0; i < 10000; i++) {
      // ...
    }
    return item;
  });
});
```

### 6. Use for File-Based Data

```javascript
// ✅ Good: File-based data
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

// ❌ Bad: Hardcoded data (use regular array instead)
const users = new SharedArray('users', () => [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);
```

### 7. Combine with Other Patterns

```javascript
import { SharedArray } from 'k6/data';

// SharedArray for large dataset
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

// Setup for dynamic data
export function setup() {
  const res = http.get('/api/config');
  return { apiKey: res.json('apiKey') };
}

export default function (data) {
  // Use both
  const user = users[__VU % users.length];
  
  http.get('/api/data', {
    headers: { 'X-API-Key': data.apiKey }
  });
}
```

---

## Troubleshooting

### Problem: "SharedArray is not defined"

**Symptom:** `ReferenceError: SharedArray is not defined`

**Cause:** Forgot to import

**Solution:**
```javascript
// ✅ Add import
import { SharedArray } from 'k6/data';
```

---

### Problem: Init Function Not Returning Array

**Symptom:** Error or unexpected behavior

**Cause:** Init function doesn't return array

```javascript
// ❌ Bad: No return
const data = new SharedArray('data', function () {
  JSON.parse(open('./data.json'));  // Missing return!
});

// ✅ Good: Returns array
const data = new SharedArray('data', function () {
  return JSON.parse(open('./data.json'));
});
```

---

### Problem: Cannot Modify SharedArray

**Symptom:** Error when trying to modify

**Cause:** SharedArray is read-only

**Solution:** Don't modify, create new arrays if needed

```javascript
const users = new SharedArray('users', () => [...]);

export default function () {
  // ✅ Good: Create new array
  const activeUsers = users.filter(u => u.active);
  activeUsers.push({ id: 99 });  // OK, modifying new array
  
  // ❌ Bad: Modify SharedArray
  // users.push({ id: 99 });  // Error!
}
```

---

### Problem: High Memory Usage Despite SharedArray

**Symptom:** Still using lots of memory

**Cause:** Creating copies in VU code

```javascript
const data = new SharedArray('data', () => JSON.parse(open('./large.json')));

export default function () {
  // ❌ Bad: Creating copy per iteration
  const copy = [...data];  // Duplicates the array!
  
  // ✅ Good: Use directly
  const item = data[__VU % data.length];
}
```

---

### Problem: File Not Found

**Symptom:** `Error: open ./data.json: no such file or directory`

**Cause:** File path is relative to k6 execution directory

**Solution:** Use correct relative path or absolute path

```javascript
// ✅ Good: Correct relative path
const data = new SharedArray('data', () => JSON.parse(open('./data/users.json')));

// ✅ Good: Absolute path
const data = new SharedArray('data', () => JSON.parse(open('/path/to/data.json')));
```

---

## Quick Reference

### Basic Pattern

```javascript
import { SharedArray } from 'k6/data';

const data = new SharedArray('uniqueName', function () {
  return [/* array data */];
});

export default function () {
  const item = data[__VU % data.length];
  // Use item
}
```

### Load from JSON

```javascript
const data = new SharedArray('data', () => JSON.parse(open('./data.json')));
```

### Load from CSV

```javascript
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const data = new SharedArray('data', function () {
  return papaparse.parse(open('./data.csv'), { header: true }).data;
});
```

### Memory Savings Formula

```
Without SharedArray: VUs × Data Size
With SharedArray: 1 × Data Size

Savings = (VUs - 1) × Data Size
```

---

## Summary

**SharedArray is essential for memory-efficient load testing:**

- ✅ **Use SharedArray** for large datasets (> 1MB)
- ✅ **Load files** in init function
- ✅ **Share across VUs** - one copy in memory
- ✅ **Read-only access** - prevents race conditions
- ✅ **Massive memory savings** - 99%+ with many VUs
- ✅ **Simple API** - works like regular array for reads
- ✅ **Combine with setup** for dynamic + static data
- ❌ **Don't modify** - data is immutable

**Master SharedArray, and you'll run massive load tests without running out of memory.**
