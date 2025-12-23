# K6 Graceful Stop: Complete Guide to Clean Shutdown

A comprehensive guide to k6's graceful stop mechanism for clean test termination, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Graceful Stop?](#what-is-graceful-stop)
2. [Graceful Stop Theory: Deep Dive](#graceful-stop-theory-deep-dive)
3. [gracefulStop Option](#gracefulstop-option)
4. [gracefulRampDown Option](#gracefulrampdown-option)
5. [Shutdown Behavior](#shutdown-behavior)
6. [Interrupting Tests](#interrupting-tests)
7. [Cleanup Patterns](#cleanup-patterns)
8. [Real-World Examples](#real-world-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## What Is Graceful Stop?

**Graceful stop** is k6's mechanism for cleanly terminating a test, allowing VUs to complete their current iteration before stopping.

### The Problem: Abrupt Termination

**Without graceful stop:**
```javascript
export const options = {
  duration: '30s',
  vus: 10
};

export default function () {
  http.post('/api/start-transaction');  // Started
  sleep(5);
  http.post('/api/complete-transaction');  // ❌ Never completes if test ends
}
```

**Timeline:**
```
Time:  0s    25s    30s
       |-----|------|
       VUs running
              VU starts iteration
                     Test ends ← VU killed mid-iteration!
```

**Problems:**
- ❌ Incomplete transactions
- ❌ Orphaned resources
- ❌ Inconsistent state
- ❌ Misleading metrics

### The Solution: Graceful Stop

**With graceful stop:**
```javascript
export const options = {
  duration: '30s',
  vus: 10,
  gracefulStop: '10s'  // Allow 10s for VUs to finish
};

export default function () {
  http.post('/api/start-transaction');
  sleep(5);
  http.post('/api/complete-transaction');  // ✅ Completes
}
```

**Timeline:**
```
Time:  0s    25s    30s         40s
       |-----|------|-----------|
       VUs running
              VU starts iteration
                     Test ends → Wait for VU
                                 VU completes ← Clean shutdown
```

**Benefits:**
- ✅ Iterations complete
- ✅ Clean state
- ✅ Accurate metrics
- ✅ No orphaned resources

---

## Graceful Stop Theory: Deep Dive

### Test Lifecycle with Graceful Stop

```
┌─────────────────────────────────────────────────────┐
│              Test Execution Timeline                │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Init Phase                                  │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Setup Phase                                 │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  VU Phase (duration)                         │  │
│  │  - VUs execute iterations                    │  │
│  │  - New iterations stop at duration end       │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Graceful Stop Period                        │  │
│  │  - No new iterations start                   │  │
│  │  - Running iterations complete               │  │
│  │  - Wait up to gracefulStop duration          │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Teardown Phase                              │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Test Complete                               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### VU Behavior During Graceful Stop

**Normal execution:**
```javascript
export default function () {
  console.log('Iteration start');
  http.get('/api/data');
  sleep(2);
  console.log('Iteration end');
}
```

**At duration end:**
```
VU 1: [Iteration 10 running] → Completes → Stops
VU 2: [Iteration 8 running]  → Completes → Stops
VU 3: [Between iterations]   → Stops immediately
VU 4: [Iteration 12 running] → Completes → Stops
```

**Key points:**
- VUs in iteration: Complete current iteration
- VUs between iterations: Stop immediately
- No new iterations start after duration ends

### Graceful Stop Timeout

```javascript
export const options = {
  duration: '30s',
  gracefulStop: '10s'  // Wait up to 10s
};
```

**Scenarios:**

**Scenario 1: VU finishes within timeout**
```
Duration ends at 30s
VU has 5s left in iteration
VU completes at 35s (within 10s timeout)
✅ Clean shutdown
```

**Scenario 2: VU exceeds timeout**
```
Duration ends at 30s
VU has 15s left in iteration
Timeout at 40s (30s + 10s)
VU forcefully stopped at 40s
⚠️ Iteration incomplete
```

### Default Graceful Stop

**If not specified:**
```javascript
export const options = {
  duration: '30s'
  // gracefulStop defaults to 30s
};
```

**Default:** `gracefulStop = 30s`

---

## gracefulStop Option

### Basic Usage

```javascript
export const options = {
  duration: '1m',
  vus: 10,
  gracefulStop: '15s'  // Wait up to 15s for iterations to complete
};

export default function () {
  http.get('/api/data');
  sleep(5);
}
```

### Setting Graceful Stop

**String format:**
```javascript
export const options = {
  gracefulStop: '10s',   // 10 seconds
  gracefulStop: '1m',    // 1 minute
  gracefulStop: '30s'    // 30 seconds
};
```

**Number format (seconds):**
```javascript
export const options = {
  gracefulStop: 10,   // 10 seconds
  gracefulStop: 60,   // 60 seconds
  gracefulStop: 0     // No graceful stop (force stop)
};
```

### Zero Graceful Stop

```javascript
export const options = {
  duration: '30s',
  gracefulStop: '0s'  // Force stop immediately
};

export default function () {
  http.get('/api/data');
  sleep(10);  // May be interrupted
}
```

**Use case:** When you don't care about incomplete iterations

### Long Graceful Stop

```javascript
export const options = {
  duration: '5m',
  gracefulStop: '2m'  // Allow 2 minutes for cleanup
};

export default function () {
  // Long-running transaction
  http.post('/api/start-batch-job');
  sleep(60);  // Wait for job
  http.get('/api/batch-job/status');
}
```

**Use case:** Long-running operations that must complete

---

## gracefulRampDown Option

### What Is Graceful Ramp Down?

**gracefulRampDown** controls how VUs are stopped during ramp-down stages.

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50
    { duration: '2m', target: 50 },   // Stay at 50
    { duration: '1m', target: 0 }     // Ramp down to 0
  ],
  gracefulRampDown: '30s'  // Wait for VUs during ramp down
};
```

### Ramp Down Behavior

**Without gracefulRampDown:**
```
Stage 3 starts (ramp down from 50 to 0)
VU 50: [In iteration] → ❌ Killed immediately
VU 49: [In iteration] → ❌ Killed immediately
...
```

**With gracefulRampDown:**
```
Stage 3 starts (ramp down from 50 to 0)
VU 50: [In iteration] → ✅ Completes → Stops
VU 49: [In iteration] → ✅ Completes → Stops
...
```

### Example: Ramping Scenario

```javascript
export const options = {
  scenarios: {
    ramping_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // Ramp up
        { duration: '1m', target: 20 },   // Steady
        { duration: '30s', target: 0 }    // Ramp down
      ],
      gracefulRampDown: '20s',  // Allow 20s during ramp down
      gracefulStop: '30s'       // Allow 30s at test end
    }
  }
};

export default function () {
  http.get('/api/data');
  sleep(5);
}
```

**Timeline:**
```
0-30s:   Ramp up to 20 VUs
30s-90s: Stay at 20 VUs
90s-120s: Ramp down to 0 VUs (with 20s graceful period)
120s+:   Graceful stop period (30s max)
```

---

## Shutdown Behavior

### Normal Shutdown

**Test completes normally:**
```javascript
export const options = {
  duration: '30s',
  vus: 10,
  gracefulStop: '10s'
};
```

**Shutdown sequence:**
1. Duration ends (30s)
2. No new iterations start
3. Running iterations continue
4. Wait up to gracefulStop (10s)
5. All VUs stopped
6. Teardown runs
7. Test complete

### Forced Shutdown

**VU exceeds gracefulStop:**
```javascript
export const options = {
  duration: '30s',
  gracefulStop: '5s'
};

export default function () {
  http.get('/api/data');
  sleep(10);  // Takes longer than gracefulStop
}
```

**What happens:**
```
30s: Duration ends
35s: gracefulStop timeout
     VU forcefully stopped (sleep interrupted)
     ⚠️ Iteration incomplete
```

### Ctrl+C Behavior

**First Ctrl+C:**
```
User presses Ctrl+C
→ Triggers graceful stop
→ Waits for iterations to complete
→ Up to gracefulStop duration
```

**Second Ctrl+C:**
```
User presses Ctrl+C again
→ Forces immediate stop
→ VUs killed
→ ❌ Iterations incomplete
```

---

## Interrupting Tests

### Manual Interruption

**Single Ctrl+C (graceful):**
```bash
$ k6 run script.js
# Press Ctrl+C once
^C
WARN[0015] Gracefully stopping... Press Ctrl+C again to force.
INFO[0020] All VUs finished
```

**Double Ctrl+C (force):**
```bash
$ k6 run script.js
# Press Ctrl+C once
^C
WARN[0015] Gracefully stopping... Press Ctrl+C again to force.
# Press Ctrl+C again
^C
WARN[0016] Forcefully stopping, some iterations may be incomplete
```

### Interrupt Handling in Script

```javascript
export default function () {
  try {
    http.post('/api/start-transaction');
    sleep(5);
    http.post('/api/complete-transaction');
  } catch (error) {
    // Cleanup if interrupted
    console.error('Iteration interrupted:', error);
    http.post('/api/rollback-transaction');
  }
}
```

**Note:** k6 doesn't throw errors on interrupt, but good practice for cleanup logic.

---

## Cleanup Patterns

### Pattern 1: Teardown Cleanup

```javascript
export function setup() {
  // Create test resources
  const res = http.post('/api/test-data');
  return { testId: res.json('id') };
}

export default function (data) {
  // Use test resources
  http.get(`/api/test-data/${data.testId}`);
}

export function teardown(data) {
  // Cleanup always runs (even after graceful stop)
  console.log('Cleaning up test data...');
  http.del(`/api/test-data/${data.testId}`);
  console.log('Cleanup complete');
}
```

**Teardown runs after graceful stop completes!**

### Pattern 2: Per-Iteration Cleanup

```javascript
export default function () {
  // Create temporary resource
  const createRes = http.post('/api/temp-resource');
  const resourceId = createRes.json('id');
  
  try {
    // Use resource
    http.get(`/api/temp-resource/${resourceId}`);
    sleep(2);
  } finally {
    // Always cleanup (even if interrupted)
    http.del(`/api/temp-resource/${resourceId}`);
  }
}
```

### Pattern 3: VU-Level Cleanup

```javascript
let vuResources = [];

export default function () {
  if (__ITER === 0) {
    // First iteration: Create VU resources
    const res = http.post('/api/vu-resource', {
      vuId: __VU
    });
    vuResources.push(res.json('id'));
  }
  
  // Use resources
  http.get(`/api/vu-resource/${vuResources[0]}`);
  
  // Last iteration: Cleanup
  // Note: This won't run if VU is stopped mid-test
  // Use teardown for guaranteed cleanup
}
```

### Pattern 4: Graceful Shutdown Detection

```javascript
import { Counter } from 'k6/metrics';

const completedIterations = new Counter('completed_iterations');
const interruptedIterations = new Counter('interrupted_iterations');

export default function () {
  const iterationStart = Date.now();
  
  http.get('/api/data');
  sleep(5);
  
  const iterationEnd = Date.now();
  const duration = iterationEnd - iterationStart;
  
  // If iteration completed normally
  if (duration < 10000) {  // Expected max duration
    completedIterations.add(1);
  } else {
    interruptedIterations.add(1);
  }
}
```

---

## Real-World Examples

### Example 1: E-commerce Transaction

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    shopping: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 }
      ],
      gracefulRampDown: '30s',  // Allow checkout to complete during ramp down
      gracefulStop: '1m'         // Allow final checkouts to complete
    }
  }
};

export default function () {
  // Browse products
  http.get('https://shop.example.com/api/products');
  sleep(2);
  
  // Add to cart
  const cartRes = http.post('https://shop.example.com/api/cart', 
    JSON.stringify({
      productId: 123,
      quantity: 1
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  check(cartRes, {
    'added to cart': (r) => r.status === 200
  });
  sleep(3);
  
  // Checkout (critical - must complete)
  const checkoutRes = http.post('https://shop.example.com/api/checkout',
    JSON.stringify({
      paymentMethod: 'card'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  
  check(checkoutRes, {
    'checkout successful': (r) => r.status === 200
  });
  
  if (checkoutRes.status === 200) {
    console.log(`VU ${__VU}: Checkout completed successfully`);
  } else {
    console.error(`VU ${__VU}: Checkout failed`);
  }
  
  sleep(2);
}
```

**Why graceful stop matters:**
- Checkout transactions must complete
- Prevents orphaned carts
- Accurate conversion metrics

### Example 2: File Upload with Cleanup

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  duration: '2m',
  vus: 5,
  gracefulStop: '30s'  // Allow uploads to complete
};

export function setup() {
  console.log('Test starting, will cleanup all uploads in teardown');
  return { uploadIds: [] };
}

export default function (data) {
  // Upload file
  const uploadRes = http.post('https://api.example.com/upload',
    {
      file: http.file('test-file.pdf', 'application/pdf')
    }
  );
  
  check(uploadRes, {
    'upload successful': (r) => r.status === 201
  });
  
  if (uploadRes.status === 201) {
    const uploadId = uploadRes.json('id');
    data.uploadIds.push(uploadId);
    
    console.log(`VU ${__VU}: Uploaded file ${uploadId}`);
    
    // Process file
    http.post(`https://api.example.com/upload/${uploadId}/process`);
  }
}

export function teardown(data) {
  console.log(`Cleaning up ${data.uploadIds.length} uploads...`);
  
  // Cleanup all uploads
  data.uploadIds.forEach(uploadId => {
    const deleteRes = http.del(`https://api.example.com/upload/${uploadId}`);
    
    if (deleteRes.status === 204) {
      console.log(`Deleted upload ${uploadId}`);
    } else {
      console.error(`Failed to delete upload ${uploadId}`);
    }
  });
  
  console.log('Cleanup complete');
}
```

### Example 3: Database Transaction

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  duration: '5m',
  vus: 10,
  gracefulStop: '2m'  // Allow long transactions to complete
};

export default function () {
  // Start transaction
  const txnRes = http.post('https://api.example.com/transactions/begin');
  
  check(txnRes, {
    'transaction started': (r) => r.status === 200
  });
  
  if (txnRes.status !== 200) {
    console.error(`VU ${__VU}: Failed to start transaction`);
    return;
  }
  
  const txnId = txnRes.json('transactionId');
  console.log(`VU ${__VU}: Started transaction ${txnId}`);
  
  try {
    // Perform operations
    const op1 = http.post(`https://api.example.com/transactions/${txnId}/operation`,
      JSON.stringify({ action: 'insert', data: { value: 100 } }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(op1, { 'operation 1 success': (r) => r.status === 200 });
    sleep(1);
    
    const op2 = http.post(`https://api.example.com/transactions/${txnId}/operation`,
      JSON.stringify({ action: 'update', data: { value: 200 } }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(op2, { 'operation 2 success': (r) => r.status === 200 });
    sleep(1);
    
    // Commit transaction
    const commitRes = http.post(`https://api.example.com/transactions/${txnId}/commit`);
    
    check(commitRes, {
      'transaction committed': (r) => r.status === 200
    });
    
    if (commitRes.status === 200) {
      console.log(`VU ${__VU}: Transaction ${txnId} committed successfully`);
    } else {
      console.error(`VU ${__VU}: Failed to commit transaction ${txnId}, rolling back`);
      http.post(`https://api.example.com/transactions/${txnId}/rollback`);
    }
    
  } catch (error) {
    // Rollback on error
    console.error(`VU ${__VU}: Error in transaction ${txnId}, rolling back`);
    http.post(`https://api.example.com/transactions/${txnId}/rollback`);
  }
  
  sleep(2);
}
```

### Example 4: Multi-Stage Test with Different Graceful Stops

```javascript
export const options = {
  scenarios: {
    warmup: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      gracefulStop: '5s',  // Quick stop for warmup
      exec: 'warmupTest'
    },
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 }
      ],
      gracefulRampDown: '30s',
      gracefulStop: '1m',  // Longer stop for main test
      startTime: '1m',
      exec: 'loadTest'
    },
    spike_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      gracefulStop: '10s',
      startTime: '5m',
      exec: 'spikeTest'
    }
  }
};

export function warmupTest() {
  http.get('https://api.example.com/health');
}

export function loadTest() {
  http.get('https://api.example.com/api/data');
  sleep(2);
}

export function spikeTest() {
  http.get('https://api.example.com/api/heavy-operation');
  sleep(1);
}
```

---

## Best Practices

### 1. Set Appropriate Graceful Stop

```javascript
// ✅ Good: Based on iteration duration
export const options = {
  duration: '5m',
  gracefulStop: '30s'  // Iterations take ~10-20s
};

// ❌ Bad: Too short
export const options = {
  duration: '5m',
  gracefulStop: '1s'  // Iterations take 10s - will be interrupted!
};

// ❌ Bad: Too long
export const options = {
  duration: '5m',
  gracefulStop: '10m'  // Iterations take 5s - wastes time
};
```

**Rule of thumb:** `gracefulStop = 2-3x max iteration duration`

### 2. Use Teardown for Cleanup

```javascript
// ✅ Good: Guaranteed cleanup
export function teardown(data) {
  // Always runs, even after graceful stop
  cleanupResources(data);
}

// ❌ Bad: Cleanup in VU code
export default function () {
  createResource();
  useResource();
  deleteResource();  // May not run if VU stopped
}
```

### 3. Handle Long Operations

```javascript
// ✅ Good: Appropriate graceful stop for long operations
export const options = {
  duration: '10m',
  gracefulStop: '5m'  // Long operations need time
};

export default function () {
  http.post('/api/start-batch-job');
  sleep(60);  // Wait for job
  http.get('/api/batch-job/status');
}
```

### 4. Use gracefulRampDown for Ramping Tests

```javascript
// ✅ Good: Graceful ramp down
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 }
  ],
  gracefulRampDown: '30s',  // Allow iterations to complete
  gracefulStop: '30s'
};
```

### 5. Log Completion Status

```javascript
// ✅ Good: Track completion
export default function () {
  const start = Date.now();
  
  http.get('/api/data');
  sleep(5);
  
  const duration = Date.now() - start;
  console.log(`VU ${__VU}, Iter ${__ITER}: Completed in ${duration}ms`);
}
```

### 6. Test Graceful Stop Locally

```bash
# Test with short duration and graceful stop
k6 run --duration 10s --graceful-stop 5s script.js

