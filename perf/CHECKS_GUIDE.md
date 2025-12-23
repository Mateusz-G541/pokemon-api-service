# K6 Checks: Complete Guide to Response Validation

A comprehensive guide to using k6 checks for validating HTTP responses, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Are Checks?](#what-are-checks)
2. [Checks vs Thresholds: Deep Dive](#checks-vs-thresholds-deep-dive)
3. [Check Syntax & Theory](#check-syntax--theory)
4. [Basic Check Patterns](#basic-check-patterns)
5. [HTTP Response Validation](#http-response-validation)
6. [JSON Response Validation](#json-response-validation)
7. [Advanced Validation Patterns](#advanced-validation-patterns)
8. [Check Groups](#check-groups)
9. [Custom Validation Functions](#custom-validation-functions)
10. [Error Handling & Debugging](#error-handling--debugging)
11. [Performance Considerations](#performance-considerations)
12. [Real-World Examples](#real-world-examples)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)

---

## What Are Checks?

**Checks** are k6's runtime validation mechanism. They verify that responses meet your expectations **during test execution**.

### Core Concept

```javascript
import { check } from 'k6';
import http from 'k6/http';

export default function () {
  const response = http.get('https://api.example.com/users');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has users array': (r) => Array.isArray(r.json().users),
  });
}
```

**What happens:**
1. k6 makes HTTP request
2. For each check condition:
   - Executes the validation function
   - Records pass/fail
   - Logs result in real-time
3. Test continues regardless of result

### Key Characteristics

| Aspect | Behavior |
|--------|----------|
| **Execution** | During test run (real-time) |
| **Failure** | Logs failure, continues test |
| **Metrics** | Creates `checks` metric (pass rate) |
| **Purpose** | Validate response correctness |
| **Scope** | Per-request validation |

---

## Checks vs Thresholds: Deep Dive

Understanding the difference between checks and thresholds is crucial for effective testing.

### Conceptual Difference

**Checks** = "Is this response correct?"  
**Thresholds** = "Did the test meet performance requirements?"

### Execution Timeline

```
Test Start
    │
    ├─ VU 1 starts
    │   ├─ HTTP request 1
    │   ├─ ✓ Check: status is 200        ← Real-time validation
    │   ├─ ✓ Check: has data             ← Real-time validation
    │   ├─ HTTP request 2
    │   ├─ ✗ Check: status is 200        ← Real-time validation (failed)
    │   └─ ...
    │
Test End
    │
    └─ Evaluate thresholds                ← Post-test evaluation
        ├─ http_req_duration p(95) < 500  ← Statistical analysis
        ├─ checks rate > 0.95             ← Overall check pass rate
        └─ Pass/Fail decision
```

### Detailed Comparison

#### Checks

```javascript
export default function () {
  const response = http.get('https://api.example.com/users');
  
  // Checks execute immediately after request
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has users': (r) => r.json().users.length > 0
  });
  
  // checkResult is true if ALL checks passed
  if (!checkResult) {
    console.log('Some checks failed!');
  }
}
```

**Characteristics:**
- ✅ Execute during test
- ✅ Provide immediate feedback
- ✅ Validate per-request correctness
- ✅ Can be used for conditional logic
- ❌ Don't fail the test
- ❌ Can't use statistical analysis (no percentiles)

#### Thresholds

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<500"],
    "http_req_failed": ["rate<0.01"],
    "checks": ["rate>0.95"]
  }
}
```

**Characteristics:**
- ✅ Evaluate after test completes
- ✅ Fail the entire test if violated
- ✅ Support statistical analysis (percentiles, averages)
- ✅ Define pass/fail criteria
- ❌ No immediate feedback
- ❌ Can't be used for conditional logic

### When to Use Each

#### Use Checks When:

```javascript
// 1. Validating response structure
check(response, {
  'has required fields': (r) => {
    const data = r.json();
    return data.id && data.name && data.email;
  }
});

// 2. Conditional test flow
const loginSuccess = check(loginResponse, {
  'login successful': (r) => r.status === 200
});

if (loginSuccess) {
  // Continue with authenticated requests
  http.get('/api/profile', { headers: { 'Authorization': token } });
} else {
  // Skip authenticated requests
  console.error('Login failed, skipping profile request');
}

// 3. Debugging during development
check(response, {
  'status is 200': (r) => r.status === 200,
  'response body': (r) => {
    console.log(r.body);  // Debug output
    return true;
  }
});
```

#### Use Thresholds When:

```json
{
  "thresholds": {
    // 1. Performance requirements
    "http_req_duration": ["p(95)<500", "p(99)<1000"],
    
    // 2. Reliability requirements
    "http_req_failed": ["rate<0.01"],
    
    // 3. Overall check success rate
    "checks": ["rate>0.95"],
    
    // 4. CI/CD gates
    "http_req_duration{endpoint:critical}": ["p(95)<200"]
  }
}
```

### Using Both Together

```javascript
export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'checks': ['rate>0.99']  // 99% of checks must pass
  }
};

export default function () {
  const response = http.get('https://api.example.com/users');
  
  // Check validates correctness (runtime)
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has users array': (r) => Array.isArray(r.json().users),
    'users not empty': (r) => r.json().users.length > 0
  });
  
  // Threshold validates performance (after test)
  // No code needed - automatically tracked
}
```

**Result interpretation:**
- If checks pass rate < 99% → ❌ Test fails (threshold violated)
- If p95 > 500ms → ❌ Test fails (threshold violated)
- If both pass → ✅ Test passes

---

## Check Syntax & Theory

### Basic Syntax

```javascript
check(value, checks, [tags])
```

**Parameters:**
1. `value` - The value to validate (usually HTTP response)
2. `checks` - Object with check definitions
3. `tags` (optional) - Tags for filtering check metrics

### Check Definition Structure

```javascript
check(response, {
  'check_name': (value) => boolean_expression,
  'another_check': (value) => boolean_expression
});
```

**Components:**
- **Check name** (string): Descriptive name shown in output
- **Validation function**: Arrow function that returns boolean
  - `true` = check passed
  - `false` = check failed
- **Value parameter**: The value passed to `check()` (first argument)

### Return Value

```javascript
const result = check(response, {
  'status is 200': (r) => r.status === 200
});

// result is boolean:
// - true if ALL checks passed
// - false if ANY check failed
```

### Multiple Checks

```javascript
check(response, {
  'check 1': (r) => r.status === 200,      // Pass
  'check 2': (r) => r.json().id > 0,       // Pass
  'check 3': (r) => r.json().name !== ''   // Fail
});
// Returns false (not all passed)
```

**All checks are evaluated**, even if one fails.

### Check Metrics

k6 automatically creates a `checks` metric:

```javascript
check(response, {
  'status is 200': (r) => r.status === 200
});
```

**Metric created:**
```
checks.........................: 100.00% ✓ 150  ✗ 0
```

**With tags:**
```javascript
check(response, {
  'status is 200': (r) => r.status === 200
}, { endpoint: 'users' });
```

**Metric created:**
```
checks{endpoint:users}.........: 100.00% ✓ 150  ✗ 0
```

---

## Basic Check Patterns

### 1. Status Code Validation

```javascript
// Single status
check(response, {
  'status is 200': (r) => r.status === 200
});

// Multiple acceptable statuses
check(response, {
  'status is 200 or 201': (r) => r.status === 200 || r.status === 201
});

// Status range
check(response, {
  'status is 2xx': (r) => r.status >= 200 && r.status < 300
});

// Specific error status
check(response, {
  'status is 404': (r) => r.status === 404
});
```

### 2. Response Time Validation

```javascript
check(response, {
  'response time < 500ms': (r) => r.timings.duration < 500,
  'response time < 1s': (r) => r.timings.duration < 1000
});

// Time to first byte (TTFB)
check(response, {
  'TTFB < 200ms': (r) => r.timings.waiting < 200
});
```

### 3. Response Body Validation

```javascript
// Body exists
check(response, {
  'has body': (r) => r.body && r.body.length > 0
});

// Body contains text
check(response, {
  'body contains "success"': (r) => r.body.includes('success')
});

// Body matches regex
check(response, {
  'body matches pattern': (r) => /user-\d+/.test(r.body)
});

// Body length
check(response, {
  'body not empty': (r) => r.body.length > 0,
  'body not too large': (r) => r.body.length < 1000000  // < 1MB
});
```

### 4. Header Validation

```javascript
check(response, {
  'has content-type': (r) => r.headers['Content-Type'] !== undefined,
  'content-type is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  'has cache header': (r) => r.headers['Cache-Control'] !== undefined,
  'has CORS header': (r) => r.headers['Access-Control-Allow-Origin'] !== undefined
});
```

---

## HTTP Response Validation

### Response Object Structure

```javascript
const response = http.get('https://api.example.com/users');

// Available properties:
response.status         // HTTP status code (200, 404, etc.)
response.status_text    // Status text ("OK", "Not Found", etc.)
response.body           // Response body as string
response.headers        // Response headers object
response.cookies        // Response cookies object
response.timings        // Timing information
response.request        // Original request info
response.url            // Final URL (after redirects)
response.error          // Error message (if request failed)
response.error_code     // Error code (if request failed)
```

### Complete Response Validation

```javascript
check(response, {
  // Status
  'status is 200': (r) => r.status === 200,
  'status text is OK': (r) => r.status_text === 'OK',
  
  // Headers
  'has content-type': (r) => r.headers['Content-Type'] !== undefined,
  'content-type is JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  
  // Body
  'has body': (r) => r.body && r.body.length > 0,
  
  // Timing
  'response time < 500ms': (r) => r.timings.duration < 500,
  
  // No errors
  'no error': (r) => !r.error
});
```

### Timing Details

```javascript
check(response, {
  'blocked time < 10ms': (r) => r.timings.blocked < 10,
  'connecting time < 50ms': (r) => r.timings.connecting < 50,
  'TLS handshake < 100ms': (r) => r.timings.tls_handshaking < 100,
  'sending time < 5ms': (r) => r.timings.sending < 5,
  'waiting time < 200ms': (r) => r.timings.waiting < 200,  // TTFB
  'receiving time < 50ms': (r) => r.timings.receiving < 50,
  'total duration < 500ms': (r) => r.timings.duration < 500
});
```

---

## JSON Response Validation

### Parsing JSON

```javascript
const response = http.get('https://api.example.com/users');

check(response, {
  'response is valid JSON': (r) => {
    try {
      JSON.parse(r.body);
      return true;
    } catch (e) {
      return false;
    }
  }
});

// Or use r.json() (throws on invalid JSON)
check(response, {
  'has users array': (r) => {
    try {
      return Array.isArray(r.json().users);
    } catch (e) {
      return false;
    }
  }
});
```

### Field Existence

```javascript
check(response, {
  'has id field': (r) => r.json().id !== undefined,
  'has name field': (r) => r.json().name !== undefined,
  'has email field': (r) => r.json().email !== undefined
});

// Multiple fields
check(response, {
  'has required fields': (r) => {
    const data = r.json();
    return data.id !== undefined &&
           data.name !== undefined &&
           data.email !== undefined;
  }
});
```

### Field Type Validation

```javascript
check(response, {
  'id is number': (r) => typeof r.json().id === 'number',
  'name is string': (r) => typeof r.json().name === 'string',
  'active is boolean': (r) => typeof r.json().active === 'boolean',
  'tags is array': (r) => Array.isArray(r.json().tags),
  'metadata is object': (r) => typeof r.json().metadata === 'object'
});
```

### Field Value Validation

```javascript
check(response, {
  'id is positive': (r) => r.json().id > 0,
  'name not empty': (r) => r.json().name.length > 0,
  'email is valid': (r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.json().email),
  'age in range': (r) => {
    const age = r.json().age;
    return age >= 0 && age <= 150;
  },
  'status is valid': (r) => ['active', 'inactive', 'pending'].includes(r.json().status)
});
```

### Array Validation

```javascript
check(response, {
  'users is array': (r) => Array.isArray(r.json().users),
  'users not empty': (r) => r.json().users.length > 0,
  'has exactly 10 users': (r) => r.json().users.length === 10,
  'has at least 5 users': (r) => r.json().users.length >= 5,
  'has at most 100 users': (r) => r.json().users.length <= 100
});

// Array element validation
check(response, {
  'all users have id': (r) => r.json().users.every(user => user.id !== undefined),
  'all users have email': (r) => r.json().users.every(user => user.email),
  'at least one admin': (r) => r.json().users.some(user => user.role === 'admin')
});
```

### Nested Object Validation

```javascript
check(response, {
  'has nested address': (r) => r.json().user.address !== undefined,
  'address has street': (r) => r.json().user.address.street !== undefined,
  'address has city': (r) => r.json().user.address.city !== undefined,
  'coordinates are valid': (r) => {
    const coords = r.json().user.address.coordinates;
    return coords.lat >= -90 && coords.lat <= 90 &&
           coords.lng >= -180 && coords.lng <= 180;
  }
});
```

### Using JSONPath (with helper)

```javascript
// Helper function
function jsonPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

check(response, {
  'user.profile.name exists': (r) => jsonPath(r.json(), 'user.profile.name') !== undefined,
  'settings.theme is dark': (r) => jsonPath(r.json(), 'settings.theme') === 'dark'
});
```

---

## Advanced Validation Patterns

### 1. Conditional Checks

```javascript
const response = http.get('https://api.example.com/user/123');

check(response, {
  'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  'if 200, has user data': (r) => {
    if (r.status === 200) {
      return r.json().user !== undefined;
    }
    return true;  // Skip check if not 200
  },
  'if 404, has error message': (r) => {
    if (r.status === 404) {
      return r.json().error !== undefined;
    }
    return true;  // Skip check if not 404
  }
});
```

### 2. Complex Business Logic

```javascript
check(response, {
  'order total is correct': (r) => {
    const order = r.json();
    const itemsTotal = order.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    const expectedTotal = itemsTotal + order.shipping - order.discount;
    return Math.abs(order.total - expectedTotal) < 0.01;  // Allow rounding
  }
});
```

### 3. Date/Time Validation

```javascript
check(response, {
  'has created_at': (r) => r.json().created_at !== undefined,
  'created_at is valid date': (r) => !isNaN(Date.parse(r.json().created_at)),
  'created_at is recent': (r) => {
    const created = new Date(r.json().created_at);
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    return created > hourAgo && created <= now;
  },
  'created_at is ISO 8601': (r) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(r.json().created_at);
  }
});
```

### 4. Pagination Validation

```javascript
check(response, {
  'has pagination': (r) => {
    const data = r.json();
    return data.page !== undefined &&
           data.per_page !== undefined &&
           data.total !== undefined;
  },
  'page is valid': (r) => {
    const data = r.json();
    return data.page > 0 && data.page <= Math.ceil(data.total / data.per_page);
  },
  'results match per_page': (r) => {
    const data = r.json();
    const isLastPage = data.page === Math.ceil(data.total / data.per_page);
    if (isLastPage) {
      return data.results.length <= data.per_page;
    }
    return data.results.length === data.per_page;
  }
});
```

### 5. Schema Validation

```javascript
// Simple schema validator
function validateSchema(obj, schema) {
  for (const [key, type] of Object.entries(schema)) {
    if (typeof obj[key] !== type) {
      return false;
    }
  }
  return true;
}

const userSchema = {
  id: 'number',
  name: 'string',
  email: 'string',
  active: 'boolean'
};

check(response, {
  'user matches schema': (r) => validateSchema(r.json(), userSchema)
});
```

### 6. Rate Limit Headers

```javascript
check(response, {
  'has rate limit headers': (r) => {
    return r.headers['X-RateLimit-Limit'] !== undefined &&
           r.headers['X-RateLimit-Remaining'] !== undefined &&
           r.headers['X-RateLimit-Reset'] !== undefined;
  },
  'rate limit not exceeded': (r) => {
    const remaining = parseInt(r.headers['X-RateLimit-Remaining']);
    return remaining > 0;
  },
  'rate limit reset is future': (r) => {
    const reset = parseInt(r.headers['X-RateLimit-Reset']);
    return reset > Date.now() / 1000;
  }
});
```

---

## Check Groups

### Using Groups with Checks

```javascript
import { group, check } from 'k6';

export default function () {
  group('User Login', function () {
    const loginRes = http.post('https://api.example.com/login', {
      username: 'user',
      password: 'pass'
    });
    
    check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json().token !== undefined
    });
  });
  
  group('User Profile', function () {
    const profileRes = http.get('https://api.example.com/profile');
    
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile has user data': (r) => r.json().user !== undefined
    });
  });
}
```

**Metrics created:**
```
checks{group:::User Login}.........: 100.00% ✓ 10  ✗ 0
checks{group:::User Profile}.......: 100.00% ✓ 10  ✗ 0
```

### Nested Groups

```javascript
group('E-commerce Flow', function () {
  group('Authentication', function () {
    const res = http.post('/api/login', credentials);
    check(res, { 'login ok': (r) => r.status === 200 });
  });
  
  group('Shopping', function () {
    group('Browse Products', function () {
      const res = http.get('/api/products');
      check(res, { 'products loaded': (r) => r.status === 200 });
    });
    
    group('Add to Cart', function () {
      const res = http.post('/api/cart', item);
      check(res, { 'item added': (r) => r.status === 201 });
    });
  });
});
```

---

## Custom Validation Functions

### Reusable Validators

```javascript
// validators.js
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function hasRequiredFields(obj, fields) {
  return fields.every(field => obj[field] !== undefined);
}
```

```javascript
// test.js
import { isValidEmail, hasRequiredFields } from './validators.js';

