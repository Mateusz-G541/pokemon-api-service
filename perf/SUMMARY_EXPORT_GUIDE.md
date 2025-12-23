# K6 Summary Export: Complete Guide to Custom Reporting

A comprehensive guide to k6's summary export and custom reporting capabilities, with detailed theory and extensive practical examples.

## Table of Contents

1. [What Is Summary Export?](#what-is-summary-export)
2. [Summary Export Theory: Deep Dive](#summary-export-theory-deep-dive)
3. [handleSummary Function](#handlesummary-function)
4. [Summary Data Structure](#summary-data-structure)
5. [Export Formats](#export-formats)
6. [Custom Report Generation](#custom-report-generation)
7. [Multiple Output Destinations](#multiple-output-destinations)
8. [Real-World Examples](#real-world-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## What Is Summary Export?

**Summary export** is k6's mechanism for customizing test result output, allowing you to generate reports in any format and save them to multiple destinations.

### Default Summary

**Without customization:**
```javascript
export default function () {
  http.get('https://api.example.com/data');
}
```

**Output (console):**
```
     ✓ http_req_duration..............: avg=234ms min=100ms med=220ms max=890ms p(90)=350ms p(95)=450ms
     ✓ http_req_failed................: 0.00%  ✓ 0    ✗ 1000
     ✓ http_reqs......................: 1000   33.33/s
     ✓ iteration_duration.............: avg=1.2s min=1.1s med=1.2s max=1.5s
     ✓ iterations.....................: 1000   33.33/s
     ✓ vus............................: 10     min=10 max=10
```

### Custom Summary

**With customization:**
```javascript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data),
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data)
  };
}

export default function () {
  http.get('https://api.example.com/data');
}
```

**Output:**
- `summary.html` - Beautiful HTML report
- `summary.json` - Machine-readable JSON
- Console - Text summary

### Why Custom Summaries?

**Use cases:**
- ✅ Generate HTML reports for stakeholders
- ✅ Export JSON for CI/CD pipelines
- ✅ Send results to monitoring systems
- ✅ Create custom dashboards
- ✅ Archive test results
- ✅ Compare test runs
- ✅ Generate executive summaries

---

## Summary Export Theory: Deep Dive

### Test Execution Flow

```
┌─────────────────────────────────────────────────────┐
│              Test Execution                         │
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
│  │  VU Phase                                    │  │
│  │  - Collect metrics                           │  │
│  │  - Track thresholds                          │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Teardown Phase                              │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Summary Generation                          │  │
│  │  - Aggregate metrics                         │  │
│  │  - Evaluate thresholds                       │  │
│  │  - Create summary object                     │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  handleSummary() Called                      │  │
│  │  - Receives summary data                     │  │
│  │  - Generates custom reports                  │  │
│  │  - Returns output destinations               │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Write Outputs                               │  │
│  │  - Save files                                │  │
│  │  - Print to console                          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### handleSummary Execution

**When it runs:**
- After teardown completes
- Before k6 exits
- Once per test run (not per VU)

**What it receives:**
- Complete test metrics
- Threshold results
- Test configuration
- Timing information

**What it returns:**
- Object mapping destinations to content
- Keys: file paths or 'stdout'/'stderr'
- Values: string content to write

### Summary Data Flow

```
Test Metrics → Aggregation → Summary Object → handleSummary → Outputs
                                                    ↓
                                            ┌───────┴────────┐
                                            ↓                ↓
                                        Files            Console
```

---

## handleSummary Function

### Basic Syntax

```javascript
export function handleSummary(data) {
  // data: complete summary object
  
  return {
    'output.json': JSON.stringify(data),
    'stdout': 'Custom summary text'
  };
}
```

### Function Signature

```javascript
/**
 * @param {Object} data - Summary data object
 * @returns {Object} - Map of destinations to content
 */
export function handleSummary(data) {
  // Process data
  // Generate reports
  // Return outputs
}
```

### Return Value Format

```javascript
export function handleSummary(data) {
  return {
    // File outputs (relative or absolute paths)
    'results/summary.json': JSON.stringify(data),
    'results/report.html': generateHTML(data),
    '/tmp/k6-results.txt': generateText(data),
    
    // Console outputs
    'stdout': 'Test completed successfully',
    'stderr': 'Warning: High error rate'
  };
}
```

### Suppressing Default Output

```javascript
// Default: k6 prints summary to stdout
export default function () {
  http.get('https://api.example.com/data');
}

// Custom: Override stdout to suppress default
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    'stdout': ''  // Empty string = no console output
  };
}
```

### Preserving Default Output

```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data, { indent: ' ', enableColors: true })  // Keep default
  };
}
```

---

## Summary Data Structure

### Top-Level Structure

```javascript
export function handleSummary(data) {
  console.log(Object.keys(data));
  // ['root_group', 'metrics', 'state']
}
```

### Complete Data Object

```javascript
{
  root_group: {
    name: '',
    path: '',
    id: '...',
    groups: [...],
    checks: [...]
  },
  metrics: {
    http_req_duration: { ... },
    http_req_failed: { ... },
    http_reqs: { ... },
    // ... all metrics
  },
  state: {
    isStdOutTTY: true,
    isStdErrTTY: true,
    testRunDurationMs: 30123.45
  }
}
```

### Metrics Structure

```javascript
data.metrics = {
  http_req_duration: {
    type: 'trend',
    contains: 'time',
    values: {
      avg: 234.5,
      min: 100.2,
      med: 220.3,
      max: 890.1,
      'p(90)': 350.4,
      'p(95)': 450.6,
      'p(99)': 750.8
    },
    thresholds: {
      'p(95)<500': {
        ok: true
      }
    }
  },
  http_req_failed: {
    type: 'rate',
    contains: 'default',
    values: {
      rate: 0.02,
      passes: 980,
      fails: 20
    },
    thresholds: {
      'rate<0.05': {
        ok: true
      }
    }
  },
  http_reqs: {
    type: 'counter',
    contains: 'default',
    values: {
      count: 1000,
      rate: 33.33
    }
  }
}
```

### Accessing Metric Values

```javascript
export function handleSummary(data) {
  // Get specific metric
  const reqDuration = data.metrics.http_req_duration;
  
  // Get average
  const avgDuration = reqDuration.values.avg;
  
  // Get p95
  const p95 = reqDuration.values['p(95)'];
  
  // Check threshold
  const thresholdPassed = reqDuration.thresholds['p(95)<500'].ok;
  
  console.log(`Avg: ${avgDuration}ms, P95: ${p95}ms, Passed: ${thresholdPassed}`);
}
```

### Custom Metrics

```javascript
import { Counter, Trend } from 'k6/metrics';

const myCounter = new Counter('my_counter');
const myTrend = new Trend('my_trend');

export default function () {
  myCounter.add(1);
  myTrend.add(123);
}

export function handleSummary(data) {
  // Access custom metrics
  const counterValue = data.metrics.my_counter.values.count;
  const trendAvg = data.metrics.my_trend.values.avg;
  
  console.log(`Counter: ${counterValue}, Trend avg: ${trendAvg}`);
}
```

---

## Export Formats

### JSON Export

```javascript
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2)  // Pretty-printed
  };
}
```

**Output (summary.json):**
```json
{
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": {
        "avg": 234.5,
        "p(95)": 450.6
      }
    }
  }
}
```

### HTML Export

```javascript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export function handleSummary(data) {
  return {
    'summary.html': htmlReport(data)
  };
}
```

### CSV Export

```javascript
export function handleSummary(data) {
  let csv = 'Metric,Type,Value\n';
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.type === 'trend') {
      csv += `${name},avg,${metric.values.avg}\n`;
      csv += `${name},p95,${metric.values['p(95)']}\n`;
    } else if (metric.type === 'counter') {
      csv += `${name},count,${metric.values.count}\n`;
    } else if (metric.type === 'rate') {
      csv += `${name},rate,${metric.values.rate}\n`;
    }
  }
  
  return {
    'summary.csv': csv
  };
}
```

**Output (summary.csv):**
```csv
Metric,Type,Value
http_req_duration,avg,234.5
http_req_duration,p95,450.6
http_reqs,count,1000
http_req_failed,rate,0.02
```

### Markdown Export

```javascript
export function handleSummary(data) {
  let md = '# Load Test Results\n\n';
  md += `**Test Duration:** ${data.state.testRunDurationMs}ms\n\n`;
  md += '## Metrics\n\n';
  md += '| Metric | Value |\n';
  md += '|--------|-------|\n';
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.type === 'trend') {
      md += `| ${name} (avg) | ${metric.values.avg.toFixed(2)}ms |\n`;
      md += `| ${name} (p95) | ${metric.values['p(95)'].toFixed(2)}ms |\n`;
    }
  }
  
  return {
    'summary.md': md
  };
}
```

### Text Summary

```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export function handleSummary(data) {
  return {
    'summary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    'stdout': textSummary(data, { indent: ' ', enableColors: true })
  };
}
```

---

## Custom Report Generation

### Simple Custom Report

```javascript
export function handleSummary(data) {
  const report = generateCustomReport(data);
  
  return {
    'custom-report.txt': report,
    'stdout': report
  };
}