# Verify iterations complete
# Check logs for "Gracefully stopping..."
```

### 7. Consider Critical Transactions

```javascript
// ✅ Good: Longer graceful stop for critical operations
export const options = {
  duration: '5m',
  gracefulStop: '2m'  // Payment transactions must complete
};

export default function () {
  // Critical: Payment processing
  http.post('/api/payment/process', paymentData);
  sleep(10);
  http.get('/api/payment/confirmation');
}
```

---

## Troubleshooting

### Problem: Iterations Incomplete

**Symptom:** Iterations cut off mid-execution

**Cause:** gracefulStop too short

**Solution:** Increase gracefulStop

```javascript
// ❌ Bad: Too short
export const options = {
  gracefulStop: '5s'
};

export default function () {
  http.get('/api/data');
  sleep(10);  // Takes longer than gracefulStop!
}

// ✅ Good: Sufficient time
export const options = {
  gracefulStop: '20s'  // 2x iteration duration
};
```

---

### Problem: Test Takes Too Long to Stop

**Symptom:** Test continues long after duration ends

**Cause:** gracefulStop too long or iterations too slow

**Solution:** Reduce gracefulStop or optimize iterations

```javascript
// Check iteration duration
export default function () {
  const start = Date.now();
  
  http.get('/api/data');
  sleep(5);
  
  const duration = Date.now() - start;
  console.log(`Iteration took ${duration}ms`);
}