export default function () {
  const response = http.get('https://api.example.com/user');
  
  check(response, {
    'has required fields': (r) => hasRequiredFields(r.json(), ['id', 'name', 'email']),
    'email is valid': (r) => isValidEmail(r.json().email)
  });
}
```

### Custom Check Helper

```javascript
function checkResponse(response, validations) {
  const checks = {};
  
  for (const [name, validator] of Object.entries(validations)) {
    checks[name] = validator;
  }
  
  return check(response, checks);
}

// Usage
checkResponse(response, {
  'status ok': (r) => r.status === 200,
  'has data': (r) => r.json().data !== undefined
});
```

---

## Error Handling & Debugging

### Safe JSON Parsing

```javascript
check(response, {
  'response is valid JSON': (r) => {
    try {
      r.json();
      return true;
    } catch (e) {
      console.error(`JSON parse error: ${e.message}`);
      console.error(`Response body: ${r.body.substring(0, 200)}`);
      return false;
    }
  }
});
```

### Detailed Error Messages

```javascript
check(response, {
  'user has valid age': (r) => {
    const age = r.json().age;
    const valid = age >= 0 && age <= 150;
    
    if (!valid) {
      console.error(`Invalid age: ${age}`);
    }
    
    return valid;
  }
});
```

### Debugging Failed Checks

```javascript
const checkResult = check(response, {
  'status is 200': (r) => r.status === 200,
  'has user data': (r) => r.json().user !== undefined
});