function generateCustomReport(data) {
  let report = '=== LOAD TEST RESULTS ===\n\n';
  
  // Duration
  const durationSec = (data.state.testRunDurationMs / 1000).toFixed(2);
  report += `Test Duration: ${durationSec}s\n\n`;
  
  // Request metrics
  const reqDuration = data.metrics.http_req_duration;
  report += 'Request Performance:\n';
  report += `  Average: ${reqDuration.values.avg.toFixed(2)}ms\n`;
  report += `  P95: ${reqDuration.values['p(95)'].toFixed(2)}ms\n`;
  report += `  P99: ${reqDuration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // Error rate
  const reqFailed = data.metrics.http_req_failed;
  const errorRate = (reqFailed.values.rate * 100).toFixed(2);
  report += `Error Rate: ${errorRate}%\n`;
  report += `  Successful: ${reqFailed.values.passes}\n`;
  report += `  Failed: ${reqFailed.values.fails}\n\n`;
  
  // Thresholds
  report += 'Thresholds:\n';
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.thresholds) {
      for (const [threshold, result] of Object.entries(metric.thresholds)) {
        const status = result.ok ? '✓' : '✗';
        report += `  ${status} ${name}: ${threshold}\n`;
      }
    }
  }
  
  return report;
}
```

### HTML Report with Charts

```javascript
export function handleSummary(data) {
  const html = generateHTMLReport(data);
  
  return {
    'report.html': html
  };
}

function generateHTMLReport(data) {
  const metrics = data.metrics;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>Load Test Results</h1>
  
  <h2>Summary</h2>
  <p><strong>Duration:</strong> ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
  
  <h2>HTTP Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Average</th>
      <th>Min</th>
      <th>Max</th>
      <th>P95</th>
    </tr>
    <tr>
      <td>Request Duration</td>
      <td>${metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
      <td>${metrics.http_req_duration.values.min.toFixed(2)}ms</td>
      <td>${metrics.http_req_duration.values.max.toFixed(2)}ms</td>
      <td>${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
    </tr>
  </table>
  
  <h2>Error Rate</h2>
  <p>
    <strong>Rate:</strong> ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%<br>
    <strong>Successful:</strong> ${metrics.http_req_failed.values.passes}<br>
    <strong>Failed:</strong> ${metrics.http_req_failed.values.fails}
  </p>
  
  <h2>Thresholds</h2>
  <ul>
    ${Object.entries(metrics)
      .filter(([_, metric]) => metric.thresholds)
      .map(([name, metric]) => 
        Object.entries(metric.thresholds)
          .map(([threshold, result]) => 
            `<li class="${result.ok ? 'pass' : 'fail'}">
              ${result.ok ? '✓' : '✗'} ${name}: ${threshold}
            </li>`
          ).join('')
      ).join('')}
  </ul>
</body>
</html>
  `;
}
```

### JSON Summary with Metadata

```javascript
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    environment: __ENV.ENVIRONMENT || 'unknown',
    testDuration: data.state.testRunDurationMs,
    metrics: {
      avgResponseTime: data.metrics.http_req_duration.values.avg,
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
      errorRate: data.metrics.http_req_failed.values.rate,
      totalRequests: data.metrics.http_reqs.values.count,
      requestsPerSecond: data.metrics.http_reqs.values.rate
    },
    thresholds: extractThresholds(data)
  };
  
  return {
    'summary-enhanced.json': JSON.stringify(summary, null, 2)
  };
}