// Adjust gracefulStop accordingly
export const options = {
  gracefulStop: '15s'  // Based on observed duration
};
```

---

### Problem: Resources Not Cleaned Up

**Symptom:** Test data remains after test

**Cause:** Cleanup in VU code instead of teardown

**Solution:** Move cleanup to teardown

```javascript
// ❌ Bad: Cleanup in VU code
export default function () {
  const res = http.post('/api/resource');
  const id = res.json('id');
  
  http.get(`/api/resource/${id}`);
  http.del(`/api/resource/${id}`);  // May not run if stopped
}

// ✅ Good: Cleanup in teardown
export function setup() {
  return { resourceIds: [] };
}

export default function (data) {
  const res = http.post('/api/resource');
  data.resourceIds.push(res.json('id'));
}

export function teardown(data) {
  data.resourceIds.forEach(id => {
    http.del(`/api/resource/${id}`);
  });
}
```

---

### Problem: Ctrl+C Doesn't Stop Test

**Symptom:** First Ctrl+C doesn't stop test

**Cause:** Graceful stop in progress

**Solution:** Press Ctrl+C again to force stop

```bash
$ k6 run script.js
^C
WARN[0030] Gracefully stopping... Press Ctrl+C again to force.
# Wait or press Ctrl+C again
^C
WARN[0031] Forcefully stopping
```

---

## Quick Reference

### Basic Configuration

```javascript
export const options = {
  duration: '5m',
  vus: 10,
  gracefulStop: '30s'  // Wait up to 30s for iterations to complete
};
```

### Ramping Configuration

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 }
  ],
  gracefulRampDown: '30s',  // During ramp down
  gracefulStop: '30s'       // At test end
};
```

### Cleanup Pattern

```javascript
export function teardown(data) {
  // Cleanup always runs after graceful stop
  cleanupResources(data);
}
```

### Graceful Stop Values

| Iteration Duration | Recommended gracefulStop |
|-------------------|-------------------------|
| < 5s | 10s |
| 5-15s | 30s |
| 15-30s | 1m |
| 30-60s | 2m |
| > 60s | 5m |

---

## Summary

**Graceful stop ensures clean test termination:**

- ✅ **Set gracefulStop** - Allow iterations to complete
- ✅ **Use teardown** - Guaranteed cleanup
- ✅ **Set gracefulRampDown** - Clean ramp down in stages
- ✅ **Size appropriately** - 2-3x max iteration duration
- ✅ **Test locally** - Verify graceful stop works
- ✅ **Log completion** - Track iteration status
- ✅ **Handle long operations** - Increase timeout for critical transactions
- ❌ **Don't set too short** - Causes incomplete iterations
- ❌ **Don't rely on VU cleanup** - Use teardown instead

**Master graceful stop, and you'll create reliable tests with clean shutdown, complete transactions, and accurate metrics.**
