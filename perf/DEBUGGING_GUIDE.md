# K6 Debugging & Troubleshooting: Complete Guide

A comprehensive guide to debugging k6 tests and troubleshooting common issues, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Debugging in k6?](#what-is-debugging-in-k6)
2. [Debugging Theory: Deep Dive](#debugging-theory-deep-dive)
3. [Console Logging](#console-logging)
4. [HTTP Debugging](#http-debugging)
5. [Metric Debugging](#metric-debugging)
6. [Execution Flow Debugging](#execution-flow-debugging)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Performance Debugging](#performance-debugging)
9. [Advanced Debugging Techniques](#advanced-debugging-techniques)
10. [Real-World Examples](#real-world-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## What Is Debugging in k6?

**Debugging** in k6 is the process of identifying and resolving issues in your load tests, from script errors to unexpected behavior and performance problems.

### Common Debugging Scenarios

**Script errors:**
```javascript
export default function () {
  http.get('https://api.example.com/data');
  // Error: http is not defined
}
```

**Unexpected results:**
```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  console.log('Status:', res.status);  // Expected 200, got 401
}
```

**Performance issues:**
```javascript
export default function () {
  const start = Date.now();
  http.get('https://api.example.com/data');
  const duration = Date.now() - start;
  console.log('Request took:', duration, 'ms');  // Why so slow?
}
```

### Why Debugging Matters

**Without debugging:**
- ❌ Tests fail with cryptic errors
- ❌ Metrics don't make sense
- ❌ Can't reproduce issues
- ❌ Waste time guessing

**With debugging:**
- ✅ Clear error messages
- ✅ Understand test behavior
- ✅ Identify root causes
- ✅ Fix issues quickly

---

## Debugging Theory: Deep Dive

### k6 Execution Model

Understanding how k6 executes helps debug issues:

```
┌─────────────────────────────────────────────────────┐
│              k6 Execution Phases                    │
│                                                     │
│  1. Init Context (per VU)                          │
│     - Load modules                                  │
│     - Define constants                              │
│     - __VU = 0, __ITER = 0                         │
│     - console.log() works                           │
│                                                     │
│  2. Setup Context (once)                            │
│     - Prepare test environment                      │
│     - __VU = 0, __ITER = 0                         │
│     - console.log() works                           │
│                                                     │
│  3. VU Context (many times)                         │
│     - Execute default function                      │
│     - __VU = actual VU number                      │
│     - __ITER = actual iteration                    │
│     - console.log() works (but verbose!)           │
│                                                     │
│  4. Teardown Context (once)                         │
│     - Clean up                                      │
│     - __VU = 0, __ITER = 0                         │
│     - console.log() works                           │
└─────────────────────────────────────────────────────┘
```

### Error Types

**1. Syntax Errors (caught early):**
```javascript
export default function () {
  http.get('url'  // Missing closing parenthesis
}
// Error: SyntaxError: Unexpected token
```

**2. Runtime Errors (during execution):**
```javascript
export default function () {
  const data = undefined;
  console.log(data.value);  // Cannot read property 'value' of undefined
}
```

**3. Logic Errors (wrong behavior):**
```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  // Expected 200, got 401 - logic error in authentication
}
```

### Debugging Workflow

```
1. Identify Problem
   ↓
2. Reproduce Issue
   ↓
3. Isolate Cause
   ↓
4. Add Logging/Debugging
   ↓
5. Analyze Output
   ↓
6. Fix Issue
   ↓
7. Verify Fix
```

---

## Console Logging

### Basic Logging

```javascript
import http from 'k6/http';

export default function () {
  console.log('Starting iteration');
  
  const res = http.get('https://api.example.com/data');
  
  console.log('Response status:', res.status);
  console.log('Response body:', res.body);
  
  console.log('Iteration complete');
}
```

### Conditional Logging

```javascript
export default function () {
  // Log only for VU 1
  if (__VU === 1) {
    console.log(`VU ${__VU}, Iteration ${__ITER}`);
  }
  
  // Log only first iteration
  if (__ITER === 0) {
    console.log('First iteration');
  }
  
  // Log every 10th iteration
  if (__ITER % 10 === 0) {
    console.log(`Iteration ${__ITER}`);
  }
}
```

### Structured Logging

```javascript
export default function () {
  const logData = {
    vu: __VU,
    iteration: __ITER,
    timestamp: new Date().toISOString(),
    action: 'http_request'
  };
  
  console.log(JSON.stringify(logData));
}
```

**Output:**
```json
{"vu":1,"iteration":0,"timestamp":"2024-01-15T10:30:00.000Z","action":"http_request"}
```

### Debug vs Info Logging

```javascript
const DEBUG = __ENV.DEBUG === 'true';

export default function () {
  if (DEBUG) {
    console.log('[DEBUG] Starting request');
  }
  
  const res = http.get('https://api.example.com/data');
  
  if (DEBUG) {
    console.log('[DEBUG] Response:', res.status, res.body);
  }
  
  // Always log errors
  if (res.status >= 400) {
    console.error('[ERROR] Request failed:', res.status);
  }
}
```

**Run with debug:**
```bash
k6 run -e DEBUG=true script.js
```

### Logging Helper

```javascript
const Logger = {
  debug: (msg, ...args) => {
    if (__ENV.DEBUG === 'true') {
      console.log(`[DEBUG] [VU${__VU}] [Iter${__ITER}]`, msg, ...args);
    }
  },
  
  info: (msg, ...args) => {
    console.log(`[INFO] [VU${__VU}] [Iter${__ITER}]`, msg, ...args);
  },
  
  error: (msg, ...args) => {
    console.error(`[ERROR] [VU${__VU}] [Iter${__ITER}]`, msg, ...args);
  }
};

export default function () {
  Logger.debug('Starting iteration');
  
  const res = http.get('https://api.example.com/data');
  
  if (res.status === 200) {
    Logger.info('Request successful');
  } else {
    Logger.error('Request failed:', res.status);
  }
}
```

---

## HTTP Debugging

### Inspecting Requests

```javascript
export default function () {
  const url = 'https://api.example.com/data';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    },
    tags: { name: 'api_request' }
  };
  
  console.log('Request URL:', url);
  console.log('Request headers:', JSON.stringify(params.headers));
  
  const res = http.get(url, params);
  
  console.log('Response status:', res.status);
  console.log('Response headers:', JSON.stringify(res.headers));
}
```

### Inspecting Response

```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  
  // Status
  console.log('Status:', res.status);
  console.log('Status text:', res.status_text);
  
  // Headers
  console.log('Content-Type:', res.headers['Content-Type']);
  console.log('All headers:', JSON.stringify(res.headers, null, 2));
  
  // Body
  console.log('Body length:', res.body.length);
  console.log('Body preview:', res.body.substring(0, 100));
  
  // Timings
  console.log('Duration:', res.timings.duration, 'ms');
  console.log('Waiting:', res.timings.waiting, 'ms');
  
  // Parsed JSON
  try {
    const data = res.json();
    console.log('Parsed data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to parse JSON:', error);
  }
}
```

### Request/Response Logging

```javascript
function logHTTP(method, url, params, response) {
  console.log('=== HTTP Request ===');
  console.log('Method:', method);
  console.log('URL:', url);
  console.log('Headers:', JSON.stringify(params?.headers || {}));
  console.log('Body:', params?.body || 'none');
  
  console.log('=== HTTP Response ===');
  console.log('Status:', response.status);
  console.log('Duration:', response.timings.duration, 'ms');
  console.log('Body:', response.body.substring(0, 200));
  console.log('====================');
}

export default function () {
  const url = 'https://api.example.com/data';
  const params = {
    headers: { 'Content-Type': 'application/json' }
  };
  
  const res = http.get(url, params);
  
  logHTTP('GET', url, params, res);
}
```

### Debugging Failed Requests

```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  
  if (res.status !== 200) {
    console.error('Request failed!');
    console.error('Status:', res.status);
    console.error('Status text:', res.status_text);
    console.error('URL:', res.url);
    console.error('Headers:', JSON.stringify(res.headers));
    console.error('Body:', res.body);
    console.error('Error:', res.error);
    console.error('Error code:', res.error_code);
  }
}
```

### Debugging Redirects

```javascript
export default function () {
  const res = http.get('https://example.com/redirect', {
    redirects: 0  // Disable auto-redirect
  });
  
  console.log('Status:', res.status);
  console.log('Location header:', res.headers['Location']);
  
  if (res.status >= 300 && res.status < 400) {
    console.log('Redirect detected to:', res.headers['Location']);
  }
}
```

---

## Metric Debugging

### Viewing Metric Values

```javascript
import { Counter, Trend } from 'k6/metrics';

const myCounter = new Counter('my_counter');
const myTrend = new Trend('my_trend');

export default function () {
  myCounter.add(1);
  myTrend.add(123);
  
  console.log('Counter incremented');
  console.log('Trend value added: 123');
}

export function handleSummary(data) {
  console.log('=== Metrics Debug ===');
  console.log('my_counter:', data.metrics.my_counter.values.count);
  console.log('my_trend avg:', data.metrics.my_trend.values.avg);
  
  return {
    'stdout': ''
  };
}
```

### Tracking Metric Changes

```javascript
import { Counter } from 'k6/metrics';

const errors = new Counter('errors');
let errorCount = 0;

export default function () {
  const res = http.get('https://api.example.com/data');
  
  if (res.status >= 400) {
    errorCount++;
    errors.add(1);
    console.log(`Error count: ${errorCount}`);
  }
}
```

### Debugging Thresholds

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.1']
  }
};

export default function () {
  const res = http.get('https://api.example.com/data');
  
  console.log('Request duration:', res.timings.duration, 'ms');
  console.log('Failed:', res.status >= 400);
}

export function handleSummary(data) {
  console.log('=== Threshold Results ===');
  
  const reqDuration = data.metrics.http_req_duration;
  console.log('http_req_duration p(95):', reqDuration.values['p(95)']);
  console.log('Threshold p(95)<500:', reqDuration.thresholds['p(95)<500'].ok ? 'PASS' : 'FAIL');
  
  const reqFailed = data.metrics.http_req_failed;
  console.log('http_req_failed rate:', reqFailed.values.rate);
  console.log('Threshold rate<0.1:', reqFailed.thresholds['rate<0.1'].ok ? 'PASS' : 'FAIL');
  
  return { 'stdout': '' };
}
```

---

## Execution Flow Debugging

### Tracing Execution

```javascript
console.log('1. Init phase');

export function setup() {
  console.log('2. Setup phase');
  return { data: 'test' };
}

export default function (data) {
  console.log(`3. VU phase - VU ${__VU}, Iteration ${__ITER}`);
  console.log('   Data from setup:', data.data);
}

export function teardown(data) {
  console.log('4. Teardown phase');
  console.log('   Data from setup:', data.data);
}
```

### Debugging Scenarios

```javascript
export const options = {
  scenarios: {
    scenario1: {
      executor: 'constant-vus',
      vus: 2,
      duration: '10s',
      exec: 'scenario1'
    },
    scenario2: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      exec: 'scenario2',
      startTime: '5s'
    }
  }
};

export function scenario1() {
  console.log(`[Scenario1] VU ${__VU}, Iteration ${__ITER}`);
}

export function scenario2() {
  console.log(`[Scenario2] VU ${__VU}, Iteration ${__ITER}`);
}
```

### Debugging Iteration Logic

```javascript
export default function () {
  console.log(`=== VU ${__VU}, Iteration ${__ITER} ===`);
  
  if (__ITER === 0) {
    console.log('First iteration - initializing');
  } else if (__ITER < 10) {
    console.log('Early iterations - warming up');
  } else {
    console.log('Regular iterations');
  }
  
  console.log('=== End ===');
}
```

---

## Common Issues & Solutions

### Issue 1: Module Not Found

**Error:**
```
ERRO[0000] Module not found: 'k6/http'
```

**Cause:** Missing import

**Solution:**
```javascript
// ✅ Add import
import http from 'k6/http';

export default function () {
  http.get('https://api.example.com/data');
}
```

---

### Issue 2: Undefined Variable

**Error:**
```
TypeError: Cannot read property 'status' of undefined
```

**Debug:**
```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  
  console.log('Response:', res);  // Check if res is defined
  console.log('Type:', typeof res);
  
  if (res) {
    console.log('Status:', res.status);
  } else {
    console.error('Response is undefined!');
  }
}
```

---

### Issue 3: JSON Parse Error

**Error:**
```
SyntaxError: Unexpected token < in JSON
```

**Debug:**
```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  
  console.log('Content-Type:', res.headers['Content-Type']);
  console.log('Body:', res.body);
  
  try {
    const data = res.json();
    console.log('Parsed:', data);
  } catch (error) {
    console.error('JSON parse failed:', error);
    console.error('Body was:', res.body);
  }
}
```

---

### Issue 4: Authentication Failure

**Error:** 401 Unauthorized

**Debug:**
```javascript
export default function () {
  const token = 'your-token';
  
  console.log('Using token:', token);
  
  const res = http.get('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log('Status:', res.status);
  
  if (res.status === 401) {
    console.error('Authentication failed!');
    console.error('Request headers:', res.request.headers);
    console.error('Response body:', res.body);
  }
}
```

---

### Issue 5: Cookie Not Sent

**Debug:**
```javascript
export default function () {
  if (__ITER === 0) {
    // Login
    const loginRes = http.post('https://api.example.com/login', credentials);
    console.log('Login status:', loginRes.status);
    console.log('Set-Cookie header:', loginRes.headers['Set-Cookie']);
    
    // Check cookies
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://api.example.com/');
    console.log('Cookies stored:', JSON.stringify(cookies));
  }
  
  // Subsequent request
  const res = http.get('https://api.example.com/data');
  console.log('Data request status:', res.status);
  
  if (res.status === 401) {
    console.error('Not authenticated - cookie issue?');
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://api.example.com/');
    console.error('Current cookies:', JSON.stringify(cookies));
  }
}
```

---

### Issue 6: Threshold Failing

**Debug:**
```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<500']
  }
};

export default function () {
  const start = Date.now();
  const res = http.get('https://api.example.com/data');
  const duration = Date.now() - start;
  
  console.log('Request duration:', duration, 'ms');
  console.log('Response time:', res.timings.duration, 'ms');
  
  if (res.timings.duration > 500) {
    console.warn('Slow request detected!');
    console.warn('URL:', res.url);
    console.warn('Status:', res.status);
    console.warn('Duration:', res.timings.duration, 'ms');
  }
}
```

---

### Issue 7: VU State Not Persisting

**Problem:** Variables reset between iterations

**Debug:**
```javascript
// ❌ Wrong: Declared in VU context
export default function () {
  let counter = 0;  // Resets every iteration!
  counter++;
  console.log('Counter:', counter);  // Always 1
}

// ✅ Right: Declared in init context
let counter = 0;  // Persists across iterations

export default function () {
  counter++;
  console.log('Counter:', counter);  // Increments: 1, 2, 3...
}
```

---

## Performance Debugging

### Identifying Slow Requests

```javascript
import { Trend } from 'k6/metrics';

const slowRequests = new Trend('slow_requests');

export default function () {
  const res = http.get('https://api.example.com/data');
  
  if (res.timings.duration > 1000) {
    slowRequests.add(res.timings.duration);
    
    console.warn('Slow request detected!');
    console.warn('URL:', res.url);
    console.warn('Duration:', res.timings.duration, 'ms');
    console.warn('Breakdown:');
    console.warn('  Blocked:', res.timings.blocked, 'ms');
    console.warn('  Connecting:', res.timings.connecting, 'ms');
    console.warn('  TLS:', res.timings.tls_handshaking, 'ms');
    console.warn('  Sending:', res.timings.sending, 'ms');
    console.warn('  Waiting:', res.timings.waiting, 'ms');
    console.warn('  Receiving:', res.timings.receiving, 'ms');
  }
}
```

### Memory Usage Tracking

```javascript
let iterationCount = 0;
let totalMemory = 0;

export default function () {
  iterationCount++;
  
  // Estimate memory usage (rough approximation)
  const memoryEstimate = iterationCount * 1024;  // 1KB per iteration
  totalMemory += memoryEstimate;
  
  if (iterationCount % 100 === 0) {
    console.log(`Iterations: ${iterationCount}`);
    console.log(`Estimated memory: ${(totalMemory / 1024 / 1024).toFixed(2)} MB`);
  }
}
```

### Debugging High Error Rates

```javascript
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
let errorLog = [];

export default function () {
  const res = http.get('https://api.example.com/data');
  
  const failed = res.status >= 400;
  errorRate.add(failed);
  
  if (failed) {
    const error = {
      vu: __VU,
      iteration: __ITER,
      status: res.status,
      url: res.url,
      error: res.error
    };
    
    errorLog.push(error);
    
    console.error('Request failed:', JSON.stringify(error));
  }
}

export function handleSummary(data) {
  console.log('=== Error Summary ===');
  console.log('Total errors:', errorLog.length);
  console.log('Error rate:', data.metrics.errors.values.rate);
  
  // Group errors by status code
  const errorsByStatus = {};
  errorLog.forEach(error => {
    errorsByStatus[error.status] = (errorsByStatus[error.status] || 0) + 1;
  });
  
  console.log('Errors by status:', JSON.stringify(errorsByStatus));
  
  return { 'stdout': '' };
}
```

---

## Advanced Debugging Techniques

### Request Tracing

```javascript
let requestId = 0;

function traceRequest(method, url, params) {
  const id = ++requestId;
  const start = Date.now();
  
  console.log(`[${id}] >>> ${method} ${url}`);
  
  const res = http.request(method, url, params?.body, params);
  
  const duration = Date.now() - start;
  console.log(`[${id}] <<< ${res.status} (${duration}ms)`);
  
  return res;
}

export default function () {
  traceRequest('GET', 'https://api.example.com/users');
  traceRequest('POST', 'https://api.example.com/data', {
    body: JSON.stringify({ key: 'value' }),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Assertion Debugging

```javascript
import { check } from 'k6';

export default function () {
  const res = http.get('https://api.example.com/data');
  
  const checks = check(res, {
    'status is 200': (r) => {
      const passed = r.status === 200;
      if (!passed) {
        console.error('Check failed: status is 200');
        console.error('  Expected: 200');
        console.error('  Actual:', r.status);
      }
      return passed;
    },
    'response has data': (r) => {
      const passed = r.json().data !== undefined;
      if (!passed) {
        console.error('Check failed: response has data');
        console.error('  Response:', r.body);
      }
      return passed;
    }
  });
  
  if (!checks) {
    console.error('Some checks failed for VU', __VU);
  }
}
```

### Conditional Breakpoints

```javascript
export default function () {
  const res = http.get('https://api.example.com/data');
  
  // "Breakpoint" on specific condition
  if (res.status === 500 && __VU === 3) {
    console.log('=== BREAKPOINT ===');
    console.log('VU:', __VU);
    console.log('Iteration:', __ITER);
    console.log('Response:', JSON.stringify({
      status: res.status,
      headers: res.headers,
      body: res.body
    }, null, 2));
    console.log('==================');
  }
}
```

### State Inspection

```javascript
let state = {
  initialized: false,
  loginAttempts: 0,
  lastError: null
};

export default function () {
  if (__ITER === 0) {
    console.log('Initial state:', JSON.stringify(state));
  }
  
  // Modify state
  if (!state.initialized) {
    state.initialized = true;
    state.loginAttempts++;
  }
  
  const res = http.get('https://api.example.com/data');
  
  if (res.status >= 400) {
    state.lastError = {
      iteration: __ITER,
      status: res.status,
      error: res.error
    };
  }
  
  // Log state every 10 iterations
  if (__ITER % 10 === 0) {
    console.log('Current state:', JSON.stringify(state));
  }
}
```

---

## Real-World Examples

### Example 1: Debugging Authentication Flow

```javascript
import http from 'k6/http';
import { check } from 'k6';

const DEBUG = __ENV.DEBUG === 'true';

export default function () {
  if (__ITER === 0) {
    if (DEBUG) console.log('=== Login Attempt ===');
    
    const loginRes = http.post('https://api.example.com/login',
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (DEBUG) {
      console.log('Login status:', loginRes.status);
      console.log('Login response:', loginRes.body);
      console.log('Set-Cookie:', loginRes.headers['Set-Cookie']);
    }
    
    const loginCheck = check(loginRes, {
      'login successful': (r) => r.status === 200,
      'has token': (r) => r.json().token !== undefined
    });
    
    if (!loginCheck) {
      console.error('Login failed!');
      console.error('Status:', loginRes.status);
      console.error('Body:', loginRes.body);
      return;  // Stop iteration
    }
    
    // Check cookies
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://api.example.com/');
    
    if (DEBUG) {
      console.log('Cookies stored:', JSON.stringify(cookies, null, 2));
    }
    
    if (cookies.length === 0) {
      console.error('No cookies stored after login!');
    }
  }
  
  // Authenticated request
  const dataRes = http.get('https://api.example.com/data');
  
  if (DEBUG) {
    console.log('Data request status:', dataRes.status);
  }
  
  if (dataRes.status === 401) {
    console.error('Authentication failed on data request!');
    console.error('VU:', __VU, 'Iteration:', __ITER);
    
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://api.example.com/');
    console.error('Current cookies:', JSON.stringify(cookies));
  }
}
```

### Example 2: Debugging Performance Issues

```javascript
import http from 'k6/http';
import { Trend, Counter } from 'k6/metrics';

const requestDuration = new Trend('request_duration');
const slowRequests = new Counter('slow_requests');
const verySlowRequests = new Counter('very_slow_requests');

const SLOW_THRESHOLD = 500;  // ms
const VERY_SLOW_THRESHOLD = 1000;  // ms

export default function () {
  const start = Date.now();
  const res = http.get('https://api.example.com/data');
  const duration = Date.now() - start;
  
  requestDuration.add(duration);
  
  if (duration > VERY_SLOW_THRESHOLD) {
    verySlowRequests.add(1);
    
    console.error('VERY SLOW REQUEST!');
    console.error('Duration:', duration, 'ms');
    console.error('VU:', __VU, 'Iteration:', __ITER);
    console.error('Timing breakdown:');
    console.error('  DNS:', res.timings.blocked, 'ms');
    console.error('  TCP:', res.timings.connecting, 'ms');
    console.error('  TLS:', res.timings.tls_handshaking, 'ms');
    console.error('  Request:', res.timings.sending, 'ms');
    console.error('  Wait:', res.timings.waiting, 'ms');
    console.error('  Download:', res.timings.receiving, 'ms');
    console.error('  Total:', res.timings.duration, 'ms');
    
  } else if (duration > SLOW_THRESHOLD) {
    slowRequests.add(1);
    
    console.warn('Slow request:', duration, 'ms');
  }
}

export function handleSummary(data) {
  console.log('=== Performance Summary ===');
  console.log('Average duration:', data.metrics.request_duration.values.avg.toFixed(2), 'ms');
  console.log('P95 duration:', data.metrics.request_duration.values['p(95)'].toFixed(2), 'ms');
  console.log('Slow requests (>500ms):', data.metrics.slow_requests.values.count);
  console.log('Very slow requests (>1000ms):', data.metrics.very_slow_requests.values.count);
  
  return { 'stdout': '' };
}
```

### Example 3: Debugging Data Issues

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('https://api.example.com/users');
  
  console.log('Response status:', res.status);
  console.log('Content-Type:', res.headers['Content-Type']);
  
  // Check if response is JSON
  if (!res.headers['Content-Type'].includes('application/json')) {
    console.error('Response is not JSON!');
    console.error('Content-Type:', res.headers['Content-Type']);
    console.error('Body:', res.body);
    return;
  }
  
  // Try to parse JSON
  let data;
  try {
    data = res.json();
    console.log('JSON parsed successfully');
  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Body:', res.body);
    return;
  }
  
  // Validate data structure
  console.log('Data type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    
    if (data.length > 0) {
      console.log('First item:', JSON.stringify(data[0], null, 2));
      
      // Validate first item structure
      const firstItem = data[0];
      const requiredFields = ['id', 'name', 'email'];
      
      requiredFields.forEach(field => {
        if (firstItem[field] === undefined) {
          console.error(`Missing field: ${field}`);
        } else {
          console.log(`Field ${field}:`, firstItem[field]);
        }
      });
    } else {
      console.warn('Empty array returned');
    }
  } else {
    console.log('Data keys:', Object.keys(data));
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}
```

---

## Best Practices

### 1. Use Conditional Logging

```javascript
// ✅ Good: Log only when needed
if (__VU === 1 && __ITER === 0) {
  console.log('Debug info');
}

// ❌ Bad: Log from all VUs
console.log('Debug info');  // Floods output!
```

### 2. Use Environment Variables for Debug Mode

```javascript
// ✅ Good: Controlled debugging
const DEBUG = __ENV.DEBUG === 'true';

if (DEBUG) {
  console.log('Debug information');
}
```

**Run with:**
```bash
k6 run -e DEBUG=true script.js
```

### 3. Log Structured Data

```javascript
// ✅ Good: Structured logging
console.log(JSON.stringify({
  vu: __VU,
  iteration: __ITER,
  status: res.status,
  duration: res.timings.duration
}));

// ❌ Bad: Unstructured
console.log('VU', __VU, 'status', res.status);
```

### 4. Use Try-Catch for Error Handling

```javascript
// ✅ Good: Catch errors
try {
  const data = res.json();
  console.log('Data:', data);
} catch (error) {
  console.error('Error:', error);
  console.error('Body:', res.body);
}
```

### 5. Create Debug Helpers

```javascript
// ✅ Good: Reusable helpers
const Debug = {
  enabled: __ENV.DEBUG === 'true',
  
  log: function(...args) {
    if (this.enabled) {
      console.log(`[DEBUG] [VU${__VU}]`, ...args);
    }
  },
  
  logResponse: function(res) {
    if (this.enabled) {
      console.log(`[DEBUG] Response:`, {
        status: res.status,
        duration: res.timings.duration,
        bodyLength: res.body.length
      });
    }
  }
};

export default function () {
  Debug.log('Starting iteration');
  const res = http.get('https://api.example.com/data');
  Debug.logResponse(res);
}
```

### 6. Use handleSummary for Post-Test Analysis

```javascript
// ✅ Good: Analyze results after test
export function handleSummary(data) {
  console.log('=== Test Analysis ===');
  
  // Check for issues
  const errorRate = data.metrics.http_req_failed.values.rate;
  if (errorRate > 0.05) {
    console.error('High error rate:', (errorRate * 100).toFixed(2), '%');
  }
  
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  if (p95 > 1000) {
    console.warn('High P95 latency:', p95.toFixed(2), 'ms');
  }
  
  return { 'stdout': '' };
}
```

### 7. Test with Minimal Load First

```bash
# ✅ Good: Start small
k6 run --vus 1 --iterations 1 script.js

# Then scale up
k6 run --vus 10 --duration 30s script.js
```

---

## Troubleshooting Checklist

### Before Running Test

- [ ] Import all required modules
- [ ] Verify URLs are correct
- [ ] Check authentication credentials
- [ ] Validate JSON syntax
- [ ] Test with 1 VU, 1 iteration first

### During Test

- [ ] Monitor console output for errors
- [ ] Check HTTP status codes
- [ ] Verify metrics are being collected
- [ ] Watch for memory issues
- [ ] Check for unexpected behavior

### After Test

- [ ] Review summary metrics
- [ ] Check threshold results
- [ ] Analyze error patterns
- [ ] Review slow requests
- [ ] Compare with baseline

### Common Debug Commands

```bash
# Run with debug logging
k6 run -e DEBUG=true script.js

# Run with minimal load
k6 run --vus 1 --iterations 1 script.js

# Run with verbose output
k6 run --verbose script.js

# Run and save results
k6 run --out json=results.json script.js
```

---

## Quick Reference

### Debug Logging

```javascript
// Conditional logging
if (__VU === 1) console.log('Debug');

// Structured logging
console.log(JSON.stringify({ vu: __VU, data: value }));

// Error logging
console.error('Error:', error);
```

### HTTP Debugging

```javascript
// Log request
console.log('URL:', url);
console.log('Headers:', JSON.stringify(headers));

// Log response
console.log('Status:', res.status);
console.log('Body:', res.body);
console.log('Duration:', res.timings.duration);
```

### Common Patterns

```javascript
// Debug mode
const DEBUG = __ENV.DEBUG === 'true';
if (DEBUG) console.log('Debug info');

// Try-catch
try {
  const data = res.json();
} catch (error) {
  console.error('Parse error:', error);
}

// Conditional breakpoint
if (condition && __VU === 1) {
  console.log('=== BREAKPOINT ===');
  console.log('State:', state);
}
```

---

## Summary

**Effective debugging enables rapid issue resolution:**

- ✅ **Use console.log** - But conditionally (VU 1, iteration 0)
- ✅ **Enable debug mode** - Via environment variables
- ✅ **Log structured data** - JSON format for parsing
- ✅ **Inspect HTTP details** - Status, headers, body, timings
- ✅ **Use try-catch** - Handle errors gracefully
- ✅ **Create helpers** - Reusable debug functions
- ✅ **Start small** - 1 VU, 1 iteration first
- ✅ **Analyze post-test** - Use handleSummary
- ❌ **Don't log from all VUs** - Floods output
- ❌ **Don't ignore errors** - Always handle exceptions

**Master debugging, and you'll quickly identify and resolve issues, creating reliable and accurate load tests.**