function extractThresholds(data) {
  const thresholds = {};
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.thresholds) {
      thresholds[name] = {};
      for (const [threshold, result] of Object.entries(metric.thresholds)) {
        thresholds[name][threshold] = result.ok;
      }
    }
  }
  
  return thresholds;
}
```

---

## Multiple Output Destinations

### Multiple Files

```javascript
export function handleSummary(data) {
  return {
    'results/summary.json': JSON.stringify(data),
    'results/summary.html': htmlReport(data),
    'results/summary.txt': textSummary(data),
    'results/metrics.csv': generateCSV(data),
    'stdout': textSummary(data, { enableColors: true })
  };
}
```

### Timestamped Files

```javascript
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    [`results/summary-${timestamp}.json`]: JSON.stringify(data),
    [`results/report-${timestamp}.html`]: htmlReport(data),
    'stdout': `Results saved with timestamp: ${timestamp}`
  };
}
```

### Environment-Based Paths

```javascript
export function handleSummary(data) {
  const env = __ENV.ENVIRONMENT || 'dev';
  const timestamp = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
  
  return {
    [`results/${env}/${timestamp}/summary.json`]: JSON.stringify(data),
    [`results/${env}/${timestamp}/report.html`]: htmlReport(data),
    'stdout': `Results saved to results/${env}/${timestamp}/`
  };
}
```

### Conditional Outputs

```javascript
export function handleSummary(data) {
  const outputs = {
    'stdout': textSummary(data, { enableColors: true })
  };
  
  // Always save JSON
  outputs['summary.json'] = JSON.stringify(data);
  
  // HTML only in CI
  if (__ENV.CI === 'true') {
    outputs['report.html'] = htmlReport(data);
  }
  
  // CSV only if requested
  if (__ENV.EXPORT_CSV === 'true') {
    outputs['metrics.csv'] = generateCSV(data);
  }
  
  return outputs;
}
```

---

## Real-World Examples

### Example 1: CI/CD Pipeline Integration

```javascript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const buildNumber = __ENV.BUILD_NUMBER || 'local';
  const branch = __ENV.GIT_BRANCH || 'unknown';
  
  // Enhanced summary with CI metadata
  const ciSummary = {
    metadata: {
      timestamp,
      buildNumber,
      branch,
      environment: __ENV.ENVIRONMENT || 'staging'
    },
    testDuration: data.state.testRunDurationMs,
    metrics: extractKeyMetrics(data),
    thresholds: evaluateThresholds(data),
    passed: allThresholdsPassed(data)
  };
  
  const outputs = {
    // JSON for CI tools
    'results/summary.json': JSON.stringify(ciSummary, null, 2),
    
    // Full data for archival
    'results/full-data.json': JSON.stringify(data, null, 2),
    
    // HTML for human review
    'results/report.html': htmlReport(data),
    
    // Console output
    'stdout': textSummary(data, { indent: ' ', enableColors: true })
  };
  
  // Fail CI if thresholds failed
  if (!ciSummary.passed) {
    outputs['stderr'] = 'FAILED: One or more thresholds failed';
  }
  
  return outputs;
}