if (!checkResult) {
  console.error('Check failed!');
  console.error(`Status: ${response.status}`);
  console.error(`Body: ${response.body.substring(0, 500)}`);
  console.error(`Headers: ${JSON.stringify(response.headers)}`);
}
```

### Conditional Logging

```javascript
check(response, {
  'status is 200': (r) => {
    const passed = r.status === 200;
    
    if (!passed) {
      console.error(`Expected 200, got ${r.status}`);
      console.error(`URL: ${r.url}`);
      console.error(`Body: ${r.body}`);
    }
    
    return passed;
  }
});
```

---

## Performance Considerations

### Check Overhead

Checks add minimal overhead, but complex validations can impact performance:

```javascript
// ✅ Good: Simple, fast checks
check(response, {
  'status is 200': (r) => r.status === 200,
  'has data': (r) => r.json().data !== undefined
});

// ❌ Bad: Complex, slow checks
check(response, {
  'complex validation': (r) => {
    const data = r.json();
    // Expensive operations
    for (let i = 0; i < 10000; i++) {
      // Heavy computation
    }
    return true;
  }
});
```

### Caching Parsed JSON

```javascript
// ❌ Bad: Parse JSON multiple times
check(response, {
  'has id': (r) => r.json().id !== undefined,
  'has name': (r) => r.json().name !== undefined,
  'has email': (r) => r.json().email !== undefined
});

