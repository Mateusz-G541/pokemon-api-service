# K6 Batch Requests: Complete Guide to Parallel Execution

A comprehensive guide to using k6's batch function for parallel HTTP requests, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Batch?](#what-is-batch)
2. [Batch Theory: Deep Dive](#batch-theory-deep-dive)
3. [Basic Batch Syntax](#basic-batch-syntax)
4. [Batch vs Sequential Requests](#batch-vs-sequential-requests)
5. [Response Handling](#response-handling)
6. [Advanced Batch Patterns](#advanced-batch-patterns)
7. [Performance Optimization](#performance-optimization)
8. [Real-World Use Cases](#real-world-use-cases)
9. [Batch with Other Features](#batch-with-other-features)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## What Is Batch?

**Batch** is k6's function for executing multiple HTTP requests **in parallel** within a single VU, simulating concurrent browser behavior.

### The Problem: Sequential Requests

```javascript
// Sequential (one after another)
export default function () {
  http.get('https://example.com/api/users');      // Wait ~200ms
  http.get('https://example.com/api/products');   // Wait ~200ms
  http.get('https://example.com/api/orders');     // Wait ~200ms
}
// Total time: ~600ms
```

**Timeline:**
```
Time:  0ms    200ms   400ms   600ms
       |------|------|------|
       users  products orders
```

### The Solution: Batch Requests

```javascript
// Parallel (all at once)
export default function () {
  http.batch([
    ['GET', 'https://example.com/api/users'],
    ['GET', 'https://example.com/api/products'],
    ['GET', 'https://example.com/api/orders']
  ]);
}
// Total time: ~200ms (all run in parallel)
```

**Timeline:**
```
Time:  0ms    200ms
       |------|
       users
       products
       orders
```

**Speed improvement: 3x faster!**

### Why Use Batch?

**Realistic browser behavior:**
- Modern browsers load resources in parallel
- SPAs make multiple API calls simultaneously
- Page loads fetch CSS, JS, images concurrently

**Performance benefits:**
- Faster test execution
- More realistic load patterns
- Better simulation of actual user behavior

---

## Batch Theory: Deep Dive

### How Batch Works

k6's batch implementation:

```
┌─────────────────────────────────────────┐
│         VU Execution Thread             │
│                                         │
│  http.batch([                           │
│    request1,  ──┐                       │
│    request2,  ──┼──→ Parallel Execution│
│    request3   ──┘                       │
│  ])                                     │
│       ↓                                 │
│  Wait for ALL to complete               │
│       ↓                                 │
│  Return array of responses              │
└─────────────────────────────────────────┘
```

### Execution Model

**Sequential execution:**
```javascript
const r1 = http.get(url1);  // Start, wait, complete
const r2 = http.get(url2);  // Start, wait, complete
const r3 = http.get(url3);  // Start, wait, complete
// Total: t1 + t2 + t3
```

**Batch execution:**
```javascript
const responses = http.batch([
  ['GET', url1],  // All start simultaneously
  ['GET', url2],
  ['GET', url3]
]);
// Total: max(t1, t2, t3)
```

### Concurrency Within VU

**Important:** Batch creates concurrency **within a single VU**, not across VUs.

```javascript
// With 1 VU
http.batch([
  ['GET', url1],
  ['GET', url2],
  ['GET', url3]
]);
// 3 concurrent requests from 1 VU

// With 10 VUs (each running batch)
// 10 VUs × 3 requests = 30 concurrent requests total
```

### Connection Reuse

k6 reuses HTTP connections in batch:

```javascript
http.batch([
  ['GET', 'https://api.example.com/users'],
  ['GET', 'https://api.example.com/products'],
  ['GET', 'https://api.example.com/orders']
]);
// May reuse same connection to api.example.com
```

### Blocking Behavior

**Batch blocks until ALL requests complete:**

```javascript
console.log('Before batch');

const responses = http.batch([
  ['GET', url1],  // Takes 100ms
  ['GET', url2],  // Takes 200ms
  ['GET', url3]   // Takes 150ms
]);

console.log('After batch');  // Prints after 200ms (slowest request)
```

---

## Basic Batch Syntax

### Array of Arrays

```javascript
import http from 'k6/http';

export default function () {
  const responses = http.batch([
    ['GET', 'https://api.example.com/users'],
    ['GET', 'https://api.example.com/products'],
    ['POST', 'https://api.example.com/orders', JSON.stringify({ item: 123 })]
  ]);
  
  console.log(`Got ${responses.length} responses`);
}
```

### Request Format

```javascript
[method, url, body, params]
```

**Parameters:**
1. `method` (string): HTTP method (GET, POST, PUT, DELETE, etc.)
2. `url` (string): Request URL
3. `body` (string, optional): Request body
4. `params` (object, optional): Request parameters (headers, tags, etc.)

### Simple GET Requests

```javascript
const responses = http.batch([
  ['GET', 'https://api.example.com/endpoint1'],
  ['GET', 'https://api.example.com/endpoint2'],
  ['GET', 'https://api.example.com/endpoint3']
]);
```

### POST Requests with Body

```javascript
const responses = http.batch([
  ['POST', 'https://api.example.com/users', JSON.stringify({
    name: 'Alice',
    email: 'alice@example.com'
  })],
  ['POST', 'https://api.example.com/products', JSON.stringify({
    name: 'Widget',
    price: 19.99
  })]
]);
```

### Requests with Headers

```javascript
const responses = http.batch([
  ['GET', 'https://api.example.com/data', null, {
    headers: { 'Authorization': 'Bearer token123' }
  }],
  ['POST', 'https://api.example.com/data', JSON.stringify({ key: 'value' }), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    }
  }]
]);
```

### Requests with Tags

```javascript
const responses = http.batch([
  ['GET', 'https://api.example.com/users', null, {
    tags: { endpoint: 'users' }
  }],
  ['GET', 'https://api.example.com/products', null, {
    tags: { endpoint: 'products' }
  }]
]);
```

---

## Batch vs Sequential Requests

### Performance Comparison

**Sequential:**
```javascript
export default function () {
  http.get('https://api.example.com/users');      // 200ms
  http.get('https://api.example.com/products');   // 200ms
  http.get('https://api.example.com/orders');     // 200ms
  http.get('https://api.example.com/reviews');    // 200ms
}
// Total: 800ms
```

**Batch:**
```javascript
export default function () {
  http.batch([
    ['GET', 'https://api.example.com/users'],
    ['GET', 'https://api.example.com/products'],
    ['GET', 'https://api.example.com/orders'],
    ['GET', 'https://api.example.com/reviews']
  ]);
}
// Total: 200ms (all parallel)
```

**Speed improvement: 4x faster!**

### When to Use Sequential

```javascript
// ✅ Good: Sequential when order matters
export default function () {
  // 1. Login first
  const loginRes = http.post('/api/login', credentials);
  const token = loginRes.json('token');
  
  // 2. Then fetch data (needs token)
  http.get('/api/protected', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

### When to Use Batch

```javascript
// ✅ Good: Batch when independent
export default function () {
  // All can run in parallel (no dependencies)
  http.batch([
    ['GET', '/api/users'],
    ['GET', '/api/products'],
    ['GET', '/api/categories'],
    ['GET', '/api/settings']
  ]);
}
```

### Mixed Approach

```javascript
// ✅ Good: Combine sequential and batch
export default function () {
  // 1. Login (sequential - must happen first)
  const loginRes = http.post('/api/login', credentials);
  const token = loginRes.json('token');
  
  // 2. Fetch data in parallel (all need token)
  const responses = http.batch([
    ['GET', '/api/profile', null, {
      headers: { 'Authorization': `Bearer ${token}` }
    }],
    ['GET', '/api/settings', null, {
      headers: { 'Authorization': `Bearer ${token}` }
    }],
    ['GET', '/api/notifications', null, {
      headers: { 'Authorization': `Bearer ${token}` }
    }]
  ]);
}
```

---

## Response Handling

### Response Array

```javascript
const responses = http.batch([
  ['GET', 'https://api.example.com/users'],
  ['GET', 'https://api.example.com/products'],
  ['GET', 'https://api.example.com/orders']
]);

console.log(responses.length);  // 3
console.log(responses[0].status);  // Status of first request
console.log(responses[1].status);  // Status of second request
console.log(responses[2].status);  // Status of third request
```

### Destructuring Responses

```javascript
const [usersRes, productsRes, ordersRes] = http.batch([
  ['GET', 'https://api.example.com/users'],
  ['GET', 'https://api.example.com/products'],
  ['GET', 'https://api.example.com/orders']
]);

console.log('Users:', usersRes.json());
console.log('Products:', productsRes.json());
console.log('Orders:', ordersRes.json());
```

### Checking Response Status

```javascript
const responses = http.batch([
  ['GET', 'https://api.example.com/endpoint1'],
  ['GET', 'https://api.example.com/endpoint2'],
  ['GET', 'https://api.example.com/endpoint3']
]);

responses.forEach((response, index) => {
  if (response.status !== 200) {
    console.error(`Request ${index} failed: ${response.status}`);
  }
});
```

### Using Check with Batch

```javascript
import { check } from 'k6';

const [usersRes, productsRes] = http.batch([
  ['GET', 'https://api.example.com/users'],
  ['GET', 'https://api.example.com/products']
]);

check(usersRes, {
  'users status is 200': (r) => r.status === 200,
  'users has data': (r) => r.json().length > 0
});

check(productsRes, {
  'products status is 200': (r) => r.status === 200,
  'products has data': (r) => r.json().length > 0
});
```

### Processing Response Data

```javascript
const [usersRes, productsRes] = http.batch([
  ['GET', 'https://api.example.com/users'],
  ['GET', 'https://api.example.com/products']
]);

const users = usersRes.json();
const products = productsRes.json();

// Use the data
users.forEach(user => {
  console.log(`User: ${user.name}`);
});

products.forEach(product => {
  console.log(`Product: ${product.name} - $${product.price}`);
});
```

---

## Advanced Batch Patterns

### Dynamic Batch Requests

```javascript
export default function () {
  const userIds = [1, 2, 3, 4, 5];
  
  const requests = userIds.map(id => [
    'GET',
    `https://api.example.com/users/${id}`
  ]);
  
  const responses = http.batch(requests);
  
  responses.forEach((response, index) => {
    console.log(`User ${userIds[index]}: ${response.status}`);
  });
}
```

### Batch with Shared Headers

```javascript
const token = 'Bearer abc123';
const headers = {
  'Authorization': token,
  'Content-Type': 'application/json'
};

const responses = http.batch([
  ['GET', '/api/profile', null, { headers }],
  ['GET', '/api/settings', null, { headers }],
  ['GET', '/api/notifications', null, { headers }]
]);
```

### Conditional Batch Requests

```javascript
export default function () {
  const requests = [
    ['GET', '/api/users']
  ];
  
  // Add optional requests based on conditions
  if (__VU % 2 === 0) {
    requests.push(['GET', '/api/products']);
  }
  
  if (__ITER < 10) {
    requests.push(['GET', '/api/stats']);
  }
  
  const responses = http.batch(requests);
}
```

### Nested Batches

```javascript
export default function () {
  // First batch: Get IDs
  const [usersRes, productsRes] = http.batch([
    ['GET', '/api/users'],
    ['GET', '/api/products']
  ]);
  
  const users = usersRes.json();
  const products = productsRes.json();
  
  // Second batch: Get details for each
  const detailRequests = [
    ...users.slice(0, 3).map(u => ['GET', `/api/users/${u.id}/details`]),
    ...products.slice(0, 3).map(p => ['GET', `/api/products/${p.id}/details`])
  ];
  
  const detailResponses = http.batch(detailRequests);
}
```

### Batch with Different Methods

```javascript
const responses = http.batch([
  ['GET', '/api/users'],
  ['POST', '/api/users', JSON.stringify({ name: 'Alice' })],
  ['PUT', '/api/users/1', JSON.stringify({ name: 'Bob' })],
  ['DELETE', '/api/users/2'],
  ['PATCH', '/api/users/3', JSON.stringify({ active: false })]
]);
```

---

## Performance Optimization

### Page Load Simulation

```javascript
// Simulate browser loading a page with multiple resources
export default function () {
  // Main HTML
  const htmlRes = http.get('https://example.com/page');
  
  // Parse and load resources in parallel (like a browser)
  const resources = http.batch([
    ['GET', 'https://example.com/styles.css'],
    ['GET', 'https://example.com/script.js'],
    ['GET', 'https://example.com/logo.png'],
    ['GET', 'https://example.com/banner.jpg'],
    ['GET', 'https://example.com/api/data']
  ]);
  
  console.log('Page fully loaded');
}
```

### API Aggregation

```javascript
// Instead of multiple round trips, batch related requests
export default function () {
  const [profile, settings, notifications, messages] = http.batch([
    ['GET', '/api/user/profile'],
    ['GET', '/api/user/settings'],
    ['GET', '/api/user/notifications'],
    ['GET', '/api/user/messages']
  ]);
  
  // All data fetched in one round trip
}
```

### Reducing Test Duration

```javascript
// Without batch: 10 requests × 200ms = 2000ms
export default function () {
  for (let i = 0; i < 10; i++) {
    http.get(`/api/data/${i}`);
  }
}

// With batch: 200ms total
export default function () {
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(['GET', `/api/data/${i}`]);
  }
  http.batch(requests);
}
```

### Batch Size Considerations

```javascript
// ❌ Bad: Too many requests in one batch
const requests = [];
for (let i = 0; i < 1000; i++) {
  requests.push(['GET', `/api/data/${i}`]);
}
http.batch(requests);  // May overwhelm client/server

// ✅ Good: Reasonable batch size
const BATCH_SIZE = 10;
for (let i = 0; i < 100; i += BATCH_SIZE) {
  const batch = [];
  for (let j = 0; j < BATCH_SIZE; j++) {
    batch.push(['GET', `/api/data/${i + j}`]);
  }
  http.batch(batch);
  sleep(0.1);  // Small pause between batches
}
```

---

## Real-World Use Cases

### Example 1: SPA Initial Load

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  // 1. Load main HTML
  const htmlRes = http.get('https://app.example.com/');
  
  check(htmlRes, {
    'HTML loaded': (r) => r.status === 200
  });
  
  // 2. Load static assets in parallel (like browser)
  const [cssRes, jsRes, logoRes, fontRes] = http.batch([
    ['GET', 'https://app.example.com/app.css'],
    ['GET', 'https://app.example.com/app.js'],
    ['GET', 'https://app.example.com/logo.svg'],
    ['GET', 'https://app.example.com/fonts/main.woff2']
  ]);
  
  check(cssRes, { 'CSS loaded': (r) => r.status === 200 });
  check(jsRes, { 'JS loaded': (r) => r.status === 200 });
  
  sleep(0.5);  // App initialization
  
  // 3. Initial API calls in parallel
  const [userRes, configRes, notifRes] = http.batch([
    ['GET', 'https://api.example.com/user/profile'],
    ['GET', 'https://api.example.com/config'],
    ['GET', 'https://api.example.com/notifications']
  ]);
  
  check(userRes, { 'User data loaded': (r) => r.status === 200 });
  
  console.log('App fully loaded and initialized');
}
```

### Example 2: Dashboard with Multiple Widgets

```javascript
export default function () {
  // Login
  const loginRes = http.post('https://api.example.com/login', JSON.stringify({
    username: 'user@example.com',
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const token = loginRes.json('token');
  const authHeaders = {
    headers: { 'Authorization': `Bearer ${token}` }
  };
  
  // Load all dashboard widgets in parallel
  const [
    statsRes,
    recentOrdersRes,
    topProductsRes,
    revenueRes,
    customersRes,
    alertsRes
  ] = http.batch([
    ['GET', 'https://api.example.com/dashboard/stats', null, authHeaders],
    ['GET', 'https://api.example.com/dashboard/recent-orders', null, authHeaders],
    ['GET', 'https://api.example.com/dashboard/top-products', null, authHeaders],
    ['GET', 'https://api.example.com/dashboard/revenue', null, authHeaders],
    ['GET', 'https://api.example.com/dashboard/customers', null, authHeaders],
    ['GET', 'https://api.example.com/dashboard/alerts', null, authHeaders]
  ]);
  
  // Verify all widgets loaded
  [statsRes, recentOrdersRes, topProductsRes, revenueRes, customersRes, alertsRes].forEach((res, i) => {
    check(res, {
      [`Widget ${i + 1} loaded`]: (r) => r.status === 200
    });
  });
  
  console.log('Dashboard fully loaded');
}
```

### Example 3: E-commerce Product Comparison

```javascript
export default function () {
  // User searches for products
  const searchRes = http.get('https://api.example.com/search?q=laptop');
  const products = searchRes.json().items.slice(0, 4);  // Top 4 results
  
  // Load details for all products in parallel
  const productRequests = products.map(product => [
    'GET',
    `https://api.example.com/products/${product.id}`
  ]);
  
  const productResponses = http.batch(productRequests);
  
  // Load reviews for all products in parallel
  const reviewRequests = products.map(product => [
    'GET',
    `https://api.example.com/products/${product.id}/reviews`
  ]);
  
  const reviewResponses = http.batch(reviewRequests);
  
  // User now has all data to compare products
  productResponses.forEach((res, index) => {
    const product = res.json();
    const reviews = reviewResponses[index].json();
    
    console.log(`${product.name}: $${product.price}, ${reviews.length} reviews`);
  });
}
```

### Example 4: Microservices Aggregation

```javascript
export default function () {
  // API Gateway aggregates data from multiple microservices
  const [
    userServiceRes,
    orderServiceRes,
    inventoryServiceRes,
    paymentServiceRes,
    shippingServiceRes
  ] = http.batch([
    ['GET', 'https://users.example.com/api/user/123'],
    ['GET', 'https://orders.example.com/api/orders?userId=123'],
    ['GET', 'https://inventory.example.com/api/stock?userId=123'],
    ['GET', 'https://payments.example.com/api/methods?userId=123'],
    ['GET', 'https://shipping.example.com/api/addresses?userId=123']
  ]);
  
  // Aggregate response
  const aggregatedData = {
    user: userServiceRes.json(),
    orders: orderServiceRes.json(),
    inventory: inventoryServiceRes.json(),
    paymentMethods: paymentServiceRes.json(),
    addresses: shippingServiceRes.json()
  };
  
  console.log('Aggregated data from 5 microservices');
}
```

### Example 5: Image Gallery Load

```javascript
export default function () {
  // Load gallery page
  const galleryRes = http.get('https://gallery.example.com/album/123');
  const images = galleryRes.json().images.slice(0, 12);  // First 12 images
  
  // Load all thumbnails in parallel
  const thumbnailRequests = images.map(img => [
    'GET',
    `https://cdn.example.com/thumbnails/${img.id}.jpg`
  ]);
  
  const thumbnailResponses = http.batch(thumbnailRequests);
  
  console.log(`Loaded ${thumbnailResponses.length} thumbnails`);
  
  // User clicks on first image - load full size
  const fullImageRes = http.get(`https://cdn.example.com/images/${images[0].id}.jpg`);
  
  // Preload next 3 images in parallel
  const preloadRequests = images.slice(1, 4).map(img => [
    'GET',
    `https://cdn.example.com/images/${img.id}.jpg`
  ]);
  
  http.batch(preloadRequests);
  
  console.log('Preloaded next 3 images');
}
```

---

## Batch with Other Features

### Batch with Groups

```javascript
import { group } from 'k6';

export default function () {
  group('Load Dashboard', function () {
    const responses = http.batch([
      ['GET', '/api/stats'],
      ['GET', '/api/recent-activity'],
      ['GET', '/api/notifications']
    ]);
    
    check(responses[0], { 'Stats loaded': (r) => r.status === 200 });
  });
  
  group('Load Reports', function () {
    const responses = http.batch([
      ['GET', '/api/reports/sales'],
      ['GET', '/api/reports/traffic'],
      ['GET', '/api/reports/conversions']
    ]);
  });
}
```

### Batch with Custom Metrics

```javascript
import { Trend } from 'k6/metrics';

const batchDuration = new Trend('batch_duration');

export default function () {
  const start = Date.now();
  
  const responses = http.batch([
    ['GET', '/api/endpoint1'],
    ['GET', '/api/endpoint2'],
    ['GET', '/api/endpoint3']
  ]);
  
  const duration = Date.now() - start;
  batchDuration.add(duration);
  
  console.log(`Batch completed in ${duration}ms`);
}
```

### Batch with SharedArray

```javascript
import { SharedArray } from 'k6/data';

const urls = new SharedArray('urls', function () {
  return JSON.parse(open('./urls.json'));
});

export default function () {
  const requests = urls.map(url => ['GET', url]);
  const responses = http.batch(requests);
  
  console.log(`Fetched ${responses.length} URLs`);
}
```

### Batch in Setup

```javascript
export function setup() {
  // Create test data in parallel
  const responses = http.batch([
    ['POST', '/api/test-users', JSON.stringify({ count: 10 })],
    ['POST', '/api/test-products', JSON.stringify({ count: 20 })],
    ['POST', '/api/test-orders', JSON.stringify({ count: 5 })]
  ]);
  
  return {
    users: responses[0].json(),
    products: responses[1].json(),
    orders: responses[2].json()
  };
}

export default function (data) {
  console.log(`Using ${data.users.length} test users`);
}
```

---

## Best Practices

### 1. Use Batch for Independent Requests

```javascript
// ✅ Good: Independent requests
http.batch([
  ['GET', '/api/users'],
  ['GET', '/api/products'],
  ['GET', '/api/categories']
]);

// ❌ Bad: Dependent requests
http.batch([
  ['POST', '/api/login', credentials],
  ['GET', '/api/protected']  // Needs token from login!
]);
```

### 2. Keep Batch Size Reasonable

```javascript
// ✅ Good: Reasonable batch size (5-20 requests)
http.batch([
  ['GET', '/api/endpoint1'],
  ['GET', '/api/endpoint2'],
  ['GET', '/api/endpoint3'],
  ['GET', '/api/endpoint4'],
  ['GET', '/api/endpoint5']
]);

// ❌ Bad: Too many requests
const requests = [];
for (let i = 0; i < 1000; i++) {
  requests.push(['GET', `/api/data/${i}`]);
}
http.batch(requests);  // Overwhelming!
```

### 3. Handle Errors Properly

```javascript
// ✅ Good: Check each response
const responses = http.batch([
  ['GET', '/api/endpoint1'],
  ['GET', '/api/endpoint2'],
  ['GET', '/api/endpoint3']
]);

responses.forEach((response, index) => {
  if (response.status !== 200) {
    console.error(`Request ${index} failed: ${response.status}`);
  }
});
```

### 4. Use Descriptive Variable Names

```javascript
// ✅ Good: Clear names
const [usersRes, productsRes, ordersRes] = http.batch([
  ['GET', '/api/users'],
  ['GET', '/api/products'],
  ['GET', '/api/orders']
]);

// ❌ Bad: Unclear names
const [r1, r2, r3] = http.batch([...]);
```

### 5. Combine with Sequential When Needed

```javascript
// ✅ Good: Mix sequential and batch
export default function () {
  // Sequential: Login first
  const loginRes = http.post('/api/login', credentials);
  const token = loginRes.json('token');
  
  // Batch: Fetch data in parallel
  const responses = http.batch([
    ['GET', '/api/profile', null, { headers: { 'Authorization': `Bearer ${token}` } }],
    ['GET', '/api/settings', null, { headers: { 'Authorization': `Bearer ${token}` } }]
  ]);
}
```

### 6. Add Tags for Metrics

```javascript
// ✅ Good: Tag batch requests
http.batch([
  ['GET', '/api/users', null, { tags: { endpoint: 'users' } }],
  ['GET', '/api/products', null, { tags: { endpoint: 'products' } }]
]);
```

### 7. Simulate Real Browser Behavior

```javascript
// ✅ Good: Realistic page load
export default function () {
  // 1. HTML
  http.get('/page');
  
  // 2. Assets in parallel (like browser)
  http.batch([
    ['GET', '/styles.css'],
    ['GET', '/script.js'],
    ['GET', '/logo.png']
  ]);
  
  // 3. API calls after page load
  sleep(0.5);
  http.batch([
    ['GET', '/api/data1'],
    ['GET', '/api/data2']
  ]);
}
```

---

## Troubleshooting

### Problem: Batch Slower Than Expected

**Symptom:** Batch doesn't improve performance

**Cause:** Server bottleneck or connection limits

**Solution:** Check server capacity and connection pooling

```javascript
// Test with different batch sizes
const BATCH_SIZE = 5;  // Try 5, 10, 20
const requests = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  requests.push(['GET', `/api/data/${i}`]);
}
http.batch(requests);
```

---

### Problem: Some Requests Fail in Batch

**Symptom:** Individual requests fail when batched

**Cause:** Server rate limiting or resource exhaustion

**Solution:** Reduce batch size or add delays

```javascript
// Add small batches with delays
for (let i = 0; i < 100; i += 10) {
  const batch = [];
  for (let j = 0; j < 10; j++) {
    batch.push(['GET', `/api/data/${i + j}`]);
  }
  http.batch(batch);
  sleep(0.1);  // Small delay between batches
}
```

---

### Problem: Cannot Access Response Data

**Symptom:** Response data is undefined

**Cause:** Incorrect array indexing

**Solution:** Verify response array structure

```javascript
const responses = http.batch([
  ['GET', '/api/endpoint1'],
  ['GET', '/api/endpoint2']
]);

console.log(responses.length);  // Check length
console.log(responses[0]);      // Check first response
console.log(responses[0].status);  // Check status
```

---

### Problem: Batch Timing Out

**Symptom:** Batch requests timeout

**Cause:** Too many requests or slow server

**Solution:** Reduce batch size or increase timeout

```javascript
const responses = http.batch([
  ['GET', '/api/endpoint1', null, { timeout: '60s' }],
  ['GET', '/api/endpoint2', null, { timeout: '60s' }]
]);
```

---

## Quick Reference

### Basic Batch

```javascript
const responses = http.batch([
  ['GET', url1],
  ['GET', url2],
  ['POST', url3, body]
]);
```

### With Headers

```javascript
const responses = http.batch([
  ['GET', url, null, { headers: { 'Authorization': token } }]
]);
```

### With Destructuring

```javascript
const [res1, res2, res3] = http.batch([
  ['GET', url1],
  ['GET', url2],
  ['GET', url3]
]);
```

### Performance Comparison

| Approach | 10 Requests (200ms each) | Total Time |
|----------|-------------------------|------------|
| Sequential | 10 × 200ms | 2000ms |
| Batch | max(200ms) | 200ms |
| **Improvement** | | **10x faster** |

---

## Summary

**Batch requests enable realistic, efficient load testing:**

- ✅ **Use batch for parallel requests** - Simulate browser behavior
- ✅ **Keep batch size reasonable** - 5-20 requests per batch
- ✅ **Batch independent requests only** - No dependencies
- ✅ **Handle errors individually** - Check each response
- ✅ **Combine with sequential** - Mix when needed
- ✅ **Simulate real behavior** - Page loads, API aggregation
- ✅ **Add tags for metrics** - Track batch performance
- ❌ **Don't batch dependent requests** - Login → protected resource
- ❌ **Don't create huge batches** - Overwhelming server/client

**Master batch requests, and you'll create faster, more realistic load tests that accurately simulate modern web applications.**