function extractKeyMetrics(data) {
  return {
    responseTime: {
      avg: data.metrics.http_req_duration.values.avg,
      p95: data.metrics.http_req_duration.values['p(95)'],
      p99: data.metrics.http_req_duration.values['p(99)']
    },
    errorRate: data.metrics.http_req_failed.values.rate,
    throughput: data.metrics.http_reqs.values.rate,
    totalRequests: data.metrics.http_reqs.values.count
  };
}

function evaluateThresholds(data) {
  const results = {};
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.thresholds) {
      results[name] = {};
      for (const [threshold, result] of Object.entries(metric.thresholds)) {
        results[name][threshold] = {
          passed: result.ok,
          value: getThresholdValue(metric, threshold)
        };
      }
    }
  }
  
  return results;
}

function allThresholdsPassed(data) {
  for (const metric of Object.values(data.metrics)) {
    if (metric.thresholds) {
      for (const result of Object.values(metric.thresholds)) {
        if (!result.ok) return false;
      }
    }
  }
  return true;
}

function getThresholdValue(metric, threshold) {
  // Extract actual value for threshold comparison
  if (metric.type === 'trend') {
    if (threshold.includes('avg')) return metric.values.avg;
    if (threshold.includes('p(95)')) return metric.values['p(95)'];
    if (threshold.includes('p(99)')) return metric.values['p(99)'];
  } else if (metric.type === 'rate') {
    return metric.values.rate;
  } else if (metric.type === 'counter') {
    return metric.values.count;
  }
  return null;
}
```

### Example 2: Slack Notification

```javascript
export function handleSummary(data) {
  const passed = allThresholdsPassed(data);
  const emoji = passed ? ':white_check_mark:' : ':x:';
  
  const slackMessage = {
    text: `${emoji} Load Test ${passed ? 'Passed' : 'Failed'}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Load Test Results*\n${passed ? 'All thresholds passed ✓' : 'Some thresholds failed ✗'}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Avg Response Time:*\n${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`
          },
          {
            type: 'mrkdwn',
            text: `*P95 Response Time:*\n${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`
          },
          {
            type: 'mrkdwn',
            text: `*Error Rate:*\n${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`
          },
          {
            type: 'mrkdwn',
            text: `*Total Requests:*\n${data.metrics.http_reqs.values.count}`
          }
        ]
      }
    ]
  };
  
  // Send to Slack (would need actual HTTP call in real implementation)
  // http.post(__ENV.SLACK_WEBHOOK_URL, JSON.stringify(slackMessage));
  
  return {
    'slack-message.json': JSON.stringify(slackMessage, null, 2),
    'summary.json': JSON.stringify(data, null, 2),
    'stdout': textSummary(data)
  };
}