// ✅ Good: Parse once, use multiple times
const data = response.json();
check(response, {
  'has id': () => data.id !== undefined,
  'has name': () => data.name !== undefined,
  'has email': () => data.email !== undefined
});
```

### Selective Checks

```javascript
// Only run detailed checks on failures
const basicCheck = check(response, {
  'status is 200': (r) => r.status === 200
});

if (!basicCheck) {
  // Detailed validation only on failure
  check(response, {
    'has error message': (r) => r.json().error !== undefined,
    'error is descriptive': (r) => r.json().error.length > 10
  });
}
```

---

## Real-World Examples

### Example 1: REST API CRUD Operations

```javascript
export default function () {
  // CREATE
  const createRes = http.post('https://api.example.com/users', JSON.stringify({
    name: 'Alice',
    email: 'alice@example.com'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(createRes, {
    'create status is 201': (r) => r.status === 201,
    'create returns id': (r) => r.json().id !== undefined,
    'create returns created user': (r) => {
      const user = r.json();
      return user.name === 'Alice' && user.email === 'alice@example.com';
    }
  });
  
  const userId = createRes.json().id;
  
  // READ
  const readRes = http.get(`https://api.example.com/users/${userId}`);
  
  check(readRes, {
    'read status is 200': (r) => r.status === 200,
    'read returns correct user': (r) => r.json().id === userId,
    'read has all fields': (r) => {
      const user = r.json();
      return user.id && user.name && user.email && user.created_at;
    }
  });
  
  // UPDATE
  const updateRes = http.put(`https://api.example.com/users/${userId}`, JSON.stringify({
    name: 'Alice Updated'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(updateRes, {
    'update status is 200': (r) => r.status === 200,
    'update reflects changes': (r) => r.json().name === 'Alice Updated'
  });
  
  // DELETE
  const deleteRes = http.del(`https://api.example.com/users/${userId}`);
  
  check(deleteRes, {
    'delete status is 204': (r) => r.status === 204
  });
  
  // Verify deletion
  const verifyRes = http.get(`https://api.example.com/users/${userId}`);
  
  check(verifyRes, {
    'verify status is 404': (r) => r.status === 404
  });
}
```

### Example 2: Authentication Flow

```javascript
export default function () {
  // Login
  const loginRes = http.post('https://api.example.com/auth/login', JSON.stringify({
    username: 'testuser',
    password: 'testpass123'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json().token !== undefined,
    'token is JWT': (r) => {
      const token = r.json().token;
      return token.split('.').length === 3;  // JWT has 3 parts
    },
    'login returns user': (r) => r.json().user !== undefined,
    'user has id': (r) => r.json().user.id !== undefined
  });
  
  if (!loginSuccess) {
    console.error('Login failed, skipping authenticated requests');
    return;
  }
  
  const token = loginRes.json().token;
  
  // Authenticated request
  const profileRes = http.get('https://api.example.com/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
    'profile has user data': (r) => {
      const data = r.json();
      return data.username && data.email && data.created_at;
    }
  });
  
  // Logout
  const logoutRes = http.post('https://api.example.com/auth/logout', null, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  check(logoutRes, {
    'logout status is 200': (r) => r.status === 200
  });
  
  // Verify token is invalid after logout
  const invalidRes = http.get('https://api.example.com/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  check(invalidRes, {
    'token invalid after logout': (r) => r.status === 401
  });
}
```

### Example 3: Search API

```javascript
export default function () {
  const searchRes = http.get('https://api.example.com/search?q=pokemon&limit=10');
  
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    
    'has results array': (r) => Array.isArray(r.json().results),
    
    'results not empty': (r) => r.json().results.length > 0,
    
    'results respect limit': (r) => r.json().results.length <= 10,
    
    'all results contain query': (r) => {
      return r.json().results.every(item => 
        item.name.toLowerCase().includes('pokemon')
      );
    },
    
    'has pagination metadata': (r) => {
      const data = r.json();
      return data.total !== undefined &&
             data.page !== undefined &&
             data.per_page !== undefined;
    },
    
    'pagination is consistent': (r) => {
      const data = r.json();
      return data.results.length === Math.min(data.per_page, data.total);
    },
    
    'all results have required fields': (r) => {
      return r.json().results.every(item => 
        item.id && item.name && item.url
      );
    },
    
    'results are sorted': (r) => {
      const names = r.json().results.map(item => item.name);
      const sorted = [...names].sort();
      return JSON.stringify(names) === JSON.stringify(sorted);
    }
  });
}
```

### Example 4: File Upload

```javascript
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export default function () {
  const formData = new FormData();
  formData.append('file', http.file('test.jpg', 'image/jpeg'));
  formData.append('title', 'Test Image');
  
  const uploadRes = http.post('https://api.example.com/upload', formData.body(), {
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + formData.boundary }
  });
  
  check(uploadRes, {
    'upload status is 201': (r) => r.status === 201,
    
    'upload returns file id': (r) => r.json().file_id !== undefined,
    
    'upload returns file url': (r) => {
      const url = r.json().file_url;
      return url && url.startsWith('https://');
    },
    
    'file metadata is correct': (r) => {
      const data = r.json();
      return data.filename === 'test.jpg' &&
             data.content_type === 'image/jpeg' &&
             data.size > 0;
    },
    
    'upload time is reasonable': (r) => r.timings.duration < 5000  // < 5s
  });
}
```

---

## Best Practices

### 1. Use Descriptive Check Names

```javascript
// ✅ Good: Clear, descriptive names
check(response, {
  'status is 200': (r) => r.status === 200,
  'response contains user array': (r) => Array.isArray(r.json().users),
  'all users have valid email format': (r) => r.json().users.every(u => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))
});

// ❌ Bad: Vague names
check(response, {
  'ok': (r) => r.status === 200,
  'check1': (r) => Array.isArray(r.json().users),
  'test': (r) => r.json().users.length > 0
});
```

### 2. Group Related Checks

```javascript
// ✅ Good: Organized by concern
check(response, {
  // Status checks
  'status is 200': (r) => r.status === 200,
  
  // Structure checks
  'has users array': (r) => Array.isArray(r.json().users),
  'users not empty': (r) => r.json().users.length > 0,
  
  // Data quality checks
  'all users have id': (r) => r.json().users.every(u => u.id),
  'all users have email': (r) => r.json().users.every(u => u.email)
});
```

### 3. Check Most Important Things First

```javascript
// ✅ Good: Critical checks first
check(response, {
  'status is 200': (r) => r.status === 200,  // Most critical
  'has data': (r) => r.json().data !== undefined,
  'data has correct structure': (r) => {
    // More detailed validation
  }
});
```

### 4. Use Tags for Filtering

```javascript
// Tag checks by endpoint
check(response, {
  'status is 200': (r) => r.status === 200
}, { endpoint: 'users' });

// Then filter in thresholds
export const options = {
  thresholds: {
    'checks{endpoint:users}': ['rate>0.99'],
    'checks{endpoint:products}': ['rate>0.95']
  }
};
```

### 5. Don't Overuse Checks

```javascript
// ❌ Bad: Too many checks slow down test
check(response, {
  'check 1': (r) => true,
  'check 2': (r) => true,
  // ... 50 more checks
});

// ✅ Good: Focus on critical validations
check(response, {
  'status ok': (r) => r.status === 200,
  'has required data': (r) => r.json().data !== undefined,
  'data is valid': (r) => validateData(r.json().data)
});
```

### 6. Handle Errors Gracefully

```javascript
// ✅ Good: Safe error handling
check(response, {
  'response is valid': (r) => {
    try {
      const data = r.json();
      return data.id && data.name;
    } catch (e) {
      console.error(`Validation error: ${e.message}`);
      return false;
    }
  }
});
```

### 7. Use Check Return Value

```javascript
// ✅ Good: Use return value for flow control
const loginOk = check(loginRes, {
  'login successful': (r) => r.status === 200
});

if (loginOk) {
  // Continue with authenticated requests
} else {
  console.error('Login failed, skipping test');
  return;
}
```

---

## Troubleshooting

### Problem: Checks Always Pass

**Symptom:** All checks show 100% pass rate even when they should fail

**Cause:** Check function doesn't return boolean

```javascript
// ❌ Bad: No return statement
check(response, {
  'status is 200': (r) => {
    r.status === 200;  // Missing return!
  }
});

// ✅ Good: Returns boolean
check(response, {
  'status is 200': (r) => r.status === 200
});
```

---

### Problem: JSON Parse Errors

**Symptom:** `SyntaxError: Unexpected token`

**Cause:** Response is not valid JSON

**Solution:**
```javascript
check(response, {
  'response is JSON': (r) => {
    try {
      r.json();
      return true;
    } catch (e) {
      console.error(`Not JSON: ${r.body.substring(0, 100)}`);
      return false;
    }
  }
});
```

---

### Problem: Checks Slow Down Test

**Symptom:** Test runs much slower with checks

**Cause:** Complex validation logic

**Solution:**
```javascript
// Cache parsed JSON
const data = response.json();

check(response, {
  'has id': () => data.id !== undefined,
  'has name': () => data.name !== undefined
});
```

---

### Problem: Can't Access Nested Fields

**Symptom:** `TypeError: Cannot read property 'x' of undefined`

**Cause:** Nested field doesn't exist

**Solution:**
```javascript
// ✅ Good: Safe navigation
check(response, {
  'has nested field': (r) => {
    const data = r.json();
    return data.user && data.user.profile && data.user.profile.name;
  }
});
```

---

## Quick Reference

### Essential Check Patterns

```javascript
// Status
'status is 200': (r) => r.status === 200

// JSON structure
'has data field': (r) => r.json().data !== undefined

// Array validation
'results is array': (r) => Array.isArray(r.json().results)
'results not empty': (r) => r.json().results.length > 0

// Type checking
'id is number': (r) => typeof r.json().id === 'number'

// Value validation
'id is positive': (r) => r.json().id > 0

// Performance
'response time < 500ms': (r) => r.timings.duration < 500

// Headers
'has content-type': (r) => r.headers['Content-Type'] !== undefined
```

### Check + Threshold Pattern

```javascript
export const options = {
  thresholds: {
    'checks': ['rate>0.95']  // 95% of checks must pass
  }
};

export default function () {
  const response = http.get(url);
  
  check(response, {
    'status ok': (r) => r.status === 200,
    'has data': (r) => r.json().data !== undefined
  });
}
```

---

## Summary

**Checks are essential for validating response correctness:**

- ✅ **Use checks** for runtime validation
- ✅ **Use thresholds** for pass/fail criteria
- ✅ **Combine both** for comprehensive testing
- ✅ **Keep checks simple** for performance
- ✅ **Use descriptive names** for clarity
- ✅ **Handle errors** gracefully
- ✅ **Tag checks** for granular metrics
- ✅ **Use return value** for flow control

**Master checks, and you'll catch bugs before they reach production.**
