# K6 Groups: Complete Guide to Organizing Test Sections

A comprehensive guide to using k6 groups for organizing tests, measuring section performance, and creating logical test structure with detailed theory and extensive examples.

## Table of Contents

1. [What Are Groups?](#what-are-groups)
2. [Groups Theory: Deep Dive](#groups-theory-deep-dive)
3. [Group Syntax & Mechanics](#group-syntax--mechanics)
4. [Automatic Metrics](#automatic-metrics)
5. [Nested Groups](#nested-groups)
6. [Groups with Checks](#groups-with-checks)
7. [Groups with Tags](#groups-with-tags)
8. [Group-Based Thresholds](#group-based-thresholds)
9. [User Journey Modeling](#user-journey-modeling)
10. [Performance Measurement](#performance-measurement)
11. [Organization Patterns](#organization-patterns)
12. [Real-World Examples](#real-world-examples)
13. [Best Practices](#best-practices)
14. [Troubleshooting](#troubleshooting)

---

## What Are Groups?

**Groups** are k6's mechanism for organizing test code into logical sections and automatically measuring the performance of each section.

### Core Concept

```javascript
import { group } from 'k6';
import http from 'k6/http';

export default function () {
  group('Homepage', function () {
    http.get('https://example.com/');
  });
  
  group('Login', function () {
    http.post('https://example.com/login', { user: 'test', pass: '123' });
  });
  
  group('Dashboard', function () {
    http.get('https://example.com/dashboard');
  });
}
```

**What happens:**
1. k6 executes each group sequentially
2. Measures total time for each group
3. Creates automatic metrics for each group
4. Organizes output by group name

### Why Use Groups?

**Without groups:**
```javascript
export default function () {
  http.get('https://example.com/');
  http.post('https://example.com/login', credentials);
  http.get('https://example.com/dashboard');
  http.get('https://example.com/profile');
}
```

**Output:**
```
http_req_duration.............: avg=234ms min=100ms max=500ms
```

**Problem:** Can't tell which request is slow!

**With groups:**
```javascript
export default function () {
  group('Homepage', () => {
    http.get('https://example.com/');
  });
  
  group('Login', () => {
    http.post('https://example.com/login', credentials);
  });
  
  group('Dashboard', () => {
    http.get('https://example.com/dashboard');
  });
  
  group('Profile', () => {
    http.get('https://example.com/profile');
  });
}
```

**Output:**
```
group_duration{group:::Homepage}...: avg=150ms
group_duration{group:::Login}......: avg=300ms
group_duration{group:::Dashboard}..: avg=200ms
group_duration{group:::Profile}....: avg=180ms
```

**Solution:** Clear visibility into each section's performance!

---

## Groups Theory: Deep Dive

### Execution Model

Groups execute **synchronously** within a VU:

```javascript
export default function () {
  console.log('1. Start');
  
  group('Group A', function () {
    console.log('2. Inside Group A');
    http.get(url);
    console.log('3. Still in Group A');
  });
  
  console.log('4. Between groups');
  
  group('Group B', function () {
    console.log('5. Inside Group B');
    http.get(url);
  });
  
  console.log('6. End');
}
```

**Execution order:** 1 → 2 → 3 → 4 → 5 → 6

### Timing Mechanism

k6 measures group duration from start to end of the group function:

```javascript
group('Example', function () {
  // Timer starts here
  
  http.get(url1);        // ~200ms
  sleep(1);              // 1000ms
  http.get(url2);        // ~150ms
  
  // Timer stops here
  // Total group_duration ≈ 1350ms
});
```

**Group duration includes:**
- ✅ HTTP request time
- ✅ Sleep time
- ✅ JavaScript execution time
- ✅ Check execution time
- ✅ Everything inside the group function

### Metric Creation

For each group, k6 automatically creates:

```javascript
group('User Login', function () {
  http.post('/api/login', credentials);
});
```

**Metrics created:**
1. `group_duration{group:::User Login}` - Total time for the group
2. All HTTP metrics are tagged with the group name:
   - `http_req_duration{group:::User Login}`
   - `http_req_failed{group:::User Login}`
   - `http_reqs{group:::User Login}`

### Group Context

Groups create a **context** that affects all metrics inside:

```javascript
group('API Calls', function () {
  http.get('/api/users');     // Tagged with group:::API Calls
  http.get('/api/products');  // Tagged with group:::API Calls
  
  check(response, {
    'status ok': (r) => r.status === 200
  });  // Check tagged with group:::API Calls
});

http.get('/api/health');  // NOT tagged with any group
```

---

## Group Syntax & Mechanics

### Basic Syntax

```javascript
group(name, function)
```

**Parameters:**
1. `name` (string) - Group name (shown in metrics)
2. `function` - Function to execute within the group

### Return Value

```javascript
const result = group('My Group', function () {
  return 'some value';
});

console.log(result);  // 'some value'
```

Groups return whatever the function returns.

### Arrow Function Syntax

```javascript
// Function declaration
group('Group 1', function () {
  http.get(url);
});

// Arrow function
group('Group 2', () => {
  http.get(url);
});

// Both are equivalent
```

### Group Naming

```javascript
// ✅ Good: Descriptive names
group('User Authentication', () => { ... });
group('Product Search', () => { ... });
group('Checkout Process', () => { ... });

// ❌ Bad: Vague names
group('Test 1', () => { ... });
group('API', () => { ... });
group('Group', () => { ... });
```

**Naming conventions:**
- Use descriptive, action-oriented names
- Use title case or sentence case
- Keep names concise but clear
- Avoid special characters (they work but complicate filtering)

---

## Automatic Metrics

### group_duration Metric

**Primary metric created by groups:**

```javascript
group('Homepage Load', function () {
  http.get('https://example.com/');
  http.get('https://example.com/styles.css');
  http.get('https://example.com/script.js');
});
```

**Metric:**
```
group_duration{group:::Homepage Load}
  avg=450ms min=380ms med=440ms max=520ms p(90)=490ms p(95)=510ms
```

**What it measures:** Total time from group start to group end

### Tagged HTTP Metrics

All HTTP requests inside a group are automatically tagged:

```javascript
group('User Profile', function () {
  http.get('/api/user/123');
  http.get('/api/user/123/posts');
});
```

**Metrics created:**
```
http_req_duration{group:::User Profile}
http_req_failed{group:::User Profile}
http_req_blocked{group:::User Profile}
http_req_connecting{group:::User Profile}
http_req_sending{group:::User Profile}
http_req_waiting{group:::User Profile}
http_req_receiving{group:::User Profile}
http_reqs{group:::User Profile}
```

### Check Metrics

Checks inside groups are also tagged:

```javascript
group('API Validation', function () {
  const response = http.get('/api/data');
  
  check(response, {
    'status is 200': (r) => r.status === 200
  });
});
```

**Metric:**
```
checks{group:::API Validation}.........: 100.00% ✓ 50  ✗ 0
```

---

## Nested Groups

### Hierarchy Structure

Groups can be nested to create hierarchical organization:

```javascript
export default function () {
  group('E-commerce Flow', function () {
    
    group('Authentication', function () {
      http.post('/api/login', credentials);
    });
    
    group('Shopping', function () {
      
      group('Browse Products', function () {
        http.get('/api/products');
      });
      
      group('View Product Details', function () {
        http.get('/api/products/123');
      });
      
      group('Add to Cart', function () {
        http.post('/api/cart', item);
      });
    });
    
    group('Checkout', function () {
      http.post('/api/checkout', order);
    });
  });
}
```

### Nested Metrics

Each level creates its own metrics:

```
group_duration{group:::E-commerce Flow}...........................: avg=5200ms
group_duration{group:::E-commerce Flow::Authentication}..........: avg=300ms
group_duration{group:::E-commerce Flow::Shopping}................: avg=3500ms
group_duration{group:::E-commerce Flow::Shopping::Browse Products}: avg=200ms
group_duration{group:::E-commerce Flow::Shopping::View Product Details}: avg=250ms
group_duration{group:::E-commerce Flow::Shopping::Add to Cart}...: avg=150ms
group_duration{group:::E-commerce Flow::Checkout}................: avg=1400ms
```

**Hierarchy separator:** `::`

### Timing Behavior

Parent group duration **includes** all child groups:

```javascript
group('Parent', function () {
  // Parent timer starts
  
  sleep(0.1);  // 100ms
  
  group('Child 1', function () {
    sleep(0.2);  // 200ms
  });  // Child 1 duration = 200ms
  
  sleep(0.1);  // 100ms
  
  group('Child 2', function () {
    sleep(0.3);  // 300ms
  });  // Child 2 duration = 300ms
  
  sleep(0.1);  // 100ms
  
  // Parent timer stops
});  // Parent duration = 800ms (100 + 200 + 100 + 300 + 100)
```

### Depth Limits

**No hard limit** on nesting depth, but practical recommendations:

```javascript
// ✅ Good: 2-3 levels
group('Level 1', () => {
  group('Level 2', () => {
    group('Level 3', () => {
      // Still readable
    });
  });
});

// ❌ Bad: Too deep
group('L1', () => {
  group('L2', () => {
    group('L3', () => {
      group('L4', () => {
        group('L5', () => {
          // Hard to read, overly complex
        });
      });
    });
  });
});
```

---

## Groups with Checks

### Combining Groups and Checks

```javascript
group('User Registration', function () {
  const response = http.post('/api/register', {
    username: 'newuser',
    email: 'user@example.com',
    password: 'secure123'
  });
  
  check(response, {
    'registration successful': (r) => r.status === 201,
    'returns user id': (r) => r.json().id !== undefined,
    'returns auth token': (r) => r.json().token !== undefined
  });
});
```

**Metrics created:**
```
group_duration{group:::User Registration}........: avg=450ms
checks{group:::User Registration}................: 100.00% ✓ 15  ✗ 0
http_req_duration{group:::User Registration}.....: avg=430ms
```

### Check Organization

Use groups to organize related checks:

```javascript
group('Data Validation', function () {
  const response = http.get('/api/users');
  
  group('Structure Checks', function () {
    check(response, {
      'has users array': (r) => Array.isArray(r.json().users),
      'has pagination': (r) => r.json().page !== undefined
    });
  });
  
  group('Content Checks', function () {
    check(response, {
      'all users have id': (r) => r.json().users.every(u => u.id),
      'all users have email': (r) => r.json().users.every(u => u.email)
    });
  });
});
```

**Metrics:**
```
checks{group:::Data Validation::Structure Checks}...: 100.00% ✓ 10  ✗ 0
checks{group:::Data Validation::Content Checks}.....: 100.00% ✓ 10  ✗ 0
```

---

## Groups with Tags

### Adding Tags to Groups

Groups don't directly support tags, but you can tag requests inside groups:

```javascript
group('API Calls', function () {
  http.get('/api/users', {
    tags: { endpoint: 'users', criticality: 'high' }
  });
  
  http.get('/api/products', {
    tags: { endpoint: 'products', criticality: 'medium' }
  });
});
```

**Metrics created:**
```
http_req_duration{group:::API Calls,endpoint:users,criticality:high}
http_req_duration{group:::API Calls,endpoint:products,criticality:medium}
```

### Combining Group and Tag Filters

```json
{
  "thresholds": {
    "http_req_duration{group:::API Calls}": ["p(95)<500"],
    "http_req_duration{group:::API Calls,endpoint:users}": ["p(95)<300"],
    "http_req_duration{group:::API Calls,criticality:high}": ["p(95)<200"]
  }
}
```

---

## Group-Based Thresholds

### Basic Group Thresholds

```javascript
export const options = {
  thresholds: {
    'group_duration{group:::User Login}': ['avg<500', 'p(95)<800'],
    'group_duration{group:::Product Search}': ['avg<1000', 'p(95)<1500'],
    'group_duration{group:::Checkout}': ['avg<2000', 'p(95)<3000']
  }
};

export default function () {
  group('User Login', () => {
    http.post('/api/login', credentials);
  });
  
  group('Product Search', () => {
    http.get('/api/search?q=laptop');
  });
  
  group('Checkout', () => {
    http.post('/api/checkout', order);
  });
}
```

### Nested Group Thresholds

```javascript
export const options = {
  thresholds: {
    // Parent group
    'group_duration{group:::E-commerce Flow}': ['avg<10000'],
    
    // Child groups
    'group_duration{group:::E-commerce Flow::Authentication}': ['avg<500'],
    'group_duration{group:::E-commerce Flow::Shopping}': ['avg<5000'],
    'group_duration{group:::E-commerce Flow::Checkout}': ['avg<3000'],
    
    // Grandchild groups
    'group_duration{group:::E-commerce Flow::Shopping::Browse Products}': ['avg<300']
  }
};
```

### HTTP Metrics by Group

```javascript
export const options = {
  thresholds: {
    // Group duration
    'group_duration{group:::Critical API}': ['p(95)<500'],
    
    // HTTP metrics within group
    'http_req_duration{group:::Critical API}': ['p(95)<400'],
    'http_req_failed{group:::Critical API}': ['rate==0'],
    
    // Checks within group
    'checks{group:::Critical API}': ['rate>0.99']
  }
};
```

---

## User Journey Modeling

### Sequential User Flow

```javascript
export default function () {
  group('1. Homepage Visit', function () {
    http.get('https://shop.example.com/');
    sleep(randomBetween(2, 5));
  });
  
  group('2. Product Search', function () {
    http.get('https://shop.example.com/search?q=laptop');
    sleep(randomBetween(3, 7));
  });
  
  group('3. View Product', function () {
    http.get('https://shop.example.com/products/123');
    sleep(randomBetween(5, 10));
  });
  
  group('4. Add to Cart', function () {
    http.post('https://shop.example.com/cart', { product: 123, qty: 1 });
    sleep(randomBetween(1, 3));
  });
  
  group('5. Checkout', function () {
    http.post('https://shop.example.com/checkout', orderData);
    sleep(1);
  });
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

**Output shows complete journey timing:**
```
group_duration{group:::1. Homepage Visit}.....: avg=3200ms
group_duration{group:::2. Product Search}.....: avg=4500ms
group_duration{group:::3. View Product}.......: avg=6800ms
group_duration{group:::4. Add to Cart}........: avg=1800ms
group_duration{group:::5. Checkout}...........: avg=2100ms
```

### Conditional User Paths

```javascript
export default function () {
  group('Homepage', function () {
    http.get('https://example.com/');
  });
  
  const userType = Math.random();
  
  if (userType < 0.3) {
    // 30% of users register
    group('User Registration', function () {
      http.post('/api/register', newUserData);
    });
  } else if (userType < 0.6) {
    // 30% of users login
    group('User Login', function () {
      http.post('/api/login', credentials);
    });
  } else {
    // 40% browse as guest
    group('Guest Browsing', function () {
      http.get('/api/products');
    });
  }
  
  group('Product Interaction', function () {
    http.get('/api/products/123');
  });
}
```

### Multi-Step Workflows

```javascript
export default function () {
  group('Booking Flow', function () {
    
    group('Step 1: Search Flights', function () {
      const searchRes = http.get('/api/flights?from=NYC&to=LAX&date=2024-01-15');
      
      check(searchRes, {
        'flights found': (r) => r.json().flights.length > 0
      });
    });
    
    group('Step 2: Select Flight', function () {
      const selectRes = http.post('/api/booking/select', { flightId: 123 });
      
      check(selectRes, {
        'flight selected': (r) => r.status === 200
      });
    });
    
    group('Step 3: Passenger Details', function () {
      const detailsRes = http.post('/api/booking/passengers', passengerData);
      
      check(detailsRes, {
        'details saved': (r) => r.status === 200
      });
    });
    
    group('Step 4: Payment', function () {
      const paymentRes = http.post('/api/booking/payment', paymentData);
      
      check(paymentRes, {
        'payment successful': (r) => r.status === 200,
        'booking confirmed': (r) => r.json().bookingId !== undefined
      });
    });
    
    group('Step 5: Confirmation', function () {
      const confirmRes = http.get('/api/booking/confirmation');
      
      check(confirmRes, {
        'has confirmation': (r) => r.status === 200
      });
    });
  });
}
```

---

## Performance Measurement

### Measuring Page Load Time

```javascript
group('Page Load: Homepage', function () {
  // Main HTML
  const html = http.get('https://example.com/');
  
  // Parse and load resources (simplified)
  const resources = [
    'https://example.com/styles.css',
    'https://example.com/script.js',
    'https://example.com/logo.png',
    'https://example.com/api/data'
  ];
  
  // Load resources in parallel
  http.batch(resources.map(url => ['GET', url]));
});
```

**Metric shows total page load time:**
```
group_duration{group:::Page Load: Homepage}...: avg=1250ms
```

### Measuring API Response Time

```javascript
group('API Performance', function () {
  
  group('Fast Endpoint', function () {
    http.get('/api/health');
  });  // Expected: ~50ms
  
  group('Medium Endpoint', function () {
    http.get('/api/users');
  });  // Expected: ~200ms
  
  group('Slow Endpoint', function () {
    http.get('/api/reports/generate');
  });  // Expected: ~2000ms
});
```

**Compare performance:**
```
group_duration{group:::API Performance::Fast Endpoint}.....: avg=48ms
group_duration{group:::API Performance::Medium Endpoint}...: avg=215ms
group_duration{group:::API Performance::Slow Endpoint}.....: avg=1980ms
```

### Measuring Business Transactions

```javascript
group('Complete Purchase Transaction', function () {
  // Transaction starts
  
  group('Inventory Check', function () {
    http.get('/api/inventory/check?product=123');
  });
  
  group('Reserve Item', function () {
    http.post('/api/inventory/reserve', { product: 123 });
  });
  
  group('Process Payment', function () {
    http.post('/api/payment/process', paymentData);
  });
  
  group('Update Inventory', function () {
    http.post('/api/inventory/update', { product: 123, qty: -1 });
  });
  
  group('Send Confirmation', function () {
    http.post('/api/notifications/send', confirmationData);
  });
  
  // Transaction ends
});
```

**Metric shows total transaction time:**
```
group_duration{group:::Complete Purchase Transaction}.........: avg=3450ms
group_duration{group:::Complete Purchase Transaction::Inventory Check}: avg=150ms
group_duration{group:::Complete Purchase Transaction::Reserve Item}: avg=200ms
group_duration{group:::Complete Purchase Transaction::Process Payment}: avg=2500ms
group_duration{group:::Complete Purchase Transaction::Update Inventory}: avg=180ms
group_duration{group:::Complete Purchase Transaction::Send Confirmation}: avg=120ms
```

---

## Organization Patterns

### Pattern 1: By Feature

```javascript
export default function () {
  group('User Management', function () {
    http.get('/api/users');
    http.post('/api/users', newUser);
    http.put('/api/users/123', updatedUser);
  });
  
  group('Product Management', function () {
    http.get('/api/products');
    http.post('/api/products', newProduct);
  });
  
  group('Order Management', function () {
    http.get('/api/orders');
    http.post('/api/orders', newOrder);
  });
}
```

### Pattern 2: By User Role

```javascript
export default function () {
  group('Admin Actions', function () {
    http.get('/api/admin/stats');
    http.post('/api/admin/users/ban', { userId: 123 });
  });
  
  group('User Actions', function () {
    http.get('/api/profile');
    http.put('/api/profile', updatedProfile);
  });
  
  group('Guest Actions', function () {
    http.get('/api/products');
    http.get('/api/products/123');
  });
}
```

### Pattern 3: By API Version

```javascript
export default function () {
  group('API v1', function () {
    http.get('/api/v1/users');
    http.get('/api/v1/products');
  });
  
  group('API v2', function () {
    http.get('/api/v2/users');
    http.get('/api/v2/products');
  });
}
```

### Pattern 4: By Performance Tier

```javascript
export default function () {
  group('Critical Path (< 200ms)', function () {
    http.get('/api/health');
    http.get('/api/status');
  });
  
  group('Standard Path (< 500ms)', function () {
    http.get('/api/users');
    http.get('/api/products');
  });
  
  group('Heavy Path (< 2s)', function () {
    http.get('/api/reports/generate');
    http.get('/api/analytics/dashboard');
  });
}
```

### Pattern 5: By Test Phase

```javascript
export default function () {
  group('Setup Phase', function () {
    // Create test data
    http.post('/api/test-data', testData);
  });
  
  group('Execution Phase', function () {
    // Run actual tests
    http.get('/api/users');
    http.post('/api/orders', order);
  });
  
  group('Cleanup Phase', function () {
    // Delete test data
    http.del('/api/test-data/123');
  });
}
```

---

## Real-World Examples

### Example 1: E-commerce Complete Flow

```javascript
import { group, check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  thresholds: {
    'group_duration{group:::Complete Purchase Flow}': ['avg<10000'],
    'group_duration{group:::Complete Purchase Flow::Browse}': ['avg<2000'],
    'group_duration{group:::Complete Purchase Flow::Checkout}': ['avg<3000'],
    'checks{group:::Complete Purchase Flow::Checkout}': ['rate>0.99']
  }
};

export default function () {
  group('Complete Purchase Flow', function () {
    
    group('Browse', function () {
      group('Homepage', function () {
        const homeRes = http.get('https://shop.example.com/');
        check(homeRes, { 'homepage loaded': (r) => r.status === 200 });
        sleep(2);
      });
      
      group('Category Page', function () {
        const catRes = http.get('https://shop.example.com/category/electronics');
        check(catRes, { 'category loaded': (r) => r.status === 200 });
        sleep(3);
      });
      
      group('Product Details', function () {
        const prodRes = http.get('https://shop.example.com/products/laptop-123');
        check(prodRes, {
          'product loaded': (r) => r.status === 200,
          'has price': (r) => r.json().price !== undefined
        });
        sleep(5);
      });
    });
    
    group('Cart', function () {
      group('Add to Cart', function () {
        const addRes = http.post('https://shop.example.com/api/cart', JSON.stringify({
          productId: 'laptop-123',
          quantity: 1
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        check(addRes, {
          'item added': (r) => r.status === 200,
          'cart updated': (r) => r.json().itemCount === 1
        });
        sleep(1);
      });
      
      group('View Cart', function () {
        const cartRes = http.get('https://shop.example.com/cart');
        check(cartRes, {
          'cart loaded': (r) => r.status === 200,
          'has items': (r) => r.json().items.length > 0
        });
        sleep(2);
      });
    });
    
    group('Checkout', function () {
      group('Shipping Info', function () {
        const shipRes = http.post('https://shop.example.com/api/checkout/shipping', JSON.stringify({
          address: '123 Main St',
          city: 'New York',
          zip: '10001'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        check(shipRes, { 'shipping saved': (r) => r.status === 200 });
        sleep(2);
      });
      
      group('Payment', function () {
        const payRes = http.post('https://shop.example.com/api/checkout/payment', JSON.stringify({
          cardNumber: '4111111111111111',
          expiry: '12/25',
          cvv: '123'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        check(payRes, {
          'payment processed': (r) => r.status === 200,
          'order created': (r) => r.json().orderId !== undefined
        });
        sleep(1);
      });
      
      group('Confirmation', function () {
        const confRes = http.get('https://shop.example.com/order/confirmation');
        check(confRes, {
          'confirmation loaded': (r) => r.status === 200,
          'has order number': (r) => r.json().orderNumber !== undefined
        });
      });
    });
  });
}
```

### Example 2: API Health Check Suite

```javascript
export default function () {
  group('Health Check Suite', function () {
    
    group('Infrastructure', function () {
      group('Load Balancer', function () {
        const lbRes = http.get('https://lb.example.com/health');
        check(lbRes, {
          'LB healthy': (r) => r.status === 200,
          'LB response time < 50ms': (r) => r.timings.duration < 50
        });
      });
      
      group('API Gateway', function () {
        const gwRes = http.get('https://api.example.com/health');
        check(gwRes, {
          'Gateway healthy': (r) => r.status === 200,
          'Gateway response time < 100ms': (r) => r.timings.duration < 100
        });
      });
    });
    
    group('Services', function () {
      group('User Service', function () {
        const userRes = http.get('https://api.example.com/users/health');
        check(userRes, {
          'User service healthy': (r) => r.status === 200,
          'Database connected': (r) => r.json().database === 'connected'
        });
      });
      
      group('Product Service', function () {
        const prodRes = http.get('https://api.example.com/products/health');
        check(prodRes, {
          'Product service healthy': (r) => r.status === 200,
          'Cache connected': (r) => r.json().cache === 'connected'
        });
      });
      
      group('Order Service', function () {
        const orderRes = http.get('https://api.example.com/orders/health');
        check(orderRes, {
          'Order service healthy': (r) => r.status === 200,
          'Queue connected': (r) => r.json().queue === 'connected'
        });
      });
    });
    
    group('External Dependencies', function () {
      group('Payment Gateway', function () {
        const payRes = http.get('https://api.example.com/payment/health');
        check(payRes, {
          'Payment gateway reachable': (r) => r.status === 200
        });
      });
      
      group('Email Service', function () {
        const emailRes = http.get('https://api.example.com/email/health');
        check(emailRes, {
          'Email service reachable': (r) => r.status === 200
        });
      });
    });
  });
}
```

### Example 3: SPA (Single Page Application) Simulation

```javascript
export default function () {
  group('SPA User Session', function () {
    
    group('Initial Load', function () {
      const html = http.get('https://app.example.com/');
      
      const resources = http.batch([
        ['GET', 'https://app.example.com/app.js'],
        ['GET', 'https://app.example.com/vendor.js'],
        ['GET', 'https://app.example.com/styles.css'],
        ['GET', 'https://app.example.com/logo.svg']
      ]);
      
      check(html, { 'app loaded': (r) => r.status === 200 });
      sleep(1);
    });
    
    group('API Interactions', function () {
      group('Fetch User Data', function () {
        const userRes = http.get('https://api.example.com/user/profile');
        check(userRes, { 'profile loaded': (r) => r.status === 200 });
        sleep(0.5);
      });
      
      group('Fetch Dashboard Data', function () {
        const dashRes = http.get('https://api.example.com/dashboard');
        check(dashRes, { 'dashboard loaded': (r) => r.status === 200 });
        sleep(2);
      });
      
      group('Update Settings', function () {
        const settingsRes = http.put('https://api.example.com/settings', JSON.stringify({
          theme: 'dark',
          notifications: true
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
        check(settingsRes, { 'settings updated': (r) => r.status === 200 });
        sleep(1);
      });
    });
    
    group('Real-time Updates', function () {
      // Simulate polling
      for (let i = 0; i < 5; i++) {
        const updateRes = http.get('https://api.example.com/updates');
        check(updateRes, { 'updates fetched': (r) => r.status === 200 });
        sleep(3);
      }
    });
  });
}
```

---

## Best Practices

### 1. Use Descriptive Group Names

```javascript
// ✅ Good: Clear, action-oriented names
group('User Login Flow', () => { ... });
group('Product Search and Filter', () => { ... });
group('Complete Checkout Process', () => { ... });

// ❌ Bad: Vague or technical names
group('Test 1', () => { ... });
group('API Call', () => { ... });
group('Function', () => { ... });
```

### 2. Keep Groups Focused

```javascript
// ✅ Good: Single responsibility
group('User Authentication', function () {
  http.post('/api/login', credentials);
});

group('Fetch User Profile', function () {
  http.get('/api/profile');
});

// ❌ Bad: Too much in one group
group('Everything', function () {
  http.post('/api/login', credentials);
  http.get('/api/profile');
  http.get('/api/products');
  http.post('/api/cart', item);
  http.post('/api/checkout', order);
});
```

### 3. Limit Nesting Depth

```javascript
// ✅ Good: 2-3 levels maximum
group('E-commerce', function () {
  group('Browse', function () {
    group('Search', function () {
      http.get('/search?q=laptop');
    });
  });
});

// ❌ Bad: Too deep
group('L1', () => {
  group('L2', () => {
    group('L3', () => {
      group('L4', () => {
        group('L5', () => {
          // Too complex!
        });
      });
    });
  });
});
```

### 4. Use Groups for Logical Sections

```javascript
// ✅ Good: Logical user journey
group('Homepage Visit', () => { ... });
group('Product Search', () => { ... });
group('Add to Cart', () => { ... });
group('Checkout', () => { ... });

// ❌ Bad: Arbitrary grouping
group('First Requests', () => { ... });
group('Middle Requests', () => { ... });
group('Last Requests', () => { ... });
```

### 5. Set Thresholds for Critical Groups

```javascript
export const options = {
  thresholds: {
    // Critical user paths
    'group_duration{group:::User Login}': ['p(95)<500'],
    'group_duration{group:::Checkout}': ['p(95)<2000'],
    
    // Less critical
    'group_duration{group:::Browse Products}': ['p(95)<1000']
  }
};
```

### 6. Include Think Time

```javascript
// ✅ Good: Realistic user behavior
group('Product Details', function () {
  http.get('/api/products/123');
  sleep(randomBetween(3, 7));  // User reads product info
});

// ❌ Bad: No think time
group('Product Details', function () {
  http.get('/api/products/123');
  // Immediately moves to next action
});
```

### 7. Use Groups with Checks

```javascript
// ✅ Good: Validate within groups
group('User Registration', function () {
  const res = http.post('/api/register', userData);
  
  check(res, {
    'registration successful': (r) => r.status === 201,
    'returns user id': (r) => r.json().id !== undefined
  });
});
```

---

## Troubleshooting

### Problem: Group Metrics Not Showing

**Symptom:** No `group_duration` metrics in output

**Cause:** Group function not executed

```javascript
// ❌ Bad: Group defined but not called
const myGroup = group('Test', function () {
  http.get(url);
});

// ✅ Good: Group executed
group('Test', function () {
  http.get(url);
});
```

---

### Problem: Unexpected Group Duration

**Symptom:** Group duration much longer than expected

**Cause:** Includes sleep time

```javascript
group('API Call', function () {
  http.get(url);  // 200ms
  sleep(5);       // 5000ms
});  // Total: 5200ms (not 200ms!)
```

**Solution:** Understand that group duration includes everything:
- HTTP requests
- Sleep time
- JavaScript execution
- Check execution

---

### Problem: Can't Filter by Nested Group

**Symptom:** Threshold not working for nested group

```javascript
// ❌ Bad: Wrong separator
"group_duration{group:::Parent:Child}": ["avg<500"]

// ✅ Good: Use :: separator
"group_duration{group:::Parent::Child}": ["avg<500"]
```

---

### Problem: Too Many Groups

**Symptom:** Output cluttered with group metrics

**Cause:** Over-grouping

**Solution:** Group only meaningful sections:

```javascript
// ❌ Bad: Too granular
group('Request 1', () => http.get(url1));
group('Request 2', () => http.get(url2));
group('Request 3', () => http.get(url3));

// ✅ Good: Logical grouping
group('Data Fetching', function () {
  http.get(url1);
  http.get(url2);
  http.get(url3);
});
```

---

## Quick Reference

### Basic Group Pattern

```javascript
group('Group Name', function () {
  // Code to execute
  http.get(url);
});
```

### Nested Group Pattern

```javascript
group('Parent', function () {
  group('Child', function () {
    http.get(url);
  });
});
```

### Group with Checks

```javascript
group('Validation', function () {
  const res = http.get(url);
  check(res, { 'ok': (r) => r.status === 200 });
});
```

### Group Threshold

```json
{
  "thresholds": {
    "group_duration{group:::Group Name}": ["avg<500", "p(95)<800"]
  }
}
```

---

## Summary

**Groups are essential for organizing and measuring test sections:**

- ✅ **Use groups** to organize logical test sections
- ✅ **Measure performance** of user journeys and workflows
- ✅ **Create hierarchy** with nested groups (2-3 levels max)
- ✅ **Set thresholds** for critical groups
- ✅ **Combine with checks** for validation
- ✅ **Use descriptive names** for clarity
- ✅ **Keep groups focused** on single responsibility
- ✅ **Include think time** for realistic simulation

**Master groups, and you'll have clear visibility into every part of your application's performance.**
