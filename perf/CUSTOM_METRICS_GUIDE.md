# K6 Custom Metrics: Complete Guide to Business KPIs and Performance Tracking

A comprehensive guide to creating and using custom metrics in k6 for tracking business KPIs, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Are Custom Metrics?](#what-are-custom-metrics)
2. [Custom Metrics Theory: Deep Dive](#custom-metrics-theory-deep-dive)
3. [Metric Types](#metric-types)
4. [Creating Custom Metrics](#creating-custom-metrics)
5. [Recording Metric Values](#recording-metric-values)
6. [Custom Metric Thresholds](#custom-metric-thresholds)
7. [Business KPI Tracking](#business-kpi-tracking)
8. [Advanced Patterns](#advanced-patterns)
9. [Metric Aggregation](#metric-aggregation)
10. [Real-World Examples](#real-world-examples)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## What Are Custom Metrics?

**Custom metrics** are user-defined measurements that track specific aspects of your application beyond k6's built-in HTTP metrics.

### Built-in vs Custom Metrics

**Built-in metrics** (automatic):
```javascript
export default function () {
  http.get('https://api.example.com/data');
  // Automatically tracks:
  // - http_req_duration
  // - http_req_failed
  // - http_reqs
  // - etc.
}
```

**Custom metrics** (you define):
```javascript
import { Counter } from 'k6/metrics';

const checkoutErrors = new Counter('checkout_errors');

export default function () {
  const response = http.post('/api/checkout', orderData);
  
  if (response.status >= 400) {
    checkoutErrors.add(1);  // Track business-specific error
  }
}
```

### Why Custom Metrics?

**Track business-specific concerns:**
- ✅ Transaction success rate
- ✅ Revenue per request
- ✅ Cart abandonment rate
- ✅ Payment processing time
- ✅ Search result quality
- ✅ User engagement metrics
- ✅ Business logic performance

**Example: E-commerce**
```javascript
import { Counter, Trend, Rate } from 'k6/metrics';

// Business KPIs
const successfulPurchases = new Counter('successful_purchases');
const totalRevenue = new Counter('total_revenue');
const checkoutDuration = new Trend('checkout_duration');
const paymentSuccessRate = new Rate('payment_success_rate');

export default function () {
  const startTime = Date.now();
  
  const response = http.post('/api/checkout', {
    items: [{ id: 123, price: 99.99 }],
    payment: { method: 'card' }
  });
  
  const duration = Date.now() - startTime;
  checkoutDuration.add(duration);
  
  if (response.status === 200) {
    const order = response.json();
    successfulPurchases.add(1);
    totalRevenue.add(order.total);
    paymentSuccessRate.add(1);  // Success
  } else {
    paymentSuccessRate.add(0);  // Failure
  }
}
```

**Output:**
```
successful_purchases........: 1234
total_revenue...............: 123456.78
checkout_duration...........: avg=2.3s min=1.2s max=5.6s p(95)=4.2s
payment_success_rate........: 98.5% ✓ 1215  ✗ 19
```

---

## Custom Metrics Theory: Deep Dive

### How Custom Metrics Work

k6's metric system:

```
┌─────────────────────────────────────┐
│         k6 Metrics Engine           │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Built-in Metrics           │  │
│  │   - http_req_duration        │  │
│  │   - http_req_failed          │  │
│  │   - http_reqs                │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Custom Metrics             │  │
│  │   - checkout_duration        │  │
│  │   - payment_success_rate     │  │
│  │   - total_revenue            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Aggregation & Analysis     │  │
│  │   - Calculate statistics     │  │
│  │   - Apply thresholds         │  │
│  │   - Generate summary         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Metric Lifecycle

```javascript
// 1. CREATION (Init phase)
import { Counter } from 'k6/metrics';
const myMetric = new Counter('my_metric');

// 2. RECORDING (VU phase)
export default function () {
  myMetric.add(1);      // Record value
  myMetric.add(5);      // Record another value
}

// 3. AGGREGATION (After test)
// k6 automatically:
// - Sums all values (for Counter)
// - Calculates statistics (for Trend)
// - Computes rate (for Rate)
// - Stores latest value (for Gauge)

// 4. OUTPUT
// my_metric...........: 6 (1 + 5)
```

### Metric Scope

**Global scope** (shared across all VUs):
```javascript
import { Counter } from 'k6/metrics';

// Created once, shared by all VUs
const globalCounter = new Counter('global_counter');

export default function () {
  globalCounter.add(1);
  // All VUs increment the same counter
}
```

**Result with 10 VUs, 5 iterations each:**
```
global_counter.........: 50 (10 VUs × 5 iterations)
```

### Thread Safety

Custom metrics are **thread-safe**:
```javascript
const counter = new Counter('counter');

export default function () {
  // Multiple VUs can safely call this simultaneously
  counter.add(1);
  // k6 handles synchronization
}
```

---

## Metric Types

k6 provides **4 metric types**, each for different use cases:

### 1. Counter (Cumulative Sum)

**Purpose:** Track cumulative totals

```javascript
import { Counter } from 'k6/metrics';

const myCounter = new Counter('my_counter');

export default function () {
  myCounter.add(1);    // Add 1
  myCounter.add(5);    // Add 5
  myCounter.add(10);   // Add 10
}
// Result: 16 (1 + 5 + 10)
```

**Use cases:**
- Total requests
- Error count
- Successful transactions
- Total revenue
- Items processed

**Characteristics:**
- ✅ Only increases (cumulative)
- ✅ Simple aggregation (sum)
- ✅ Can add any positive number
- ❌ Cannot decrease
- ❌ No statistical analysis

---

### 2. Trend (Statistical Analysis)

**Purpose:** Track values for statistical analysis

```javascript
import { Trend } from 'k6/metrics';

const myTrend = new Trend('my_trend');

export default function () {
  myTrend.add(100);
  myTrend.add(200);
  myTrend.add(150);
}
```

**Output:**
```
my_trend...........: avg=150 min=100 med=150 max=200 p(90)=190 p(95)=195
```

**Use cases:**
- Response times
- Processing duration
- Data size
- Queue length
- Custom latency measurements

**Characteristics:**
- ✅ Statistical analysis (avg, min, max, percentiles)
- ✅ Can add any number (positive or negative)
- ✅ Most versatile metric type
- ❌ Higher memory usage

---

### 3. Rate (Percentage)

**Purpose:** Track success/failure rates

```javascript
import { Rate } from 'k6/metrics';

const myRate = new Rate('my_rate');

export default function () {
  myRate.add(true);   // Success
  myRate.add(true);   // Success
  myRate.add(false);  // Failure
  myRate.add(true);   // Success
}
```

**Output:**
```
my_rate............: 75.00% ✓ 3  ✗ 1
```

**Use cases:**
- Success rate
- Error rate
- Conversion rate
- Availability
- Pass/fail metrics

**Characteristics:**
- ✅ Automatic percentage calculation
- ✅ Shows pass/fail counts
- ✅ Easy to understand
- ❌ Only for boolean values

---

### 4. Gauge (Latest Value)

**Purpose:** Track current/latest value

```javascript
import { Gauge } from 'k6/metrics';

const myGauge = new Gauge('my_gauge');

export default function () {
  myGauge.add(10);   // Current value: 10
  myGauge.add(20);   // Current value: 20
  myGauge.add(15);   // Current value: 15
}
```

**Output:**
```
my_gauge...........: 15 (latest value)
```

**Use cases:**
- Current VU count
- Active connections
- Queue size
- Memory usage
- Latest timestamp

**Characteristics:**
- ✅ Shows latest value
- ✅ Low memory usage
- ✅ Good for snapshots
- ❌ No historical data
- ❌ No statistics

---

## Creating Custom Metrics

### Basic Creation

```javascript
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Counter
const totalRequests = new Counter('total_requests');

// Trend
const processingTime = new Trend('processing_time');

// Rate
const successRate = new Rate('success_rate');

// Gauge
const activeUsers = new Gauge('active_users');
```

### Naming Conventions

```javascript
// ✅ Good: Descriptive, snake_case
const checkout_duration = new Trend('checkout_duration');
const payment_success_rate = new Rate('payment_success_rate');
const total_revenue = new Counter('total_revenue');

// ❌ Bad: Vague, inconsistent
const metric1 = new Trend('m1');
const MyMetric = new Counter('MyMetric');
const data = new Rate('data');
```

### Metric with Tags

```javascript
import { Counter } from 'k6/metrics';

const apiCalls = new Counter('api_calls');

export default function () {
  // Add value with tags
  apiCalls.add(1, { endpoint: 'users', method: 'GET' });
  apiCalls.add(1, { endpoint: 'products', method: 'POST' });
}
```

**Output:**
```
api_calls{endpoint:users,method:GET}........: 150
api_calls{endpoint:products,method:POST}....: 75
```

---

## Recording Metric Values

### Counter

```javascript
const counter = new Counter('my_counter');

// Add single value
counter.add(1);

// Add multiple
counter.add(5);

// Add variable
const itemCount = 10;
counter.add(itemCount);

// Add from response
const response = http.get('/api/data');
counter.add(response.json().count);
```

### Trend

```javascript
const trend = new Trend('my_trend');

// Add duration
const start = Date.now();
http.get('/api/data');
const duration = Date.now() - start;
trend.add(duration);

// Add from response
const response = http.get('/api/data');
trend.add(response.timings.duration);

// Add calculated value
const value = calculateSomething();
trend.add(value);
```

### Rate

```javascript
const rate = new Rate('my_rate');

// Add boolean
rate.add(true);   // Success
rate.add(false);  // Failure

// Add from condition
const response = http.get('/api/data');
rate.add(response.status === 200);

// Add from check
const success = check(response, {
  'status is 200': (r) => r.status === 200
});
rate.add(success);
```

### Gauge

```javascript
const gauge = new Gauge('my_gauge');

// Set current value
gauge.add(__VU);  // Current VU number

// Update with latest
const response = http.get('/api/queue');
gauge.add(response.json().queueSize);

// Track latest timestamp
gauge.add(Date.now());
```

---

## Custom Metric Thresholds

### Basic Thresholds

```javascript
import { Counter, Trend, Rate } from 'k6/metrics';

const errors = new Counter('errors');
const processingTime = new Trend('processing_time');
const successRate = new Rate('success_rate');

export const options = {
  thresholds: {
    'errors': ['count<10'],                    // Less than 10 errors
    'processing_time': ['avg<500', 'p(95)<1000'], // Avg < 500ms, p95 < 1s
    'success_rate': ['rate>0.95']              // 95% success rate
  }
};

export default function () {
  const response = http.get('/api/data');
  
  if (response.status >= 400) {
    errors.add(1);
  }
  
  processingTime.add(response.timings.duration);
  successRate.add(response.status === 200);
}
```

### Tagged Thresholds

```javascript
const apiCalls = new Counter('api_calls');

export const options = {
  thresholds: {
    'api_calls{endpoint:checkout}': ['count>100'],
    'api_calls{endpoint:search}': ['count>500']
  }
};

export default function () {
  http.get('/api/checkout', {
    tags: { endpoint: 'checkout' }
  });
  apiCalls.add(1, { endpoint: 'checkout' });
}
```

### Threshold Operators

```javascript
export const options = {
  thresholds: {
    // Counter
    'my_counter': [
      'count>100',      // More than 100
      'count<1000'      // Less than 1000
    ],
    
    // Trend
    'my_trend': [
      'avg<200',        // Average < 200
      'min>10',         // Minimum > 10
      'max<1000',       // Maximum < 1000
      'med<150',        // Median < 150
      'p(90)<300',      // 90th percentile < 300
      'p(95)<400',      // 95th percentile < 400
      'p(99)<800'       // 99th percentile < 800
    ],
    
    // Rate
    'my_rate': [
      'rate>0.95',      // Rate > 95%
      'rate==1'         // Rate = 100%
    ]
  }
};
```

---

## Business KPI Tracking

### E-commerce KPIs

```javascript
import { Counter, Trend, Rate } from 'k6/metrics';

// Revenue metrics
const totalRevenue = new Counter('total_revenue');
const averageOrderValue = new Trend('average_order_value');

// Conversion metrics
const addToCartRate = new Rate('add_to_cart_rate');
const checkoutRate = new Rate('checkout_rate');
const purchaseRate = new Rate('purchase_rate');

// Performance metrics
const checkoutDuration = new Trend('checkout_duration');
const paymentProcessingTime = new Trend('payment_processing_time');

// Error metrics
const paymentErrors = new Counter('payment_errors');
const inventoryErrors = new Counter('inventory_errors');

export const options = {
  thresholds: {
    'total_revenue': ['count>10000'],           // Min $10k revenue
    'average_order_value': ['avg>50'],          // Avg order > $50
    'purchase_rate': ['rate>0.02'],             // 2% conversion
    'checkout_duration': ['p(95)<5000'],        // Checkout < 5s
    'payment_errors': ['count<10']              // < 10 payment errors
  }
};

export default function () {
  // Browse products
  http.get('/api/products');
  
  // View product
  const productRes = http.get('/api/products/123');
  
  // Add to cart (30% of users)
  if (Math.random() < 0.3) {
    http.post('/api/cart', { productId: 123, quantity: 1 });
    addToCartRate.add(1);
    
    // Proceed to checkout (70% of those who added to cart)
    if (Math.random() < 0.7) {
      checkoutRate.add(1);
      
      const checkoutStart = Date.now();
      const checkoutRes = http.post('/api/checkout', orderData);
      const checkoutTime = Date.now() - checkoutStart;
      
      checkoutDuration.add(checkoutTime);
      
      if (checkoutRes.status === 200) {
        const order = checkoutRes.json();
        
        // Payment processing
        const paymentStart = Date.now();
        const paymentRes = http.post('/api/payment', paymentData);
        const paymentTime = Date.now() - paymentStart;
        
        paymentProcessingTime.add(paymentTime);
        
        if (paymentRes.status === 200) {
          purchaseRate.add(1);
          totalRevenue.add(order.total);
          averageOrderValue.add(order.total);
        } else {
          purchaseRate.add(0);
          paymentErrors.add(1);
        }
      } else {
        checkoutRate.add(0);
      }
    } else {
      checkoutRate.add(0);
    }
  } else {
    addToCartRate.add(0);
  }
}
```

### SaaS Application KPIs

```javascript
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// User engagement
const activeUsers = new Gauge('active_users');
const sessionDuration = new Trend('session_duration');
const featuresUsed = new Counter('features_used');

// Performance
const apiResponseTime = new Trend('api_response_time');
const reportGenerationTime = new Trend('report_generation_time');

// Reliability
const apiAvailability = new Rate('api_availability');
const dataExportSuccess = new Rate('data_export_success');

// Business metrics
const reportsGenerated = new Counter('reports_generated');
const dataExported = new Counter('data_exported');

export const options = {
  thresholds: {
    'session_duration': ['avg>300000'],         // Avg session > 5 min
    'api_response_time': ['p(95)<500'],         // API p95 < 500ms
    'api_availability': ['rate>0.999'],         // 99.9% uptime
    'report_generation_time': ['p(95)<10000']   // Reports < 10s
  }
};

export default function () {
  const sessionStart = Date.now();
  activeUsers.add(__VU);
  
  // Login
  const loginRes = http.post('/api/login', credentials);
  apiAvailability.add(loginRes.status === 200);
  
  if (loginRes.status === 200) {
    const token = loginRes.json('token');
    
    // Dashboard
    const dashStart = Date.now();
    const dashRes = http.get('/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    apiResponseTime.add(Date.now() - dashStart);
    featuresUsed.add(1, { feature: 'dashboard' });
    
    // Generate report
    const reportStart = Date.now();
    const reportRes = http.post('/api/reports/generate', reportParams, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reportTime = Date.now() - reportStart;
    
    reportGenerationTime.add(reportTime);
    
    if (reportRes.status === 200) {
      reportsGenerated.add(1);
      featuresUsed.add(1, { feature: 'reports' });
      
      // Export data
      const exportRes = http.get('/api/reports/123/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (exportRes.status === 200) {
        dataExportSuccess.add(1);
        dataExported.add(1);
      } else {
        dataExportSuccess.add(0);
      }
    }
  }
  
  const sessionTime = Date.now() - sessionStart;
  sessionDuration.add(sessionTime);
}
```

### Content Platform KPIs

```javascript
import { Counter, Trend, Rate } from 'k6/metrics';

// Engagement metrics
const articlesViewed = new Counter('articles_viewed');
const timeOnPage = new Trend('time_on_page');
const scrollDepth = new Trend('scroll_depth');

// Interaction metrics
const commentsPosted = new Counter('comments_posted');
const sharesClicked = new Counter('shares_clicked');
const engagementRate = new Rate('engagement_rate');

// Content quality
const readCompletionRate = new Rate('read_completion_rate');
const bounceRate = new Rate('bounce_rate');

export const options = {
  thresholds: {
    'time_on_page': ['avg>60000'],              // Avg > 1 minute
    'read_completion_rate': ['rate>0.5'],       // 50% read to end
    'engagement_rate': ['rate>0.1'],            // 10% engage
    'bounce_rate': ['rate<0.4']                 // < 40% bounce
  }
};

export default function () {
  // View article
  const articleStart = Date.now();
  const articleRes = http.get('/api/articles/123');
  articlesViewed.add(1);
  
  // Simulate reading
  const readTime = randomBetween(30, 180) * 1000;  // 30s-3min
  sleep(readTime / 1000);
  
  const timeSpent = Date.now() - articleStart;
  timeOnPage.add(timeSpent);
  
  // Scroll depth (0-100%)
  const depth = Math.random() * 100;
  scrollDepth.add(depth);
  
  // Read completion (scrolled > 80%)
  readCompletionRate.add(depth > 80);
  
  // Engagement (comment, share, or read > 2min)
  const engaged = Math.random() < 0.15 || timeSpent > 120000;
  engagementRate.add(engaged);
  
  if (engaged) {
    if (Math.random() < 0.5) {
      // Post comment
      http.post('/api/articles/123/comments', { text: 'Great article!' });
      commentsPosted.add(1);
    } else {
      // Share
      http.post('/api/articles/123/share', { platform: 'twitter' });
      sharesClicked.add(1);
    }
  }
  
  // Bounce (left quickly without engagement)
  bounceRate.add(timeSpent < 10000 && !engaged);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
```

---

## Advanced Patterns

### Conditional Metrics

```javascript
import { Counter, Trend } from 'k6/metrics';

const fastRequests = new Counter('fast_requests');
const slowRequests = new Counter('slow_requests');
const requestDuration = new Trend('request_duration');

export default function () {
  const start = Date.now();
  const response = http.get('/api/data');
  const duration = Date.now() - start;
  
  requestDuration.add(duration);
  
  if (duration < 500) {
    fastRequests.add(1);
  } else {
    slowRequests.add(1);
  }
}
```

### Calculated Metrics

```javascript
import { Trend } from 'k6/metrics';

const throughput = new Trend('throughput_mbps');

export default function () {
  const response = http.get('/api/large-file');
  
  const sizeBytes = response.body.length;
  const durationSeconds = response.timings.duration / 1000;
  const mbps = (sizeBytes * 8) / (durationSeconds * 1000000);
  
  throughput.add(mbps);
}
```

### Aggregated Metrics

```javascript
import { Trend } from 'k6/metrics';

const totalLatency = new Trend('total_latency');

export default function () {
  const start = Date.now();
  
  // Multiple API calls
  http.get('/api/users');
  http.get('/api/products');
  http.get('/api/orders');
  
  const totalTime = Date.now() - start;
  totalLatency.add(totalTime);
}
```

### Percentage Metrics

```javascript
import { Counter, Trend } from 'k6/metrics';

const totalRequests = new Counter('total_requests');
const cachedRequests = new Counter('cached_requests');
const cacheHitRatio = new Trend('cache_hit_ratio');

export default function () {
  const response = http.get('/api/data');
  totalRequests.add(1);
  
  if (response.headers['X-Cache'] === 'HIT') {
    cachedRequests.add(1);
  }
  
  // Calculate ratio (do this periodically, not every request)
  if (__ITER % 100 === 0) {
    // This is simplified - in reality you'd need to track counts
    const ratio = 0.75;  // Example: 75% cache hit rate
    cacheHitRatio.add(ratio * 100);
  }
}
```

---

## Metric Aggregation

### Summary Statistics

```javascript
import { Trend } from 'k6/metrics';

const responseTimes = new Trend('response_times', true);  // Enable all stats

export default function () {
  const response = http.get('/api/data');
  responseTimes.add(response.timings.duration);
}
```

**Output:**
```
response_times.........: avg=234ms min=100ms med=220ms max=890ms
                         p(90)=350ms p(95)=450ms p(99)=750ms
```

### Custom Percentiles

```javascript
export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)']
};
```

### Time-Series Data

```javascript
import { Trend } from 'k6/metrics';

const requestsPerSecond = new Trend('requests_per_second');

let requestCount = 0;
let lastTimestamp = Date.now();

export default function () {
  http.get('/api/data');
  requestCount++;
  
  const now = Date.now();
  if (now - lastTimestamp >= 1000) {  // Every second
    requestsPerSecond.add(requestCount);
    requestCount = 0;
    lastTimestamp = now;
  }
}
```

---

## Real-World Examples

### Example 1: Payment Processing System

```javascript
import { Counter, Trend, Rate } from 'k6/metrics';
import http from 'k6/http';

// Transaction metrics
const totalTransactions = new Counter('total_transactions');
const successfulTransactions = new Counter('successful_transactions');
const failedTransactions = new Counter('failed_transactions');

// Revenue metrics
const totalRevenue = new Counter('total_revenue_cents');
const averageTransactionValue = new Trend('average_transaction_value');

// Performance metrics
const authorizationTime = new Trend('authorization_time_ms');
const captureTime = new Trend('capture_time_ms');
const totalProcessingTime = new Trend('total_processing_time_ms');

// Success rates
const authorizationSuccessRate = new Rate('authorization_success_rate');
const captureSuccessRate = new Rate('capture_success_rate');
const overallSuccessRate = new Rate('overall_success_rate');

// Error tracking
const networkErrors = new Counter('network_errors');
const validationErrors = new Counter('validation_errors');
const insufficientFundsErrors = new Counter('insufficient_funds_errors');
const fraudDetectionBlocks = new Counter('fraud_detection_blocks');

export const options = {
  thresholds: {
    'overall_success_rate': ['rate>0.98'],              // 98% success
    'total_processing_time_ms': ['p(95)<3000'],         // p95 < 3s
    'authorization_time_ms': ['p(95)<1000'],            // p95 < 1s
    'total_revenue_cents': ['count>1000000']            // Min $10k revenue
  }
};

export default function () {
  const transactionStart = Date.now();
  totalTransactions.add(1);
  
  const amount = Math.floor(Math.random() * 50000) + 1000;  // $10-$500
  
  // Step 1: Authorization
  const authStart = Date.now();
  const authRes = http.post('/api/payment/authorize', JSON.stringify({
    amount: amount,
    currency: 'USD',
    cardNumber: '4111111111111111',
    cvv: '123',
    expiry: '12/25'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  const authTime = Date.now() - authStart;
  authorizationTime.add(authTime);
  
  if (authRes.status === 200) {
    authorizationSuccessRate.add(1);
    const authData = authRes.json();
    
    // Step 2: Capture
    const captureStart = Date.now();
    const captureRes = http.post('/api/payment/capture', JSON.stringify({
      authorizationId: authData.authorizationId,
      amount: amount
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const capTime = Date.now() - captureStart;
    captureTime.add(capTime);
    
    if (captureRes.status === 200) {
      captureSuccessRate.add(1);
      overallSuccessRate.add(1);
      successfulTransactions.add(1);
      totalRevenue.add(amount);
      averageTransactionValue.add(amount / 100);  // Convert to dollars
    } else {
      captureSuccessRate.add(0);
      overallSuccessRate.add(0);
      failedTransactions.add(1);
      
      if (captureRes.status === 400) {
        validationErrors.add(1);
      }
    }
  } else {
    authorizationSuccessRate.add(0);
    overallSuccessRate.add(0);
    failedTransactions.add(1);
    
    if (authRes.status === 0) {
      networkErrors.add(1);
    } else if (authRes.status === 402) {
      insufficientFundsErrors.add(1);
    } else if (authRes.status === 403) {
      fraudDetectionBlocks.add(1);
    } else if (authRes.status === 400) {
      validationErrors.add(1);
    }
  }
  
  const totalTime = Date.now() - transactionStart;
  totalProcessingTime.add(totalTime);
}
```

### Example 2: Search Quality Metrics

```javascript
import { Counter, Trend, Rate } from 'k6/metrics';

// Search metrics
const totalSearches = new Counter('total_searches');
const searchDuration = new Trend('search_duration_ms');

// Result quality
const averageResultCount = new Trend('average_result_count');
const zeroResultRate = new Rate('zero_result_rate');
const relevanceScore = new Trend('relevance_score');

// User engagement
const clickThroughRate = new Rate('click_through_rate');
const averageClickPosition = new Trend('average_click_position');
const refinementRate = new Rate('refinement_rate');

export const options = {
  thresholds: {
    'search_duration_ms': ['p(95)<500'],
    'zero_result_rate': ['rate<0.05'],              // < 5% zero results
    'click_through_rate': ['rate>0.7'],             // > 70% CTR
    'relevance_score': ['avg>0.8']                  // Avg relevance > 0.8
  }
};

const searchQueries = ['laptop', 'phone', 'headphones', 'keyboard', 'mouse'];

export default function () {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  totalSearches.add(1);
  
  const searchStart = Date.now();
  const searchRes = http.get(`/api/search?q=${query}`);
  const searchTime = Date.now() - searchStart;
  
  searchDuration.add(searchTime);
  
  if (searchRes.status === 200) {
    const results = searchRes.json();
    const resultCount = results.items.length;
    
    averageResultCount.add(resultCount);
    zeroResultRate.add(resultCount === 0);
    
    if (resultCount > 0) {
      // Simulate relevance score (in reality, from user feedback)
      const relevance = 0.7 + Math.random() * 0.3;  // 0.7-1.0
      relevanceScore.add(relevance);
      
      // User clicks on result (70% of the time)
      if (Math.random() < 0.7) {
        clickThroughRate.add(1);
        
        // Click position (1-10)
        const clickPos = Math.min(Math.floor(Math.random() * 10) + 1, resultCount);
        averageClickPosition.add(clickPos);
      } else {
        clickThroughRate.add(0);
        
        // User refines search (30% of non-clickers)
        if (Math.random() < 0.3) {
          refinementRate.add(1);
          http.get(`/api/search?q=${query}+wireless`);
        } else {
          refinementRate.add(0);
        }
      }
    }
  }
}
```

### Example 3: API Rate Limiting Compliance

```javascript
import { Counter, Gauge, Rate } from 'k6/metrics';

// Rate limit tracking
const requestsThisSecond = new Gauge('requests_this_second');
const rateLimitHits = new Counter('rate_limit_hits');
const rateLimitCompliance = new Rate('rate_limit_compliance');

// API metrics
const successfulRequests = new Counter('successful_requests');
const throttledRequests = new Counter('throttled_requests');

export const options = {
  thresholds: {
    'rate_limit_compliance': ['rate>0.99'],         // 99% compliant
    'rate_limit_hits': ['count<10']                 // < 10 rate limit hits
  }
};

const RATE_LIMIT = 100;  // 100 requests per second
let requestCount = 0;
let windowStart = Date.now();

export default function () {
  const now = Date.now();
  
  // Reset counter every second
  if (now - windowStart >= 1000) {
    requestsThisSecond.add(requestCount);
    requestCount = 0;
    windowStart = now;
  }
  
  // Check if we're within rate limit
  if (requestCount < RATE_LIMIT) {
    rateLimitCompliance.add(1);
    
    const response = http.get('/api/data');
    requestCount++;
    
    if (response.status === 200) {
      successfulRequests.add(1);
    } else if (response.status === 429) {
      // Should not happen if we're compliant
      throttledRequests.add(1);
      rateLimitHits.add(1);
    }
  } else {
    rateLimitCompliance.add(0);
    // Wait for next window
    const remaining = 1000 - (now - windowStart);
    if (remaining > 0) {
      sleep(remaining / 1000);
    }
  }
}
```

---

## Best Practices

### 1. Choose the Right Metric Type

```javascript
// ✅ Good: Appropriate metric types
const totalOrders = new Counter('total_orders');              // Cumulative
const orderValue = new Trend('order_value');                  // Statistics
const paymentSuccess = new Rate('payment_success');           // Percentage
const activeUsers = new Gauge('active_users');                // Current value

// ❌ Bad: Wrong metric types
const orderValue = new Counter('order_value');                // Can't get avg!
const totalOrders = new Trend('total_orders');                // Wasteful
```

### 2. Use Descriptive Names

```javascript
// ✅ Good: Clear, descriptive
const checkout_duration_ms = new Trend('checkout_duration_ms');
const payment_success_rate = new Rate('payment_success_rate');

// ❌ Bad: Vague
const metric1 = new Trend('metric1');
const data = new Rate('data');
```

### 3. Include Units in Names

```javascript
// ✅ Good: Units clear
const response_time_ms = new Trend('response_time_ms');
const file_size_bytes = new Trend('file_size_bytes');
const revenue_cents = new Counter('revenue_cents');

// ❌ Bad: Units unclear
const response_time = new Trend('response_time');  // ms? s?
const revenue = new Counter('revenue');            // dollars? cents?
```

### 4. Set Meaningful Thresholds

```javascript
// ✅ Good: Business-relevant thresholds
export const options = {
  thresholds: {
    'checkout_duration_ms': ['p(95)<5000'],         // Based on UX research
    'payment_success_rate': ['rate>0.98'],          // Business requirement
    'total_revenue_cents': ['count>1000000']        // Revenue goal
  }
};
```

### 5. Don't Over-Measure

```javascript
// ❌ Bad: Too many metrics
const metric1 = new Trend('metric1');
const metric2 = new Trend('metric2');
// ... 50 more metrics
// Hard to analyze, high memory usage

// ✅ Good: Focus on key metrics
const checkoutDuration = new Trend('checkout_duration');
const paymentSuccess = new Rate('payment_success');
const totalRevenue = new Counter('total_revenue');
```

### 6. Use Tags for Dimensions

```javascript
// ✅ Good: One metric with tags
const apiCalls = new Counter('api_calls');
apiCalls.add(1, { endpoint: 'users', method: 'GET' });
apiCalls.add(1, { endpoint: 'products', method: 'POST' });

// ❌ Bad: Separate metric per dimension
const usersGetCalls = new Counter('users_get_calls');
const productsPostCalls = new Counter('products_post_calls');
```

### 7. Document Metric Purpose

```javascript
/**
 * Tracks the total revenue in cents from successful transactions.
 * Used to measure business impact of performance changes.
 * Threshold: Must exceed $10,000 (1,000,000 cents) per test run.
 */
const totalRevenue = new Counter('total_revenue_cents');
```

---

## Troubleshooting

### Problem: Metric Not Showing in Output

**Symptom:** Custom metric doesn't appear in results

**Cause:** Never recorded a value

**Solution:**
```javascript
const myMetric = new Counter('my_metric');

export default function () {
  // ❌ Metric created but never used
}

// ✅ Record at least one value
export default function () {
  myMetric.add(1);
}
```

---

### Problem: Trend Shows No Statistics

**Symptom:** Trend metric shows only count, no avg/min/max

**Cause:** Not enough data points

**Solution:** Record more values (need at least 2)

---

### Problem: Rate Shows NaN%

**Symptom:** Rate metric displays `NaN%`

**Cause:** No values recorded

**Solution:** Ensure rate.add() is called

---

### Problem: Threshold Not Working

**Symptom:** Threshold not evaluated

**Cause:** Metric name mismatch

```javascript
const myMetric = new Counter('my_metric');

export const options = {
  thresholds: {
    'myMetric': ['count>100']  // ❌ Wrong name (camelCase vs snake_case)
  }
};

// ✅ Fix: Match exact name
export const options = {
  thresholds: {
    'my_metric': ['count>100']
  }
};
```

---

## Quick Reference

### Metric Types

| Type | Purpose | Example Use Case |
|------|---------|------------------|
| **Counter** | Cumulative sum | Total requests, revenue |
| **Trend** | Statistics | Response time, order value |
| **Rate** | Percentage | Success rate, conversion |
| **Gauge** | Latest value | Active users, queue size |

### Common Patterns

```javascript
// Counter: Total count
const total = new Counter('total');
total.add(1);

// Trend: Duration
const duration = new Trend('duration_ms');
const start = Date.now();
// ... do work ...
duration.add(Date.now() - start);

// Rate: Success/failure
const success = new Rate('success_rate');
success.add(response.status === 200);

// Gauge: Current value
const active = new Gauge('active_users');
active.add(__VU);
```

---

## Summary

**Custom metrics enable business-focused performance testing:**

- ✅ **Track business KPIs** beyond HTTP metrics
- ✅ **Choose appropriate type** (Counter, Trend, Rate, Gauge)
- ✅ **Use descriptive names** with units
- ✅ **Set meaningful thresholds** based on business requirements
- ✅ **Tag for dimensions** instead of creating many metrics
- ✅ **Document purpose** for team understanding
- ✅ **Focus on key metrics** to avoid analysis paralysis
- ❌ **Don't over-measure** - quality over quantity

**Master custom metrics, and you'll align performance testing with business objectives.**