function allThresholdsPassed(data) {
  for (const metric of Object.values(data.metrics)) {
    if (metric.thresholds) {
      for (const result of Object.values(metric.thresholds)) {
        if (!result.ok) return false;
      }
    }
  }
  return true;
}
```

### Example 3: Performance Comparison

```javascript
import { readFileSync, existsSync } from 'fs';

export function handleSummary(data) {
  const currentMetrics = extractMetrics(data);
  const baselinePath = 'baseline-metrics.json';
  
  let comparison = null;
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    comparison = compareMetrics(baseline, currentMetrics);
  }
  
  const report = generateComparisonReport(currentMetrics, comparison);
  
  return {
    'current-metrics.json': JSON.stringify(currentMetrics, null, 2),
    'comparison-report.html': report,
    'stdout': textSummary(data)
  };
}

function extractMetrics(data) {
  return {
    timestamp: new Date().toISOString(),
    avgResponseTime: data.metrics.http_req_duration.values.avg,
    p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
    errorRate: data.metrics.http_req_failed.values.rate,
    throughput: data.metrics.http_reqs.values.rate
  };
}

function compareMetrics(baseline, current) {
  return {
    avgResponseTime: {
      baseline: baseline.avgResponseTime,
      current: current.avgResponseTime,
      change: ((current.avgResponseTime - baseline.avgResponseTime) / baseline.avgResponseTime * 100).toFixed(2)
    },
    p95ResponseTime: {
      baseline: baseline.p95ResponseTime,
      current: current.p95ResponseTime,
      change: ((current.p95ResponseTime - baseline.p95ResponseTime) / baseline.p95ResponseTime * 100).toFixed(2)
    },
    errorRate: {
      baseline: baseline.errorRate,
      current: current.errorRate,
      change: ((current.errorRate - baseline.errorRate) / (baseline.errorRate || 0.01) * 100).toFixed(2)
    }
  };
}

