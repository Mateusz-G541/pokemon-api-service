# K6 Cookies & Session Management: Complete Guide

A comprehensive guide to handling cookies and managing sessions in k6 for realistic authentication and state management, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Are Cookies in k6?](#what-are-cookies-in-k6)
2. [Cookie Theory: Deep Dive](#cookie-theory-deep-dive)
3. [Automatic Cookie Handling](#automatic-cookie-handling)
4. [Cookie Jar API](#cookie-jar-api)
5. [Session Management](#session-management)
6. [Authentication Patterns](#authentication-patterns)
7. [Cookie Attributes](#cookie-attributes)
8. [Advanced Cookie Patterns](#advanced-cookie-patterns)
9. [Real-World Examples](#real-world-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## What Are Cookies in k6?

**Cookies** in k6 are HTTP state management mechanisms that allow servers to store data on the client (VU) and retrieve it across multiple requests.

### Core Concept

```javascript
import http from 'k6/http';

export default function () {
  // 1. Login - Server sets cookie
  const loginRes = http.post('https://example.com/login', {
    username: 'user',
    password: 'pass'
  });
  
  // 2. Subsequent request - Cookie automatically sent
  const dataRes = http.get('https://example.com/api/data');
  // Cookie is automatically included in request
}
```

**What happens:**
1. Login response includes `Set-Cookie` header
2. k6 automatically stores the cookie
3. Future requests to same domain automatically include cookie
4. Server recognizes session and returns user-specific data

### Why Cookies Matter

**Session-based authentication:**
```javascript
// Login creates session
http.post('/login', credentials);
// Session cookie stored automatically

// Protected endpoints work automatically
http.get('/api/profile');  // Cookie sent automatically
http.get('/api/settings'); // Cookie sent automatically
```

**Stateful workflows:**
```javascript
// Shopping cart
http.post('/cart/add', { productId: 123 });  // Cart stored in session
http.get('/cart');                            // Retrieves cart from session
http.post('/checkout', orderData);            // Uses cart from session
```

---

## Cookie Theory: Deep Dive

### HTTP Cookie Mechanism

**Server sets cookie:**
```
HTTP/1.1 200 OK
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure
Content-Type: application/json

{"message": "Login successful"}
```

**Client sends cookie:**
```
GET /api/data HTTP/1.1
Host: example.com
Cookie: sessionId=abc123
```

### k6 Cookie Flow

```
┌─────────────────────────────────────────────────┐
│              VU Cookie Jar                      │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Domain: example.com                     │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ sessionId=abc123                   │  │  │
│  │  │ Path=/                             │  │  │
│  │  │ HttpOnly, Secure                   │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │                                          │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ preferences=dark_mode              │  │  │
│  │  │ Path=/                             │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  HTTP Request ──→ Automatically adds cookies   │
│  HTTP Response ──→ Automatically stores cookies│
└─────────────────────────────────────────────────┘
```

### Cookie Jar Per VU

**Each VU has its own cookie jar:**

```javascript
export default function () {
  // VU 1 logs in as user1
  if (__VU === 1) {
    http.post('/login', { username: 'user1', password: 'pass1' });
  }
  
  // VU 2 logs in as user2
  if (__VU === 2) {
    http.post('/login', { username: 'user2', password: 'pass2' });
  }
  
  // Each VU has different session cookie
  http.get('/api/profile');
  // VU 1 sees user1's profile
  // VU 2 sees user2's profile
}
```

### Cookie Lifecycle

```javascript
export default function () {
  // Iteration 0: Login
  if (__ITER === 0) {
    http.post('/login', credentials);
    // Cookie stored in VU's cookie jar
  }
  
  // Iteration 1+: Cookie persists
  http.get('/api/data');
  // Cookie automatically sent from jar
}
```

**Cookie persists across iterations within same VU!**

---

## Automatic Cookie Handling

### Default Behavior

k6 automatically handles cookies by default:

```javascript
export default function () {
  // 1. Server sets cookie
  http.post('https://example.com/login', {
    username: 'user',
    password: 'pass'
  });
  // Response: Set-Cookie: sessionId=abc123
  
  // 2. Cookie automatically sent
  http.get('https://example.com/api/data');
  // Request: Cookie: sessionId=abc123
  
  // 3. Cookie sent to all requests on same domain
  http.get('https://example.com/api/profile');
  // Request: Cookie: sessionId=abc123
}
```

### Cookie Scope

**Same domain:**
```javascript
http.post('https://api.example.com/login', credentials);
// Sets cookie for api.example.com

http.get('https://api.example.com/data');
// ✅ Cookie sent (same domain)

http.get('https://other.example.com/data');
// ❌ Cookie NOT sent (different subdomain)
```

**Path matching:**
```javascript
// Cookie: sessionId=abc; Path=/api
http.get('https://example.com/api/data');
// ✅ Cookie sent (matches /api)

http.get('https://example.com/admin/data');
// ❌ Cookie NOT sent (doesn't match /api)
```

### Viewing Cookies

```javascript
import http from 'k6/http';

export default function () {
  const loginRes = http.post('https://example.com/login', credentials);
  
  // View cookies in response
  console.log('Set-Cookie headers:', loginRes.headers['Set-Cookie']);
  
  // View current cookies for domain
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL('https://example.com/');
  console.log('Current cookies:', JSON.stringify(cookies));
}
```

---

## Cookie Jar API

### Getting Cookie Jar

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  // Returns VU's cookie jar
}
```

### Setting Cookies Manually

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Set a cookie
  jar.set('https://example.com/', 'sessionId', 'abc123');
  
  // Cookie will be sent in subsequent requests
  http.get('https://example.com/api/data');
}
```

**Full cookie options:**
```javascript
jar.set(
  'https://example.com/',     // URL
  'sessionId',                 // Name
  'abc123',                    // Value
  {
    domain: 'example.com',
    path: '/',
    expires: 'Mon, 02 Jan 2025 15:04:05 GMT',
    max_age: 3600,             // Seconds
    secure: true,
    http_only: true
  }
);
```

### Getting Cookies

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Get all cookies for URL
  const cookies = jar.cookiesForURL('https://example.com/');
  
  cookies.forEach(cookie => {
    console.log(`${cookie.name}: ${cookie.value}`);
  });
}
```

### Deleting Cookies

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Delete a specific cookie
  jar.delete('https://example.com/', 'sessionId');
  
  // Cookie no longer sent
  http.get('https://example.com/api/data');
}
```

### Clearing All Cookies

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Clear all cookies for domain
  jar.clear('https://example.com/');
  
  // Or clear all cookies
  jar.clear();
}
```

---

## Session Management

### Basic Session Pattern

```javascript
import http from 'k6/http';

let sessionToken = null;

export default function () {
  // First iteration: Login
  if (__ITER === 0) {
    const loginRes = http.post('https://api.example.com/login', 
      JSON.stringify({
        username: 'user@example.com',
        password: 'password123'
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    // Session cookie automatically stored
    console.log('Logged in, session cookie stored');
  }
  
  // All iterations: Use session
  const dataRes = http.get('https://api.example.com/api/data');
  // Session cookie automatically sent
  
  console.log(`Data retrieved: ${dataRes.status}`);
}
```

### Session Validation

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  if (__ITER === 0) {
    // Login
    const loginRes = http.post('/login', credentials);
    
    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'session cookie set': (r) => r.headers['Set-Cookie'] !== undefined
    });
  }
  
  // Verify session is valid
  const profileRes = http.get('/api/profile');
  
  check(profileRes, {
    'session valid': (r) => r.status === 200,
    'not redirected to login': (r) => r.url === 'https://example.com/api/profile'
  });
}
```

### Session Refresh

```javascript
import http from 'k6/http';

export default function () {
  if (__ITER === 0) {
    // Initial login
    http.post('/login', credentials);
  }
  
  // Refresh session every 50 iterations
  if (__ITER % 50 === 0 && __ITER > 0) {
    const refreshRes = http.post('/api/refresh-session');
    
    if (refreshRes.status === 200) {
      console.log(`VU ${__VU}: Session refreshed at iteration ${__ITER}`);
    } else {
      console.error(`VU ${__VU}: Session refresh failed, re-logging in`);
      http.post('/login', credentials);
    }
  }
  
  // Regular requests
  http.get('/api/data');
}
```

### Session Expiration Handling

```javascript
import http from 'k6/http';

export default function () {
  if (__ITER === 0) {
    http.post('/login', credentials);
  }
  
  const dataRes = http.get('/api/data');
  
  // Check if session expired
  if (dataRes.status === 401) {
    console.log(`VU ${__VU}: Session expired, re-logging in`);
    
    // Re-login
    const loginRes = http.post('/login', credentials);
    
    if (loginRes.status === 200) {
      // Retry original request
      http.get('/api/data');
    }
  }
}
```

---

## Authentication Patterns

### Pattern 1: Cookie-Based Session

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  if (__ITER === 0) {
    // Login
    const loginRes = http.post('https://example.com/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(loginRes, {
      'login successful': (r) => r.status === 200
    });
    
    // Session cookie (e.g., connect.sid) automatically stored
  }
  
  // Authenticated requests
  const profileRes = http.get('https://example.com/api/profile');
  // Session cookie automatically sent
  
  check(profileRes, {
    'authenticated': (r) => r.status === 200
  });
}
```

### Pattern 2: Token in Cookie

```javascript
import http from 'k6/http';

export default function () {
  if (__ITER === 0) {
    // Login - server sets JWT in cookie
    http.post('https://api.example.com/auth/login', 
      JSON.stringify({
        username: 'user',
        password: 'pass'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    // Response: Set-Cookie: token=eyJhbGc...
  }
  
  // Token cookie automatically sent
  http.get('https://api.example.com/api/data');
  // Request includes: Cookie: token=eyJhbGc...
}
```

### Pattern 3: Mixed Cookie + Header Auth

```javascript
import http from 'k6/http';

let csrfToken = null;

export default function () {
  if (__ITER === 0) {
    // Login
    const loginRes = http.post('/login', credentials);
    
    // Session cookie stored automatically
    // CSRF token in response body
    csrfToken = loginRes.json('csrfToken');
  }
  
  // Requests need both session cookie AND CSRF header
  http.post('/api/action', 
    JSON.stringify({ data: 'value' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    }
  );
  // Session cookie sent automatically
  // CSRF token sent in header
}
```

### Pattern 4: Multiple Cookies

```javascript
import http from 'k6/http';

export default function () {
  if (__ITER === 0) {
    // Login sets multiple cookies
    http.post('/login', credentials);
    // Response:
    // Set-Cookie: sessionId=abc123
    // Set-Cookie: userId=user123
    // Set-Cookie: preferences=dark_mode
  }
  
  // All cookies automatically sent
  http.get('/api/data');
  // Request: Cookie: sessionId=abc123; userId=user123; preferences=dark_mode
}
```

---

## Cookie Attributes

### Secure Cookies

```javascript
// Server sets secure cookie
// Set-Cookie: sessionId=abc123; Secure

// k6 automatically handles Secure attribute
http.get('https://example.com/api/data');  // ✅ Sent (HTTPS)
http.get('http://example.com/api/data');   // ❌ Not sent (HTTP)
```

### HttpOnly Cookies

```javascript
// Server sets HttpOnly cookie
// Set-Cookie: sessionId=abc123; HttpOnly

// k6 handles HttpOnly cookies normally
// (HttpOnly prevents JavaScript access in browsers, but k6 isn't a browser)
const jar = http.cookieJar();
const cookies = jar.cookiesForURL('https://example.com/');
console.log(cookies);  // Can see HttpOnly cookies
```

### SameSite Cookies

```javascript
// Server sets SameSite cookie
// Set-Cookie: sessionId=abc123; SameSite=Strict

// k6 respects SameSite attribute
http.get('https://example.com/api/data');      // ✅ Sent (same site)
http.get('https://other.com/api/data');        // ❌ Not sent (cross-site)
```

### Cookie Expiration

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Set cookie with expiration
  jar.set('https://example.com/', 'tempSession', 'xyz789', {
    expires: 'Mon, 02 Jan 2025 15:04:05 GMT'
  });
  
  // Or use max-age (seconds)
  jar.set('https://example.com/', 'shortSession', 'temp123', {
    max_age: 3600  // 1 hour
  });
  
  // Cookies automatically expire
  // Expired cookies not sent in requests
}
```

---

## Advanced Cookie Patterns

### Per-VU User Sessions

```javascript
import { SharedArray } from 'k6/data';
import http from 'k6/http';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  // Each VU gets a different user
  const user = users[(__VU - 1) % users.length];
  
  if (__ITER === 0) {
    // Login as assigned user
    http.post('https://example.com/login', 
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    console.log(`VU ${__VU}: Logged in as ${user.email}`);
  }
  
  // Each VU maintains separate session
  http.get('https://example.com/api/profile');
  // VU 1 sees user1's profile
  // VU 2 sees user2's profile
}
```

### Cookie Inspection

```javascript
import http from 'k6/http';

export default function () {
  if (__ITER === 0) {
    http.post('/login', credentials);
  }
  
  // Inspect cookies
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL('https://example.com/');
  
  cookies.forEach(cookie => {
    console.log(`Cookie: ${cookie.name}`);
    console.log(`  Value: ${cookie.value}`);
    console.log(`  Domain: ${cookie.domain}`);
    console.log(`  Path: ${cookie.path}`);
    console.log(`  Expires: ${cookie.expires}`);
    console.log(`  HttpOnly: ${cookie.http_only}`);
    console.log(`  Secure: ${cookie.secure}`);
  });
}
```

### Cookie Manipulation

```javascript
import http from 'k6/http';

export default function () {
  const jar = http.cookieJar();
  
  // Manually set session cookie (e.g., from external source)
  jar.set('https://api.example.com/', 'sessionId', 'predefined-session-123', {
    path: '/',
    secure: true,
    http_only: true
  });
  
  // Use predefined session
  http.get('https://api.example.com/api/data');
}
```

### Cookie Persistence Across Scenarios

```javascript
export const options = {
  scenarios: {
    login: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 1,
      exec: 'login'
    },
    browse: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      exec: 'browse',
      startTime: '5s'  // Start after login
    }
  }
};

export function login() {
  // Login and establish session
  http.post('https://example.com/login', credentials);
  console.log(`VU ${__VU}: Logged in`);
}

export function browse() {
  // Session cookie persists from login scenario
  http.get('https://example.com/api/data');
  console.log(`VU ${__VU}: Browsing with session`);
}
```

---

## Real-World Examples

### Example 1: E-commerce Session

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  const user = users[(__VU - 1) % users.length];
  
  // Iteration 0: Login
  if (__ITER === 0) {
    const loginRes = http.post('https://shop.example.com/api/login', 
      JSON.stringify({
        email: user.email,
        password: user.password
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'session cookie set': (r) => {
        const cookies = http.cookieJar().cookiesForURL('https://shop.example.com/');
        return cookies.some(c => c.name === 'sessionId');
      }
    });
    
    console.log(`VU ${__VU}: Logged in as ${user.email}`);
    sleep(1);
  }
  
  // Browse products
  const productsRes = http.get('https://shop.example.com/api/products');
  check(productsRes, {
    'products loaded': (r) => r.status === 200
  });
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
  sleep(1);
  
  // View cart
  const viewCartRes = http.get('https://shop.example.com/api/cart');
  check(viewCartRes, {
    'cart retrieved': (r) => r.status === 200,
    'cart has items': (r) => r.json('items').length > 0
  });
  sleep(2);
  
  // Checkout (every 5th iteration)
  if (__ITER % 5 === 4) {
    const checkoutRes = http.post('https://shop.example.com/api/checkout', 
      JSON.stringify({
        paymentMethod: 'card',
        shippingAddress: user.address
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(checkoutRes, {
      'checkout successful': (r) => r.status === 200
    });
    
    console.log(`VU ${__VU}: Completed checkout`);
    sleep(3);
  }
}
```

### Example 2: SaaS Application with CSRF

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

let csrfToken = null;

export default function () {
  // Iteration 0: Login
  if (__ITER === 0) {
    // Get CSRF token from login page
    const loginPageRes = http.get('https://app.example.com/login');
    const loginPage = loginPageRes.body;
    
    // Extract CSRF token (simplified - use proper parsing in production)
    const csrfMatch = loginPage.match(/csrf-token" content="([^"]+)"/);
    csrfToken = csrfMatch ? csrfMatch[1] : null;
    
    // Login with CSRF token
    const loginRes = http.post('https://app.example.com/api/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123',
        _csrf: csrfToken
      }),
      {
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      }
    );
    
    check(loginRes, {
      'login successful': (r) => r.status === 200
    });
    
    // Update CSRF token from response
    csrfToken = loginRes.json('csrfToken');
    
    console.log(`VU ${__VU}: Logged in with CSRF protection`);
    sleep(1);
  }
  
  // Dashboard
  const dashboardRes = http.get('https://app.example.com/api/dashboard');
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200
  });
  sleep(2);
  
  // Create report (requires CSRF token)
  const reportRes = http.post('https://app.example.com/api/reports', 
    JSON.stringify({
      type: 'sales',
      dateRange: 'last-30-days'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    }
  );
  
  check(reportRes, {
    'report created': (r) => r.status === 201
  });
  sleep(3);
  
  // Update settings (requires CSRF token)
  const settingsRes = http.put('https://app.example.com/api/settings', 
    JSON.stringify({
      theme: 'dark',
      notifications: true
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      }
    }
  );
  
  check(settingsRes, {
    'settings updated': (r) => r.status === 200
  });
  sleep(2);
}
```

### Example 3: Multi-Domain Session

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
  if (__ITER === 0) {
    // Login on main domain
    const loginRes = http.post('https://accounts.example.com/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(loginRes, {
      'login successful': (r) => r.status === 200
    });
    
    // Session cookie set for .example.com domain
    // Cookie: sessionId=abc123; Domain=.example.com
    
    console.log(`VU ${__VU}: Logged in on accounts.example.com`);
    sleep(1);
  }
  
  // Access API subdomain (cookie shared)
  const apiRes = http.get('https://api.example.com/user/profile');
  check(apiRes, {
    'API authenticated': (r) => r.status === 200
  });
  sleep(1);
  
  // Access app subdomain (cookie shared)
  const appRes = http.get('https://app.example.com/dashboard');
  check(appRes, {
    'App authenticated': (r) => r.status === 200
  });
  sleep(2);
  
  // Access CDN subdomain (cookie shared)
  const cdnRes = http.get('https://cdn.example.com/user/avatar.jpg');
  check(cdnRes, {
    'CDN authenticated': (r) => r.status === 200
  });
  sleep(1);
}
```

### Example 4: Session Timeout Handling

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const SESSION_TIMEOUT = 300;  // 5 minutes in seconds
let lastLoginTime = 0;

export default function () {
  const now = Date.now() / 1000;  // Current time in seconds
  
  // Login if first iteration or session expired
  if (__ITER === 0 || (now - lastLoginTime) > SESSION_TIMEOUT) {
    console.log(`VU ${__VU}: Session expired or first iteration, logging in`);
    
    const loginRes = http.post('https://example.com/api/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(loginRes, {
      'login successful': (r) => r.status === 200
    });
    
    lastLoginTime = Date.now() / 1000;
    sleep(1);
  }
  
  // Make API request
  const dataRes = http.get('https://example.com/api/data');
  
  // Check if session is still valid
  if (dataRes.status === 401) {
    console.log(`VU ${__VU}: Session invalid, re-logging in`);
    
    // Re-login
    const loginRes = http.post('https://example.com/api/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    lastLoginTime = Date.now() / 1000;
    
    // Retry original request
    http.get('https://example.com/api/data');
  } else {
    check(dataRes, {
      'data retrieved': (r) => r.status === 200
    });
  }
  
  sleep(2);
}
```

---

## Best Practices

### 1. Let k6 Handle Cookies Automatically

```javascript
// ✅ Good: Automatic cookie handling
export default function () {
  http.post('/login', credentials);
  // Cookie stored automatically
  
  http.get('/api/data');
  // Cookie sent automatically
}

// ❌ Bad: Manual cookie management (unless necessary)
export default function () {
  const loginRes = http.post('/login', credentials);
  const cookie = extractCookie(loginRes);
  
  http.get('/api/data', {
    headers: { 'Cookie': cookie }
  });
}
```

### 2. Login Once Per VU

```javascript
// ✅ Good: Login in first iteration
export default function () {
  if (__ITER === 0) {
    http.post('/login', credentials);
  }
  
  http.get('/api/data');
}

// ❌ Bad: Login every iteration
export default function () {
  http.post('/login', credentials);
  http.get('/api/data');
}
```

### 3. Assign Different Users to Different VUs

```javascript
// ✅ Good: Each VU = different user
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

export default function () {
  const user = users[(__VU - 1) % users.length];
  
  if (__ITER === 0) {
    http.post('/login', {
      email: user.email,
      password: user.password
    });
  }
}
```

### 4. Validate Session Establishment

```javascript
// ✅ Good: Verify session cookie
export default function () {
  if (__ITER === 0) {
    const loginRes = http.post('/login', credentials);
    
    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'session cookie set': (r) => {
        const cookies = http.cookieJar().cookiesForURL('https://example.com/');
        return cookies.length > 0;
      }
    });
  }
}
```

### 5. Handle Session Expiration

```javascript
// ✅ Good: Handle 401 responses
export default function () {
  const res = http.get('/api/data');
  
  if (res.status === 401) {
    console.log('Session expired, re-logging in');
    http.post('/login', credentials);
    http.get('/api/data');  // Retry
  }
}
```

### 6. Use HTTPS for Secure Cookies

```javascript
// ✅ Good: HTTPS for secure cookies
http.post('https://example.com/login', credentials);

// ⚠️ Warning: HTTP won't work with Secure cookies
http.post('http://example.com/login', credentials);
```

### 7. Clear Cookies When Needed

```javascript
// ✅ Good: Logout clears session
export default function () {
  // ... test logic ...
  
  // Logout
  http.post('/logout');
  
  // Clear cookies
  const jar = http.cookieJar();
  jar.clear('https://example.com/');
}
```

---

## Troubleshooting

### Problem: Session Not Persisting

**Symptom:** Requests return 401 after login

**Cause:** Cookie not being set or sent

**Solution:** Check cookie is set and domain matches

```javascript
export default function () {
  if (__ITER === 0) {
    const loginRes = http.post('https://example.com/login', credentials);
    
    // Debug: Check Set-Cookie header
    console.log('Set-Cookie:', loginRes.headers['Set-Cookie']);
    
    // Debug: Check cookies in jar
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://example.com/');
    console.log('Cookies:', JSON.stringify(cookies));
  }
  
  const dataRes = http.get('https://example.com/api/data');
  console.log('Data response status:', dataRes.status);
}
```

---

### Problem: Cookie Not Sent to Subdomain

**Symptom:** Cookie works on main domain but not subdomain

**Cause:** Cookie domain doesn't include subdomain

**Solution:** Check cookie domain attribute

```javascript
// Cookie set for example.com
// Set-Cookie: sessionId=abc; Domain=example.com

http.get('https://example.com/data');      // ✅ Works
http.get('https://api.example.com/data');  // ❌ Doesn't work

// Need cookie with Domain=.example.com (note the dot)
// Set-Cookie: sessionId=abc; Domain=.example.com
```

---

### Problem: Secure Cookie Not Sent

**Symptom:** Cookie not sent over HTTPS

**Cause:** Using HTTP instead of HTTPS

**Solution:** Use HTTPS for Secure cookies

```javascript
// Cookie: sessionId=abc; Secure

http.get('http://example.com/data');   // ❌ Not sent (HTTP)
http.get('https://example.com/data');  // ✅ Sent (HTTPS)
```

---

### Problem: Multiple VUs Share Session

**Symptom:** All VUs see same user data

**Cause:** Shared session cookie (shouldn't happen in k6)

**Solution:** Verify each VU logs in separately

```javascript
// Each VU should have its own cookie jar
export default function () {
  if (__ITER === 0) {
    console.log(`VU ${__VU}: Logging in`);
    http.post('/login', credentials);
    
    // Debug: Check VU's cookies
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL('https://example.com/');
    console.log(`VU ${__VU} cookies:`, JSON.stringify(cookies));
  }
}
```

---

## Quick Reference

### Automatic Cookie Handling

```javascript
// Login - cookie stored automatically
http.post('/login', credentials);

// Subsequent requests - cookie sent automatically
http.get('/api/data');
```

### Manual Cookie Management

```javascript
const jar = http.cookieJar();

// Set cookie
jar.set('https://example.com/', 'name', 'value');

// Get cookies
const cookies = jar.cookiesForURL('https://example.com/');

// Delete cookie
jar.delete('https://example.com/', 'name');

// Clear all cookies
jar.clear();
```

### Session Pattern

```javascript
export default function () {
  if (__ITER === 0) {
    http.post('/login', credentials);
  }
  
  http.get('/api/data');
}
```

---

## Summary

**Cookie handling enables realistic session-based testing:**

- ✅ **Automatic cookie handling** - k6 manages cookies by default
- ✅ **Per-VU cookie jars** - Each VU has isolated cookies
- ✅ **Session persistence** - Cookies persist across iterations
- ✅ **Login once per VU** - Establish session in first iteration
- ✅ **Different users per VU** - Assign users based on `__VU`
- ✅ **Validate sessions** - Check cookie is set after login
- ✅ **Handle expiration** - Re-login on 401 responses
- ✅ **Use HTTPS** - Required for Secure cookies
- ❌ **Don't login every iteration** - Wastes resources
- ❌ **Don't manually manage** - Unless necessary

**Master cookie handling, and you'll create realistic tests that accurately simulate authenticated user sessions and stateful workflows.**
