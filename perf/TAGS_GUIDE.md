# K6 Tags: Complete Guide to Filtering Metrics by Request Type

A comprehensive guide to using tags in k6 for granular performance monitoring and metric filtering.

## Table of Contents

1. [What Are Tags?](#what-are-tags)
2. [How Tags Work](#how-tags-work)
3. [Tag Syntax & Filtering](#tag-syntax--filtering)
4. [Common Tag Patterns](#common-tag-patterns)
5. [Tag-Based Thresholds](#tag-based-thresholds)
6. [System Tags](#system-tags)
7. [Custom Tags](#custom-tags)
8. [Advanced Filtering](#advanced-filtering)
9. [Real-World Examples](#real-world-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## What Are Tags?

**Tags** are key-value pairs that you attach to HTTP requests to categorize and filter metrics. They allow you to:

- Apply different thresholds to different request types
- Analyze performance by endpoint, user type, region, etc.
- Separate expected failures from real failures
- Track business-specific metrics

### Without Tags (Global Metrics Only)

```javascript
export default function () {
  http.get('/api/products');      // Fast endpoint
  http.get('/api/search?q=test'); // Slow endpoint
}
```

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<500"]  // Same threshold for both!
  }
}
```

**Problem:** If search is slow (800ms) but products is fast (200ms), the p95 might be 600ms and fail the threshold, even though products is performing well.

### With Tags (Granular Metrics)

```javascript
export default function () {
  http.get('/api/products', {
    tags: { endpoint: 'list' }
  });
  
  http.get('/api/search?q=test', {
    tags: { endpoint: 'search' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:search}": ["p(95)<800"]
  }
}
```

**Solution:** Each endpoint has its own threshold. Products must be < 300ms, search can be < 800ms.

---

## How Tags Work

### Tag Attachment

When you add tags to a request, k6 automatically attaches them to **all metrics** for that request:

```javascript
const response = http.get('https://api.example.com/users', {
  tags: { 
    endpoint: 'users',
    api_version: 'v2',
    expected_response: 'true'
  }
});
```

**Metrics created with these tags:**
- `http_req_duration{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_failed{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_blocked{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_connecting{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_sending{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_waiting{endpoint:users,api_version:v2,expected_response:true}`
- `http_req_receiving{endpoint:users,api_version:v2,expected_response:true}`
- `http_reqs{endpoint:users,api_version:v2,expected_response:true}`

### Tag Inheritance

Tags are **per-request**, not global:

```javascript
export default function () {
  // Request 1: has tags
  http.get('/api/users', {
    tags: { endpoint: 'users' }
  });
  
  // Request 2: has different tags
  http.get('/api/products', {
    tags: { endpoint: 'products' }
  });
  
  // Request 3: no tags
  http.get('/api/health');
}
```

Each request is tracked separately based on its tags.

---

## Tag Syntax & Filtering

### Basic Filter Syntax

```json
"metric_name{tag_name:tag_value}": ["threshold"]
```

**Components:**
1. `metric_name` - The metric to filter (e.g., `http_req_duration`)
2. `{...}` - Curly braces contain tag filters
3. `tag_name:tag_value` - The tag filter (exact match)
4. `["threshold"]` - The threshold condition

### Single Tag Filter

```json
{
  "thresholds": {
    "http_req_duration{endpoint:users}": ["p(95)<500"]
  }
}
```

**Applies to:** Only requests tagged with `endpoint: 'users'`

### Multiple Tag Filters (AND Logic)

```json
{
  "thresholds": {
    "http_req_duration{endpoint:users,method:POST}": ["p(95)<800"]
  }
}
```

**Applies to:** Only requests where **BOTH**:
- `endpoint` = `'users'`
- `method` = `'POST'`

### Multiple Thresholds for Same Metric

```json
{
  "thresholds": {
    "http_req_duration": ["p(95)<1000"],                    // All requests
    "http_req_duration{endpoint:users}": ["p(95)<500"],     // Users endpoint
    "http_req_duration{endpoint:search}": ["p(95)<800"],    // Search endpoint
    "http_req_duration{endpoint:checkout}": ["p(95)<2000"]  // Checkout endpoint
  }
}
```

**All thresholds are evaluated independently.**

---

## Common Tag Patterns

### 1. Endpoint Type

**Purpose:** Different performance budgets per endpoint

```javascript
const endpoints = {
  list: '/api/pokemon',
  details: '/api/pokemon/1',
  search: '/api/search/pokemon?q=pika',
  suggestions: '/api/pokemon/suggestions?query=pika'
};

export default function () {
  Object.entries(endpoints).forEach(([name, url]) => {
    http.get(`${BASE_URL}${url}`, {
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
    "http_req_duration{endpoint:search}": ["p(95)<800"],
    "http_req_duration{endpoint:suggestions}": ["p(95)<600"]
  }
}
```

---

### 2. Expected Response (Success vs Failure)

**Purpose:** Separate intentional error tests from real failures

```javascript
export default function () {
  // Normal request (should succeed)
  http.get('/api/pokemon/1', {
    tags: { expected_response: 'true' }
  });
  
  // Error test (should return 404)
  http.get('/api/pokemon/99999', {
    tags: { expected_response: 'false' }
  });
  
  // Error test (should return 400)
  http.get('/api/search/pokemon?q=', {
    tags: { expected_response: 'false' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"]
  }
}
```

**Result:** Only requests expected to succeed count toward the failure threshold.

---

### 3. HTTP Method

**Purpose:** Different thresholds for read vs write operations

```javascript
export default function () {
  http.get('/api/users', {
    tags: { method: 'GET', operation: 'read' }
  });
  
  http.post('/api/users', payload, {
    tags: { method: 'POST', operation: 'write' }
  });
  
  http.put('/api/users/123', payload, {
    tags: { method: 'PUT', operation: 'write' }
  });
  
  http.del('/api/users/123', {
    tags: { method: 'DELETE', operation: 'write' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{operation:read}": ["p(95)<300"],
    "http_req_duration{operation:write}": ["p(95)<800"],
    "http_req_failed{operation:write}": ["rate==0"]  // Zero tolerance for write failures
  }
}
```

---

### 4. User Type / Role

**Purpose:** Different performance expectations per user role

```javascript
const userTypes = ['guest', 'authenticated', 'admin'];

export default function () {
  const userType = userTypes[__VU % userTypes.length];
  
  http.get('/api/dashboard', {
    tags: { user_type: userType }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{user_type:guest}": ["p(95)<500"],
    "http_req_duration{user_type:authenticated}": ["p(95)<400"],
    "http_req_duration{user_type:admin}": ["p(95)<300"]  // Admins get priority
  }
}
```

---

### 5. API Version

**Purpose:** Compare performance between API versions

```javascript
export default function () {
  // Old API
  http.get('/api/v1/users', {
    tags: { api_version: 'v1' }
  });
  
  // New API
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

### 6. Cache Status

**Purpose:** Measure cache effectiveness

```javascript
export default function () {
  // First request (cache miss)
  http.get('/api/pokemon/1', {
    tags: { cache: 'miss' }
  });
  
  // Second request (cache hit)
  http.get('/api/pokemon/1', {
    tags: { cache: 'hit' }
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

### 7. Geographic Region

**Purpose:** Track performance by region

```javascript
const regions = ['us-east', 'us-west', 'eu-west', 'ap-south'];

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
    "http_req_duration{region:us-west}": ["p(95)<250"],
    "http_req_duration{region:eu-west}": ["p(95)<300"],
    "http_req_duration{region:ap-south}": ["p(95)<400"]
  }
}
```

---

### 8. User Journey / Flow

**Purpose:** Track performance of multi-step flows

```javascript
export default function () {
  // Step 1: Browse
  http.get('/api/products', {
    tags: { journey: 'purchase', step: 'browse' }
  });
  sleep(1);
  
  // Step 2: View details
  http.get('/api/products/123', {
    tags: { journey: 'purchase', step: 'view' }
  });
  sleep(2);
  
  // Step 3: Add to cart
  http.post('/api/cart', payload, {
    tags: { journey: 'purchase', step: 'cart' }
  });
  sleep(1);
  
  // Step 4: Checkout
  http.post('/api/checkout', payload, {
    tags: { journey: 'purchase', step: 'checkout' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{journey:purchase}": ["p(95)<2000"],
    "http_req_duration{journey:purchase,step:checkout}": ["p(95)<1000"],
    "http_req_failed{journey:purchase,step:checkout}": ["rate==0"]
  }
}
```

---

### 9. Static vs Dynamic Content

**Purpose:** Different expectations for static vs dynamic resources

```javascript
export default function () {
  // Dynamic API
  http.get('/api/users', {
    tags: { content_type: 'dynamic' }
  });
  
  // Static assets
  http.get('/static/logo.png', {
    tags: { content_type: 'static' }
  });
  
  http.get('/static/styles.css', {
    tags: { content_type: 'static' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{content_type:dynamic}": ["p(95)<500"],
    "http_req_duration{content_type:static}": ["p(95)<100"]  // Static should be fast
  }
}
```

---

### 10. Critical vs Non-Critical

**Purpose:** Stricter thresholds for critical paths

```javascript
export default function () {
  // Critical: payment processing
  http.post('/api/payment', payload, {
    tags: { criticality: 'critical' }
  });
  
  // Non-critical: analytics
  http.post('/api/analytics', data, {
    tags: { criticality: 'non-critical' }
  });
}
```

```json
{
  "thresholds": {
    "http_req_failed{criticality:critical}": ["rate==0"],
    "http_req_duration{criticality:critical}": ["p(95)<500"],
    "http_req_failed{criticality:non-critical}": ["rate<0.1"]  // More tolerant
  }
}
```

---

## Tag-Based Thresholds

### Filtering Specific Metrics

You can filter **any k6 metric** with tags:

```json
{
  "thresholds": {
    // Total request duration
    "http_req_duration{endpoint:search}": ["p(95)<800"],
    
    // Server processing time (TTFB)
    "http_req_waiting{endpoint:search}": ["p(95)<500"],
    
    // Download time
    "http_req_receiving{endpoint:search}": ["p(95)<100"],
    
    // Failure rate
    "http_req_failed{endpoint:search}": ["rate<0.01"],
    
    // Request count
    "http_reqs{endpoint:search}": ["count>100"]
  }
}
```

### Combining Global and Tagged Thresholds

```json
{
  "thresholds": {
    // Global: all requests
    "http_req_duration": ["p(95)<1000", "max<5000"],
    
    // Per-endpoint: stricter limits
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    
    // Critical endpoints: zero tolerance
    "http_req_failed{criticality:critical}": ["rate==0"],
    
    // Non-critical: more lenient
    "http_req_failed{criticality:non-critical}": ["rate<0.05"]
  }
}
```

**All thresholds are evaluated.** A request must pass both global and tagged thresholds.

---

## System Tags

k6 automatically adds **system tags** to all requests. You can use these without defining them:

### Available System Tags

| Tag | Description | Example Values |
|-----|-------------|----------------|
| `proto` | Protocol | `HTTP/1.1`, `HTTP/2` |
| `subproto` | WebSocket subprotocol | `ws`, `wss` |
| `status` | HTTP status code | `200`, `404`, `500` |
| `method` | HTTP method | `GET`, `POST`, `PUT` |
| `url` | Full URL | `https://api.example.com/users` |
| `name` | Request name | Custom or URL |
| `group` | Group name | From `group()` function |
| `scenario` | Scenario name | From options |
| `service` | Service name | From options |
| `expected_response` | Expected response | `true`, `false` |

### Using System Tags

```json
{
  "thresholds": {
    "http_req_duration{status:200}": ["p(95)<500"],
    "http_req_duration{status:404}": ["p(95)<200"],  // 404s should be fast
    "http_req_duration{method:POST}": ["p(95)<800"],
    "http_req_failed{status:5xx}": ["rate==0"]  // No server errors
  }
}
```

### Disabling System Tags

Save memory by disabling unused system tags:

```javascript
export const options = {
  systemTags: ['proto', 'status', 'method']  // Only keep these
};
```

---

## Custom Tags

### Adding Custom Tags

```javascript
export default function () {
  http.get('/api/data', {
    tags: {
      // Your custom tags
      team: 'backend',
      feature: 'search',
      priority: 'high',
      version: '2.1.0'
    }
  });
}
```

### Dynamic Tag Values

```javascript
export default function () {
  const userId = 1000 + __VU;
  const timestamp = new Date().getHours();
  
  http.get(`/api/user/${userId}`, {
    tags: {
      user_id: userId.toString(),
      hour: timestamp.toString(),
      vu: __VU.toString()
    }
  });
}
```

**Warning:** Too many unique tag values can cause memory issues. Avoid:
- Timestamps with seconds/milliseconds
- Unique IDs for every request
- Random values

**Good:** `hour: '14'` (24 possible values)  
**Bad:** `timestamp: '1703342567123'` (infinite unique values)

---

## Advanced Filtering

### Negation (NOT)

k6 doesn't support negation directly, but you can use multiple thresholds:

```json
{
  "thresholds": {
    // All requests
    "http_req_duration": ["p(95)<1000"],
    
    // Specific endpoints with stricter limits
    "http_req_duration{endpoint:critical}": ["p(95)<300"]
  }
}
```

### OR Logic (Multiple Thresholds)

Create separate thresholds for each condition:

```json
{
  "thresholds": {
    "http_req_duration{endpoint:users}": ["p(95)<500"],
    "http_req_duration{endpoint:products}": ["p(95)<500"]
  }
}
```

### Wildcard Matching

k6 doesn't support wildcards, but you can use consistent naming:

```javascript
// Use consistent prefixes
http.get('/api/v1/users', { tags: { api: 'v1', resource: 'users' } });
http.get('/api/v1/products', { tags: { api: 'v1', resource: 'products' } });
http.get('/api/v2/users', { tags: { api: 'v2', resource: 'users' } });
```

```json
{
  "thresholds": {
    "http_req_duration{api:v1}": ["p(95)<600"],
    "http_req_duration{api:v2}": ["p(95)<400"]
  }
}
```

---

## Real-World Examples

### Example 1: E-commerce Site

```javascript
export default function () {
  // Homepage (fast, cached)
  http.get('/api/homepage', {
    tags: { 
      endpoint: 'homepage',
      cache: 'hit',
      criticality: 'high'
    }
  });
  sleep(2);
  
  // Product search (slower, dynamic)
  http.get('/api/search?q=laptop', {
    tags: { 
      endpoint: 'search',
      cache: 'miss',
      criticality: 'medium'
    }
  });
  sleep(3);
  
  // Product details (medium speed)
  http.get('/api/products/123', {
    tags: { 
      endpoint: 'details',
      cache: 'miss',
      criticality: 'high'
    }
  });
  sleep(5);
  
  // Add to cart (critical, must succeed)
  http.post('/api/cart', payload, {
    tags: { 
      endpoint: 'cart',
      operation: 'write',
      criticality: 'critical'
    }
  });
  sleep(2);
  
  // Checkout (critical, must succeed)
  http.post('/api/checkout', payload, {
    tags: { 
      endpoint: 'checkout',
      operation: 'write',
      criticality: 'critical'
    }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{endpoint:homepage}": ["p(95)<200"],
    "http_req_duration{endpoint:search}": ["p(95)<800"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    "http_req_duration{endpoint:cart}": ["p(95)<600"],
    "http_req_duration{endpoint:checkout}": ["p(95)<2000"],
    
    "http_req_failed{criticality:critical}": ["rate==0"],
    "http_req_failed{criticality:high}": ["rate<0.001"],
    "http_req_failed{criticality:medium}": ["rate<0.01"]
  }
}
```

---

### Example 2: Multi-Region API

```javascript
const regions = [
  { name: 'us-east-1', url: 'https://us-east-1.api.example.com', sla: 200 },
  { name: 'us-west-2', url: 'https://us-west-2.api.example.com', sla: 250 },
  { name: 'eu-west-1', url: 'https://eu-west-1.api.example.com', sla: 300 },
  { name: 'ap-south-1', url: 'https://ap-south-1.api.example.com', sla: 400 }
];

export default function () {
  const region = regions[__VU % regions.length];
  
  http.get(`${region.url}/api/data`, {
    tags: { 
      region: region.name,
      sla: region.sla.toString()
    }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{region:us-east-1}": ["p(95)<200"],
    "http_req_duration{region:us-west-2}": ["p(95)<250"],
    "http_req_duration{region:eu-west-1}": ["p(95)<300"],
    "http_req_duration{region:ap-south-1}": ["p(95)<400"],
    
    "http_req_failed": ["rate<0.01"]
  }
}
```

---

### Example 3: API with Authentication Levels

```javascript
export default function () {
  // Public endpoint (no auth)
  http.get('/api/public/status', {
    tags: { 
      auth: 'none',
      endpoint: 'status'
    }
  });
  
  // Authenticated user
  http.get('/api/user/profile', {
    headers: { 'Authorization': 'Bearer user_token' },
    tags: { 
      auth: 'user',
      endpoint: 'profile'
    }
  });
  
  // Admin endpoint
  http.get('/api/admin/stats', {
    headers: { 'Authorization': 'Bearer admin_token' },
    tags: { 
      auth: 'admin',
      endpoint: 'stats'
    }
  });
}
```

```json
{
  "thresholds": {
    "http_req_duration{auth:none}": ["p(95)<100"],
    "http_req_duration{auth:user}": ["p(95)<300"],
    "http_req_duration{auth:admin}": ["p(95)<500"],
    
    "http_req_failed{auth:admin}": ["rate==0"]
  }
}
```

---

## Best Practices

### 1. Use Consistent Naming

```javascript
// ✅ Good: consistent snake_case
tags: { endpoint: 'user_profile', user_type: 'authenticated' }

// ❌ Bad: inconsistent naming
tags: { Endpoint: 'UserProfile', userType: 'authenticated' }
```

### 2. Keep Tag Values Simple

```javascript
// ✅ Good: simple, categorical values
tags: { endpoint: 'search', cache: 'hit', region: 'us-east' }

// ❌ Bad: complex, unique values
tags: { 
  endpoint: '/api/v2/search?q=test&limit=20&offset=0',
  timestamp: Date.now().toString()
}
```

### 3. Limit Tag Cardinality

**Cardinality** = number of unique values

```javascript
// ✅ Good: low cardinality (4 values)
tags: { region: 'us-east' }  // us-east, us-west, eu-west, ap-south

// ❌ Bad: high cardinality (millions of values)
tags: { user_id: userId.toString() }  // 1, 2, 3, 4, ..., 1000000
```

**Why:** High cardinality causes memory issues and makes analysis difficult.

### 4. Tag at Request Level, Not Globally

```javascript
// ❌ Bad: can't differentiate requests
export const options = {
  tags: { endpoint: 'api' }  // Applied to ALL requests
};

// ✅ Good: tag each request individually
export default function () {
  http.get('/api/users', { tags: { endpoint: 'users' } });
  http.get('/api/products', { tags: { endpoint: 'products' } });
}
```

### 5. Document Your Tag Schema

Create a reference for your team:

```javascript
/**
 * Tag Schema:
 * 
 * endpoint: API endpoint type
 *   - list, details, search, suggestions
 * 
 * expected_response: Whether success is expected
 *   - true, false
 * 
 * criticality: Business criticality
 *   - critical, high, medium, low
 * 
 * cache: Cache status
 *   - hit, miss
 */
```

### 6. Combine Tags Strategically

```javascript
// ✅ Good: meaningful combinations
tags: { 
  endpoint: 'checkout',
  operation: 'write',
  criticality: 'critical'
}

// ❌ Redundant: too many overlapping tags
tags: { 
  endpoint: 'checkout',
  url: '/api/checkout',
  path: 'checkout',
  type: 'checkout_endpoint'
}
```

### 7. Use Tags for Debugging

```javascript
export default function () {
  const response = http.get('/api/data', {
    tags: { 
      vu: __VU.toString(),
      iteration: __ITER.toString()
    }
  });
  
  if (response.status !== 200) {
    console.error(`VU ${__VU}, iteration ${__ITER} failed`);
  }
}
```

---

## Troubleshooting

### Problem: Threshold Not Applied

```json
{
  "thresholds": {
    "http_req_duration{endpoint:users}": ["p(95)<500"]
  }
}
```

**Symptom:** Threshold shows 0 samples

**Cause:** No requests have the tag `endpoint: 'users'`

**Solution:** Verify tag is added to requests:

```javascript
http.get('/api/users', {
  tags: { endpoint: 'users' }  // Make sure this matches threshold
});
```

---

### Problem: Tag Value Mismatch

```javascript
// Request
tags: { endpoint: 'Users' }  // Capital U
```

```json
// Threshold
"http_req_duration{endpoint:users}": ["p(95)<500"]  // lowercase u
```

**Cause:** Tag values are case-sensitive

**Solution:** Use consistent casing (prefer lowercase)

---

### Problem: Memory Issues

**Symptom:** k6 uses excessive memory

**Cause:** Too many unique tag values (high cardinality)

```javascript
// ❌ Bad: creates millions of unique tag combinations
tags: { 
  timestamp: Date.now().toString(),
  user_id: userId.toString()
}
```

**Solution:** Use categorical values:

```javascript
// ✅ Good: limited unique values
tags: { 
  hour: new Date().getHours().toString(),  // 0-23
  user_type: 'authenticated'  // guest, authenticated, admin
}
```

---

### Problem: Threshold Always Passes

```json
{
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"]
  }
}
```

**Symptom:** Threshold passes even when requests fail

**Cause:** Forgot to add `expected_response: 'true'` tag to requests

**Solution:**

```javascript
http.get('/api/data', {
  tags: { expected_response: 'true' }  // Add this!
});
```

---

### Problem: Can't Filter by Multiple Values

**Want:** Apply threshold to both `endpoint:users` AND `endpoint:products`

**k6 doesn't support OR logic in tag filters**

**Solution:** Create separate thresholds:

```json
{
  "thresholds": {
    "http_req_duration{endpoint:users}": ["p(95)<500"],
    "http_req_duration{endpoint:products}": ["p(95)<500"]
  }
}
```

Or use a common tag:

```javascript
http.get('/api/users', { tags: { category: 'read' } });
http.get('/api/products', { tags: { category: 'read' } });
```

```json
{
  "thresholds": {
    "http_req_duration{category:read}": ["p(95)<500"]
  }
}
```

---

## Quick Reference

### Essential Tag Patterns

```javascript
// Endpoint type
tags: { endpoint: 'list' }

// Expected success/failure
tags: { expected_response: 'true' }

// HTTP method
tags: { method: 'POST' }

// User type
tags: { user_type: 'authenticated' }

// Criticality
tags: { criticality: 'critical' }

// Cache status
tags: { cache: 'hit' }

// Region
tags: { region: 'us-east' }

// API version
tags: { api_version: 'v2' }
```

### Common Threshold Patterns

```json
{
  "thresholds": {
    // Per-endpoint latency
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    
    // Expected failures only
    "http_req_failed{expected_response:true}": ["rate==0"],
    
    // Critical path zero tolerance
    "http_req_failed{criticality:critical}": ["rate==0"],
    
    // Per-region SLAs
    "http_req_duration{region:us-east}": ["p(95)<200"],
    
    // Write operations
    "http_req_duration{operation:write}": ["p(95)<800"]
  }
}
```

---

## Summary

**Tags are the key to granular performance monitoring in k6.**

- ✅ **Attach tags** to requests to categorize them
- ✅ **Filter metrics** using tag-based thresholds
- ✅ **Apply different SLAs** to different request types
- ✅ **Separate expected failures** from real failures
- ✅ **Track business metrics** with custom tags
- ✅ **Keep tag cardinality low** to avoid memory issues
- ✅ **Use consistent naming** for maintainability

**Master tags, and you'll have precise, actionable performance insights.**
