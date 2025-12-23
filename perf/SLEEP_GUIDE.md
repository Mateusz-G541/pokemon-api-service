# K6 Sleep: Complete Guide to Realistic Pacing and Think Time

A comprehensive guide to using k6's sleep function for realistic user behavior simulation, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Sleep?](#what-is-sleep)
2. [Think Time Theory: Deep Dive](#think-time-theory-deep-dive)
3. [Sleep Syntax & Mechanics](#sleep-syntax--mechanics)
4. [Why Sleep Matters](#why-sleep-matters)
5. [Fixed vs Random Sleep](#fixed-vs-random-sleep)
6. [Realistic Think Time Patterns](#realistic-think-time-patterns)
7. [Pacing Strategies](#pacing-strategies)
8. [Sleep and Performance Metrics](#sleep-and-performance-metrics)
9. [Common Patterns](#common-patterns)
10. [Real-World Examples](#real-world-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## What Is Sleep?

**Sleep** is k6's function for pausing test execution, simulating the time a real user spends reading, thinking, or waiting between actions.

### Core Concept

```javascript
import { sleep } from 'k6';
import http from 'k6/http';

export default function () {
  http.get('https://example.com/page1');
  sleep(2);  // Wait 2 seconds
  http.get('https://example.com/page2');
  sleep(3);  // Wait 3 seconds
  http.get('https://example.com/page3');
}
```

**What happens:**
1. Request page1
2. **Pause for 2 seconds** (simulating user reading)
3. Request page2
4. **Pause for 3 seconds** (simulating user reading)
5. Request page3

### Without Sleep (Unrealistic)

```javascript
export default function () {
  http.get('https://example.com/page1');  // 0.2s
  http.get('https://example.com/page2');  // 0.2s
  http.get('https://example.com/page3');  // 0.2s
}
// Total: 0.6s per iteration
// 1 VU = 100 iterations/minute = 300 requests/minute
```

**Problem:** No real user makes 300 requests per minute!

### With Sleep (Realistic)

```javascript
export default function () {
  http.get('https://example.com/page1');  // 0.2s
  sleep(2);                               // 2s
  http.get('https://example.com/page2');  // 0.2s
  sleep(3);                               // 3s
  http.get('https://example.com/page3');  // 0.2s
}
// Total: 5.6s per iteration
// 1 VU = 10.7 iterations/minute = 32 requests/minute
```

**Solution:** Realistic user behavior!

---

## Think Time Theory: Deep Dive

### What Is Think Time?

**Think time** is the pause between user actions representing:
- Reading content
- Making decisions
- Filling out forms
- Navigating UI
- Natural human delays

### Real User Behavior

```
User Journey: Buy a Product

Action                  | Time
------------------------|-------
Homepage load           | 0.5s
[Read homepage]         | 3s     ← Think time
Click category          | 0.3s
[Browse products]       | 5s     ← Think time
Click product           | 0.3s
[Read details]          | 8s     ← Think time
Add to cart             | 0.2s
[Review cart]           | 2s     ← Think time
Checkout                | 0.4s
[Fill form]             | 15s    ← Think time
Submit order            | 0.5s

Total: 35.5s (30s is think time!)
```

**Think time = 84% of total time!**

### Without Think Time (Unrealistic Load)

```javascript
export default function () {
  http.get('/');                    // 0.5s
  http.get('/category/electronics'); // 0.3s
  http.get('/product/123');         // 0.3s
  http.post('/cart', item);         // 0.2s
  http.post('/checkout', order);    // 0.4s
}
// Total: 1.7s per user journey
// 1 VU = 35 journeys/minute
```

**Problem:** Creates artificial load patterns:
- ❌ Unrealistic request rate
- ❌ No cache warming
- ❌ Constant CPU hammering
- ❌ False bottlenecks
- ❌ Doesn't match production traffic

### With Think Time (Realistic Load)

```javascript
export default function () {
  http.get('/');                    // 0.5s
  sleep(3);                         // Think: read homepage
  
  http.get('/category/electronics'); // 0.3s
  sleep(5);                         // Think: browse products
  
  http.get('/product/123');         // 0.3s
  sleep(8);                         // Think: read details
  
  http.post('/cart', item);         // 0.2s
  sleep(2);                         // Think: review cart
  
  http.post('/checkout', order);    // 0.4s
  sleep(15);                        // Think: fill form
}
// Total: 35.2s per user journey
// 1 VU = 1.7 journeys/minute
```

**Solution:** Realistic traffic patterns!

### Impact on System Behavior

**Without sleep:**
```
Requests: ████████████████████████████████
Cache:    [cold] [cold] [cold] [cold] [cold]
CPU:      100%  100%  100%  100%  100%
```

**With sleep:**
```
Requests: ██  ██  ██  ██  ██  ██  ██  ██
Cache:    [warm] [warm] [warm] [warm]
CPU:      60%  40%  60%  40%  60%  40%
```

Sleep allows:
- ✅ Cache warming
- ✅ CPU breathing room
- ✅ Connection pooling
- ✅ Realistic concurrency
- ✅ Natural traffic patterns

---

## Sleep Syntax & Mechanics

### Basic Syntax

```javascript
sleep(duration)
```

**Parameter:**
- `duration` (number): Sleep time in **seconds** (can be decimal)

### Duration Examples

```javascript
sleep(1);      // 1 second
sleep(0.5);    // 500 milliseconds
sleep(2.5);    // 2.5 seconds
sleep(0.1);    // 100 milliseconds
sleep(10);     // 10 seconds
```

### Precision

```javascript
// k6 sleep is precise to milliseconds
sleep(0.001);  // 1 millisecond
sleep(0.01);   // 10 milliseconds
sleep(0.1);    // 100 milliseconds
```

### What Sleep Does

```javascript
export default function () {
  console.log('Start:', Date.now());
  
  sleep(2);
  
  console.log('After 2s:', Date.now());
  
  sleep(0.5);
  
  console.log('After 2.5s:', Date.now());
}
```

**Output:**
```
Start: 1703342567000
After 2s: 1703342569000  (2000ms later)
After 2.5s: 1703342569500  (500ms later)
```

### Sleep Blocks Execution

```javascript
export default function () {
  console.log('1. Before sleep');
  
  sleep(2);  // Execution pauses here
  
  console.log('2. After sleep (2s later)');
  
  http.get('https://example.com');
}
```

**Execution order:** 1 → [wait 2s] → 2 → HTTP request

---

## Why Sleep Matters

### 1. Realistic Request Rate

**Without sleep:**
```javascript
// 1 VU hammering server
export default function () {
  for (let i = 0; i < 100; i++) {
    http.get('/api/data');  // ~200ms each
  }
}
// 100 requests in 20 seconds = 5 req/s per VU
// 100 VUs = 500 req/s
```

**With sleep:**
```javascript
// 1 VU behaving like real user
export default function () {
  for (let i = 0; i < 100; i++) {
    http.get('/api/data');  // ~200ms
    sleep(5);               // 5s think time
  }
}
// 100 requests in 520 seconds = 0.19 req/s per VU
// 100 VUs = 19 req/s
```

**More realistic!**

### 2. Cache Behavior

**Without sleep (cache thrashing):**
```javascript
export default function () {
  http.get('/api/products/1');  // Cache miss
  http.get('/api/products/2');  // Cache miss
  http.get('/api/products/3');  // Cache miss
  // All different products, no cache hits
}
```

**With sleep (cache warming):**
```javascript
export default function () {
  http.get('/api/products/1');  // Cache miss
  sleep(2);
  http.get('/api/products/1');  // Cache HIT!
  sleep(3);
  http.get('/api/products/1');  // Cache HIT!
}
```

### 3. Connection Pooling

**Without sleep (connection exhaustion):**
```javascript
export default function () {
  // 100 requests instantly
  for (let i = 0; i < 100; i++) {
    http.get('/api/data');
  }
  // Needs 100 connections immediately
}
```

**With sleep (connection reuse):**
```javascript
export default function () {
  for (let i = 0; i < 100; i++) {
    http.get('/api/data');
    sleep(1);  // Connection can be reused
  }
  // Needs only a few connections
}
```

### 4. Database Connection Pooling

**Without sleep:**
```
DB Pool: [conn1] [conn2] [conn3] ... [conn100]
All connections used simultaneously
Pool exhausted!
```

**With sleep:**
```
DB Pool: [conn1] [conn2] [conn3]
Connections returned to pool between requests
Pool never exhausted
```

### 5. Realistic Concurrency

**Without sleep:**
```
Time: 0s    1s    2s    3s
VU1:  ████████████████████  (20 requests)
VU2:  ████████████████████  (20 requests)
VU3:  ████████████████████  (20 requests)

Peak concurrency: 60 simultaneous requests
```

**With sleep:**
```
Time: 0s    1s    2s    3s    4s    5s
VU1:  █  █  █  █  █  █  █  █  █  █
VU2:  █  █  █  █  █  █  █  █  █  █
VU3:  █  █  █  █  █  █  █  █  █  █

Peak concurrency: 3 simultaneous requests
```

---

## Fixed vs Random Sleep

### Fixed Sleep

```javascript
export default function () {
  http.get('/api/data');
  sleep(2);  // Always 2 seconds
}
```

**Characteristics:**
- ✅ Predictable
- ✅ Easy to reason about
- ❌ Unrealistic (humans vary)
- ❌ Can create synchronized load spikes

### Random Sleep

```javascript
export default function () {
  http.get('/api/data');
  sleep(Math.random() * 3 + 1);  // 1-4 seconds
}
```

**Characteristics:**
- ✅ More realistic
- ✅ Prevents synchronization
- ✅ Natural variation
- ❌ Less predictable

### Helper Function for Random Sleep

```javascript
function randomSleep(min, max) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

export default function () {
  http.get('/api/page1');
  randomSleep(1, 3);  // 1-3 seconds
  
  http.get('/api/page2');
  randomSleep(2, 5);  // 2-5 seconds
}
```

### Normal Distribution (More Realistic)

```javascript
// Box-Muller transform for normal distribution
function normalRandom(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function normalSleep(mean, stdDev) {
  const duration = Math.max(0.1, normalRandom(mean, stdDev));
  sleep(duration);
}

export default function () {
  http.get('/api/data');
  normalSleep(3, 0.5);  // Mean 3s, std dev 0.5s
  // Most sleeps will be 2.5-3.5s, some outliers
}
```

---

## Realistic Think Time Patterns

### Reading Content

```javascript
export default function () {
  // Short article (300 words)
  http.get('/blog/short-article');
  sleep(randomBetween(30, 60));  // 30-60 seconds
  
  // Long article (1500 words)
  http.get('/blog/long-article');
  sleep(randomBetween(120, 300));  // 2-5 minutes
  
  // Product description
  http.get('/product/123');
  sleep(randomBetween(5, 15));  // 5-15 seconds
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

### Form Filling

```javascript
export default function () {
  // Simple form (name, email)
  http.get('/signup');
  sleep(randomBetween(10, 30));  // 10-30 seconds
  http.post('/signup', simpleFormData);
  
  // Complex form (checkout)
  http.get('/checkout');
  sleep(randomBetween(60, 180));  // 1-3 minutes
  http.post('/checkout', checkoutData);
  
  // Quick action (newsletter)
  http.get('/newsletter');
  sleep(randomBetween(3, 8));  // 3-8 seconds
  http.post('/newsletter', { email: 'user@example.com' });
}
```

### Navigation

```javascript
export default function () {
  // Homepage → Category (quick decision)
  http.get('/');
  sleep(randomBetween(2, 5));
  
  // Category → Product (browsing)
  http.get('/category/electronics');
  sleep(randomBetween(5, 15));
  
  // Product → Product (comparing)
  http.get('/product/123');
  sleep(randomBetween(8, 20));
  http.get('/product/456');
  sleep(randomBetween(8, 20));
}
```

### User Types

```javascript
export default function () {
  const userType = Math.random();
  
  if (userType < 0.3) {
    // Quick browser (30%)
    http.get('/');
    sleep(randomBetween(1, 3));
    http.get('/category/electronics');
    sleep(randomBetween(2, 5));
    // Leaves
  } else if (userType < 0.7) {
    // Normal user (40%)
    http.get('/');
    sleep(randomBetween(3, 7));
    http.get('/category/electronics');
    sleep(randomBetween(5, 15));
    http.get('/product/123');
    sleep(randomBetween(10, 30));
  } else {
    // Detailed researcher (30%)
    http.get('/');
    sleep(randomBetween(5, 10));
    http.get('/category/electronics');
    sleep(randomBetween(10, 30));
    http.get('/product/123');
    sleep(randomBetween(30, 60));
    http.get('/product/456');
    sleep(randomBetween(30, 60));
    http.get('/compare?ids=123,456');
    sleep(randomBetween(45, 90));
  }
}
```

---

## Pacing Strategies

### Constant Pacing

Ensure each iteration takes a fixed time:

```javascript
export default function () {
  const iterationStart = Date.now();
  const targetDuration = 10000;  // 10 seconds
  
  // Do work
  http.get('/api/data');
  http.post('/api/action', data);
  
  // Calculate remaining time
  const elapsed = Date.now() - iterationStart;
  const remaining = targetDuration - elapsed;
  
  if (remaining > 0) {
    sleep(remaining / 1000);  // Convert to seconds
  }
}
```

**Result:** Each iteration takes exactly 10 seconds

### Variable Pacing

Different pacing for different actions:

```javascript
export default function () {
  // Fast actions
  http.get('/api/quick');
  sleep(0.5);
  
  // Medium actions
  http.get('/api/normal');
  sleep(2);
  
  // Slow actions
  http.get('/api/slow');
  sleep(5);
}
```

### Time-of-Day Pacing

Simulate different user behavior by time:

```javascript
export default function () {
  const hour = new Date().getHours();
  
  let thinkTime;
  if (hour >= 9 && hour < 17) {
    // Business hours: users are busy, quick actions
    thinkTime = randomBetween(1, 3);
  } else if (hour >= 17 && hour < 22) {
    // Evening: users are relaxed, slower browsing
    thinkTime = randomBetween(3, 8);
  } else {
    // Night: minimal traffic, very slow
    thinkTime = randomBetween(10, 30);
  }
  
  http.get('/api/data');
  sleep(thinkTime);
}
```

---

## Sleep and Performance Metrics

### Sleep Is NOT Counted in Request Metrics

```javascript
export default function () {
  http.get('/api/data');  // 200ms - COUNTED
  sleep(5);               // 5s - NOT COUNTED
}
```

**Metrics:**
```
http_req_duration: avg=200ms  ← Only request time
iteration_duration: avg=5.2s  ← Includes sleep
```

### Sleep IS Counted in Iteration Duration

```javascript
export default function () {
  http.get('/api/data');  // 0.2s
  sleep(2);               // 2s
  http.get('/api/data2'); // 0.3s
  sleep(3);               // 3s
}
```

**Metrics:**
```
iteration_duration: avg=5.5s  ← Total time including sleep
```

### Group Duration Includes Sleep

```javascript
import { group } from 'k6';

export default function () {
  group('User Journey', function () {
    http.get('/api/page1');  // 0.2s
    sleep(2);                // 2s
    http.get('/api/page2');  // 0.3s
    sleep(3);                // 3s
  });
}
```

**Metrics:**
```
group_duration{group:::User Journey}: avg=5.5s  ← Includes sleep
```

---

## Common Patterns

### Pattern 1: Think Time Helper

```javascript
// utils/helper.js
export function thinkTime(min = 0.5, max = 3) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

// test.js
import { thinkTime } from './utils/helper.js';

export default function () {
  http.get('/api/page1');
  thinkTime();  // 0.5-3s
  
  http.get('/api/page2');
  thinkTime(1, 5);  // 1-5s
}
```

### Pattern 2: Action-Specific Think Time

```javascript
const THINK_TIMES = {
  quickGlance: () => randomBetween(0.5, 2),
  reading: () => randomBetween(3, 10),
  formFilling: () => randomBetween(15, 45),
  comparing: () => randomBetween(10, 30),
  deciding: () => randomBetween(5, 15)
};

export default function () {
  http.get('/');
  sleep(THINK_TIMES.quickGlance());
  
  http.get('/product/123');
  sleep(THINK_TIMES.reading());
  
  http.get('/checkout');
  sleep(THINK_TIMES.formFilling());
}
```

### Pattern 3: Cumulative Think Time

```javascript
export default function () {
  let totalThinkTime = 0;
  
  http.get('/page1');
  const think1 = randomBetween(1, 3);
  sleep(think1);
  totalThinkTime += think1;
  
  http.get('/page2');
  const think2 = randomBetween(2, 5);
  sleep(think2);
  totalThinkTime += think2;
  
  console.log(`Total think time: ${totalThinkTime}s`);
}
```

### Pattern 4: Conditional Sleep

```javascript
export default function () {
  const response = http.get('/api/data');
  
  if (response.status === 200) {
    // Success: user reads result
    sleep(randomBetween(3, 8));
  } else {
    // Error: user quickly retries
    sleep(randomBetween(0.5, 2));
  }
}
```

### Pattern 5: Progressive Sleep

```javascript
export default function () {
  // First page: quick glance
  http.get('/page1');
  sleep(1);
  
  // Second page: more interest
  http.get('/page2');
  sleep(3);
  
  // Third page: deep reading
  http.get('/page3');
  sleep(8);
  
  // Fourth page: very engaged
  http.get('/page4');
  sleep(15);
}
```

---

## Real-World Examples

### Example 1: E-commerce User Journey

```javascript
import { sleep } from 'k6';
import http from 'k6/http';

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export default function () {
  // 1. Homepage
  http.get('https://shop.example.com/');
  sleep(randomBetween(2, 5));  // Browse homepage
  
  // 2. Search for product
  http.get('https://shop.example.com/search?q=laptop');
  sleep(randomBetween(3, 8));  // Review search results
  
  // 3. View product details
  http.get('https://shop.example.com/products/laptop-123');
  sleep(randomBetween(10, 30));  // Read specs, reviews
  
  // 4. Compare with another product
  http.get('https://shop.example.com/products/laptop-456');
  sleep(randomBetween(8, 20));  // Compare features
  
  // 5. Add to cart (50% of users)
  if (Math.random() < 0.5) {
    http.post('https://shop.example.com/cart', {
      productId: 'laptop-123',
      quantity: 1
    });
    sleep(randomBetween(1, 3));  // Review cart
    
    // 6. Proceed to checkout (70% of those who added to cart)
    if (Math.random() < 0.7) {
      http.get('https://shop.example.com/checkout');
      sleep(randomBetween(30, 90));  // Fill shipping/payment info
      
      http.post('https://shop.example.com/checkout', checkoutData);
      sleep(randomBetween(2, 5));  // View confirmation
    }
  }
}
```

### Example 2: Content Website

```javascript
export default function () {
  // Homepage
  http.get('https://blog.example.com/');
  sleep(randomBetween(3, 8));  // Scan headlines
  
  // Click on article
  http.get('https://blog.example.com/article/how-to-code');
  sleep(randomBetween(60, 180));  // Read article (1-3 minutes)
  
  // Scroll to comments
  http.get('https://blog.example.com/article/how-to-code/comments');
  sleep(randomBetween(10, 30));  // Read comments
  
  // Related article (30% click through)
  if (Math.random() < 0.3) {
    http.get('https://blog.example.com/article/related-topic');
    sleep(randomBetween(45, 120));  // Read related article
  }
}
```

### Example 3: SaaS Application

```javascript
export default function () {
  // Login
  const loginRes = http.post('https://app.example.com/api/login', {
    email: 'user@example.com',
    password: 'password123'
  });
  const token = loginRes.json('token');
  sleep(randomBetween(1, 3));  // Wait for redirect
  
  // Dashboard
  http.get('https://app.example.com/api/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(randomBetween(5, 15));  // Review dashboard
  
  // View reports
  http.get('https://app.example.com/api/reports', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(randomBetween(10, 30));  // Analyze reports
  
  // Generate new report
  http.post('https://app.example.com/api/reports/generate', {
    dateRange: 'last-30-days'
  }, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(randomBetween(3, 8));  // Wait for generation
  
  // Download report
  http.get('https://app.example.com/api/reports/123/download', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  sleep(randomBetween(1, 3));  // Download completes
}
```

### Example 4: API with Rate Limiting

```javascript
export default function () {
  const RATE_LIMIT = 10;  // 10 requests per second
  const SLEEP_TIME = 1 / RATE_LIMIT;  // 0.1 seconds
  
  for (let i = 0; i < 50; i++) {
    http.get('https://api.example.com/data');
    sleep(SLEEP_TIME);  // Respect rate limit
  }
}
```

### Example 5: Mobile App Simulation

```javascript
export default function () {
  // App launch
  http.get('https://api.example.com/app/init');
  sleep(randomBetween(1, 3));  // Splash screen
  
  // Pull to refresh
  http.get('https://api.example.com/feed');
  sleep(randomBetween(2, 5));  // Scroll through feed
  
  // Tap on item
  http.get('https://api.example.com/items/123');
  sleep(randomBetween(5, 15));  // View details
  
  // Swipe back
  sleep(randomBetween(0.5, 1));  // Animation
  
  // Scroll more
  http.get('https://api.example.com/feed?page=2');
  sleep(randomBetween(3, 10));  // More scrolling
  
  // Background (app minimized)
  sleep(randomBetween(30, 300));  // User does something else
  
  // Return to app
  http.get('https://api.example.com/feed');  // Refresh
  sleep(randomBetween(2, 5));
}
```

---

## Best Practices

### 1. Always Use Sleep for Realistic Tests

```javascript
// ✅ Good: Realistic user behavior
export default function () {
  http.get('/api/data');
  sleep(2);
}

// ❌ Bad: Unrealistic hammering
export default function () {
  http.get('/api/data');
  // No sleep!
}
```

### 2. Use Random Sleep for Variation

```javascript
// ✅ Good: Natural variation
export default function () {
  http.get('/api/data');
  sleep(randomBetween(1, 5));
}

// ⚠️ OK but less realistic: Fixed sleep
export default function () {
  http.get('/api/data');
  sleep(3);
}
```

### 3. Match Sleep to User Action

```javascript
// ✅ Good: Action-appropriate sleep
export default function () {
  http.get('/quick-action');
  sleep(0.5);  // Quick glance
  
  http.get('/article');
  sleep(60);  // Reading time
  
  http.get('/checkout');
  sleep(120);  // Form filling
}
```

### 4. Don't Sleep Too Long

```javascript
// ✅ Good: Reasonable sleep
export default function () {
  http.get('/api/data');
  sleep(randomBetween(1, 10));
}

// ❌ Bad: Excessive sleep
export default function () {
  http.get('/api/data');
  sleep(randomBetween(60, 300));  // 1-5 minutes!
}
```

**Why:** Long sleeps waste VU capacity. Use more VUs with shorter sleeps instead.

### 5. Consider Test Duration

```javascript
// For 5-minute test
export default function () {
  http.get('/api/data');
  sleep(2);  // ~150 iterations per VU
}

// For 1-hour test
export default function () {
  http.get('/api/data');
  sleep(10);  // ~360 iterations per VU
}
```

### 6. Use Helper Functions

```javascript
// ✅ Good: Reusable helper
function thinkTime(min = 1, max = 5) {
  sleep(min + Math.random() * (max - min));
}

export default function () {
  http.get('/api/data');
  thinkTime();
  thinkTime(2, 10);
}
```

### 7. Document Sleep Rationale

```javascript
// ✅ Good: Documented
export default function () {
  http.get('/product/123');
  sleep(randomBetween(10, 30));  // User reads product description
  
  http.post('/cart', item);
  sleep(randomBetween(1, 3));  // User reviews cart
}
```

---

## Troubleshooting

### Problem: Test Runs Too Slow

**Symptom:** Test takes forever to complete

**Cause:** Sleep times too long

**Solution:** Reduce sleep times or use more VUs

```javascript
// ❌ Bad: Too slow
export default function () {
  http.get('/api/data');
  sleep(60);  // 1 minute!
}

// ✅ Good: Reasonable
export default function () {
  http.get('/api/data');
  sleep(3);  // 3 seconds
}
```

---

### Problem: Not Enough Requests

**Symptom:** Test doesn't generate enough load

**Cause:** Too much sleep relative to VUs

**Solution:** Reduce sleep or increase VUs

```javascript
// Current: 10 VUs, 5s sleep = 2 req/s per VU = 20 req/s total

// Option 1: Reduce sleep
export default function () {
  http.get('/api/data');
  sleep(1);  // 10 VUs × 1 req/s = 10 req/s (but less realistic)
}

// Option 2: Increase VUs (better)
// 50 VUs, 5s sleep = 0.2 req/s per VU = 10 req/s total (more realistic)
```

---

### Problem: Synchronized Load Spikes

**Symptom:** All VUs hit server at same time

**Cause:** Fixed sleep causes synchronization

**Solution:** Use random sleep

```javascript
// ❌ Bad: All VUs synchronized
export default function () {
  http.get('/api/data');
  sleep(5);  // All VUs sleep exactly 5s
}

// ✅ Good: VUs desynchronized
export default function () {
  http.get('/api/data');
  sleep(randomBetween(3, 7));  // VUs spread out
}
```

---

### Problem: Sleep Not Working

**Symptom:** Sleep seems to have no effect

**Cause:** Forgot to import

**Solution:**
```javascript
// ✅ Add import
import { sleep } from 'k6';

export default function () {
  http.get('/api/data');
  sleep(2);
}
```

---

## Quick Reference

### Basic Sleep

```javascript
import { sleep } from 'k6';

sleep(2);      // 2 seconds
sleep(0.5);    // 500ms
sleep(2.5);    // 2.5 seconds
```

### Random Sleep

```javascript
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

sleep(randomBetween(1, 5));  // 1-5 seconds
```

### Think Time Helper

```javascript
function thinkTime(min = 0.5, max = 3) {
  sleep(min + Math.random() * (max - min));
}

thinkTime();        // 0.5-3s
thinkTime(1, 5);    // 1-5s
```

### Typical Think Times

| Action | Think Time |
|--------|-----------|
| Quick glance | 0.5-2s |
| Reading short text | 3-10s |
| Reading article | 60-180s |
| Form filling (simple) | 10-30s |
| Form filling (complex) | 60-180s |
| Comparing products | 10-30s |
| Making decision | 5-15s |

---

## Summary

**Sleep is essential for realistic load testing:**

- ✅ **Always use sleep** for realistic user behavior
- ✅ **Use random sleep** for natural variation
- ✅ **Match sleep to action** (reading, filling forms, etc.)
- ✅ **Prevent synchronization** with randomization
- ✅ **Allow cache warming** with appropriate pauses
- ✅ **Respect rate limits** with calculated sleep
- ✅ **Document rationale** for sleep times
- ❌ **Don't skip sleep** - creates unrealistic load
- ❌ **Don't sleep too long** - wastes VU capacity

**Master sleep, and you'll create realistic, production-like load tests that accurately predict system behavior.**