function generateComparisonReport(current, comparison) {
  if (!comparison) {
    return '<html><body><h1>No baseline for comparison</h1></body></html>';
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Comparison</title>
  <style>
    body { font-family: Arial; margin: 40px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 12px; }
    .improved { color: green; }
    .degraded { color: red; }
  </style>
</head>
<body>
  <h1>Performance Comparison</h1>
  <table>
    <tr>
      <th>Metric</th>
      <th>Baseline</th>
      <th>Current</th>
      <th>Change</th>
    </tr>
    ${Object.entries(comparison).map(([metric, data]) => `
      <tr>
        <td>${metric}</td>
        <td>${data.baseline.toFixed(2)}</td>
        <td>${data.current.toFixed(2)}</td>
        <td class="${data.change < 0 ? 'improved' : 'degraded'}">
          ${data.change}%
        </td>
      </tr>
    `).join('')}
  </table>
</body>
</html>
  `;
}
```

### Example 4: Multi-Format Export

```javascript
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const testName = __ENV.TEST_NAME || 'load-test';
  
  return {
    // JSON - Machine readable
    [`results/${testName}-${timestamp}.json`]: JSON.stringify(data, null, 2),
    
    // HTML - Human readable
    [`results/${testName}-${timestamp}.html`]: htmlReport(data),
    
    // CSV - Spreadsheet import
    [`results/${testName}-${timestamp}.csv`]: generateCSV(data),
    
    // Markdown - Documentation
    [`results/${testName}-${timestamp}.md`]: generateMarkdown(data),
    
    // JUnit XML - CI integration
    [`results/${testName}-${timestamp}.xml`]: generateJUnitXML(data),
    
    // Console
    'stdout': textSummary(data, { indent: ' ', enableColors: true })
  };
}

function generateCSV(data) {
  let csv = 'Metric,Type,Value\n';
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.type === 'trend') {
      csv += `${name},avg,${metric.values.avg}\n`;
      csv += `${name},min,${metric.values.min}\n`;
      csv += `${name},max,${metric.values.max}\n`;
      csv += `${name},p95,${metric.values['p(95)']}\n`;
    } else if (metric.type === 'counter') {
      csv += `${name},count,${metric.values.count}\n`;
    } else if (metric.type === 'rate') {
      csv += `${name},rate,${metric.values.rate}\n`;
    }
  }
  
  return csv;
}

function generateMarkdown(data) {
  let md = `# Load Test Results\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Duration:** ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n\n`;
  
  md += `## Key Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Avg Response Time | ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms |\n`;
  md += `| P95 Response Time | ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms |\n`;
  md += `| Error Rate | ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}% |\n`;
  md += `| Total Requests | ${data.metrics.http_reqs.values.count} |\n\n`;
  
  md += `## Thresholds\n\n`;
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.thresholds) {
      for (const [threshold, result] of Object.entries(metric.thresholds)) {
        md += `- ${result.ok ? '✅' : '❌'} ${name}: ${threshold}\n`;
      }
    }
  }
  
  return md;
}

function generateJUnitXML(data) {
  const testCount = Object.keys(data.metrics).length;
  const failures = Object.values(data.metrics)
    .filter(m => m.thresholds)
    .flatMap(m => Object.values(m.thresholds))
    .filter(t => !t.ok).length;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites tests="${testCount}" failures="${failures}">\n`;
  xml += `  <testsuite name="k6-load-test" tests="${testCount}" failures="${failures}">\n`;
  
  for (const [name, metric] of Object.entries(data.metrics)) {
    if (metric.thresholds) {
      for (const [threshold, result] of Object.entries(metric.thresholds)) {
        xml += `    <testcase name="${name}: ${threshold}">\n`;
        if (!result.ok) {
          xml += `      <failure message="Threshold failed"/>\n`;
        }
        xml += `    </testcase>\n`;
      }
    }
  }
  
  xml += `  </testsuite>\n`;
  xml += `</testsuites>`;
  
  return xml;
}
```

---

## Best Practices

### 1. Always Return stdout

```javascript
// ✅ Good: Keep console output
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data, { enableColors: true })
  };
}

// ❌ Bad: No console output
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data)
    // Missing stdout - no console output!
  };
}
```

### 2. Use Timestamps for Files

```javascript
// ✅ Good: Timestamped files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
return {
  [`results/summary-${timestamp}.json`]: JSON.stringify(data)
};

// ❌ Bad: Overwrites previous results
return {
  'summary.json': JSON.stringify(data)
};
```

### 3. Handle Errors Gracefully

```javascript
// ✅ Good: Error handling
export function handleSummary(data) {
  try {
    const report = generateComplexReport(data);
    return {
      'report.html': report,
      'stdout': textSummary(data)
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    return {
      'stdout': textSummary(data),
      'stderr': `Report generation failed: ${error.message}`
    };
  }
}
```

### 4. Extract Key Metrics

```javascript
// ✅ Good: Simplified summary
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    avgResponseTime: data.metrics.http_req_duration.values.avg,
    p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
    errorRate: data.metrics.http_req_failed.values.rate,
    passed: allThresholdsPassed(data)
  };
  
  return {
    'summary.json': JSON.stringify(summary, null, 2),
    'full-data.json': JSON.stringify(data, null, 2)
  };
}
```

### 5. Use Environment Variables

```javascript
// ✅ Good: Configurable output
export function handleSummary(data) {
  const outputDir = __ENV.OUTPUT_DIR || 'results';
  const format = __ENV.OUTPUT_FORMAT || 'json';
  
  const outputs = {
    'stdout': textSummary(data)
  };
  
  if (format === 'json' || format === 'all') {
    outputs[`${outputDir}/summary.json`] = JSON.stringify(data);
  }
  
  if (format === 'html' || format === 'all') {
    outputs[`${outputDir}/report.html`] = htmlReport(data);
  }
  
  return outputs;
}
```

### 6. Document Custom Metrics

```javascript
// ✅ Good: Include metadata
export function handleSummary(data) {
  const summary = {
    metadata: {
      testName: __ENV.TEST_NAME,
      environment: __ENV.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      k6Version: '0.45.0'  // Or extract from data
    },
    metrics: extractMetrics(data),
    thresholds: extractThresholds(data)
  };
  
  return {
    'summary.json': JSON.stringify(summary, null, 2)
  };
}
```

### 7. Validate Data Before Processing

```javascript
// ✅ Good: Validate data
export function handleSummary(data) {
  if (!data || !data.metrics) {
    console.error('Invalid summary data');
    return {
      'stderr': 'Error: Invalid summary data'
    };
  }
  
  // Process data...
}
```

---

## Troubleshooting

### Problem: No Output Files Created

**Symptom:** handleSummary runs but files not created

**Cause:** Invalid file path or permissions

**Solution:** Check paths and permissions

```javascript
// ✅ Good: Relative path
return {
  'results/summary.json': JSON.stringify(data)
};

// ❌ Bad: Invalid path
return {
  '/invalid/path/summary.json': JSON.stringify(data)
};
```

---

### Problem: Console Output Suppressed

**Symptom:** No output to console

**Cause:** Missing stdout in return value

**Solution:** Always include stdout

```javascript
// ✅ Fix: Add stdout
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data)  // Add this!
  };
}
```

---

### Problem: handleSummary Not Called

**Symptom:** Function doesn't execute

**Cause:** Function not exported or syntax error

**Solution:** Verify export and syntax

```javascript
// ✅ Good: Exported function
export function handleSummary(data) {
  return { 'stdout': 'Summary' };
}

// ❌ Bad: Not exported
function handleSummary(data) {
  return { 'stdout': 'Summary' };
}
```

---

### Problem: Metrics Missing

**Symptom:** Some metrics not in summary data

**Cause:** Metrics not recorded during test

**Solution:** Verify metrics are created and used

```javascript
import { Counter } from 'k6/metrics';

const myCounter = new Counter('my_counter');

export default function () {
  myCounter.add(1);  // Must record values!
}

export function handleSummary(data) {
  console.log(data.metrics.my_counter);  // Now available
}
```

---

## Quick Reference

### Basic handleSummary

```javascript
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    'stdout': textSummary(data)
  };
}
```

### Multiple Outputs

```javascript
export function handleSummary(data) {
  return {
    'results/summary.json': JSON.stringify(data),
    'results/report.html': htmlReport(data),
    'results/metrics.csv': generateCSV(data),
    'stdout': textSummary(data, { enableColors: true })
  };
}
```

### Access Metrics

```javascript
// Trend metric
const avg = data.metrics.http_req_duration.values.avg;
const p95 = data.metrics.http_req_duration.values['p(95)'];

// Rate metric
const errorRate = data.metrics.http_req_failed.values.rate;

// Counter metric
const totalReqs = data.metrics.http_reqs.values.count;

// Threshold
const passed = data.metrics.http_req_duration.thresholds['p(95)<500'].ok;
```

---

## Summary

**Summary export enables powerful custom reporting:**

- ✅ **Use handleSummary** - Customize test output
- ✅ **Return multiple formats** - JSON, HTML, CSV, etc.
- ✅ **Always include stdout** - Keep console output
- ✅ **Use timestamps** - Avoid overwriting results
- ✅ **Extract key metrics** - Simplify summaries
- ✅ **Handle errors** - Graceful degradation
- ✅ **Integrate with CI/CD** - Automated reporting
- ✅ **Compare results** - Track performance over time
- ❌ **Don't suppress output** - Always return stdout
- ❌ **Don't hardcode paths** - Use environment variables

**Master summary export, and you'll create professional reports, integrate with CI/CD pipelines, and track performance trends over time.**
