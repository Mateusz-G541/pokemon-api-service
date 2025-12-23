# K6 Performance Testing Best Practices

This guide documents the best practices implemented in this repository's k6 performance testing setup.

## Table of Contents

1. [Project Organization](#project-organization)
2. [Test Configuration](#test-configuration)
3. [Request Tagging & Thresholds](#request-tagging--thresholds)
4. [Realistic User Behavior](#realistic-user-behavior)
5. [CI/CD Integration](#cicd-integration)
6. [Artifacts & Observability](#artifacts--observability)
7. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
8. [Next Steps & Improvements](#next-steps--improvements)

---

## Project Organization

### ✅ Separate performance tests from application code

```
perf/
├── configs/          # k6 test configurations
│   ├── smoke.json    # Fast sanity checks
│   └── load.json     # Realistic load scenarios
├── scripts/          # k6 test scripts
│   ├── pokemon-list.js
│   ├── pokemon-details.js
│   ├── pokemon-search.js
│   └── pokemon-suggestions.js
└── utils/            # Shared helpers
    ├── helper.js     # assert, thinkTime, etc.
    ├── config.js     # BASE_URL
    └── routes.js     # API endpoint definitions
```

**Why this matters:**
- Clear separation from `src/` (app code) and `tests/` (unit/integration tests)
- Easy to find and maintain performance tests
- Can be excluded from TypeScript/ESLint without affecting app linting

---

## Test Configuration

### ✅ Use separate configs for different test types

#### Smoke Tests (`perf/configs/smoke.json`)
```json
{
  "scenarios": {
    "smoke": {
      "executor": "per-vu-iterations",
      "vus": 1,
      "iterations": 5
    }
  },
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"],
    "http_req_duration": ["p(95)<500", "p(99)<1000"]
  }
}
```

**Purpose:** Fast CI gate (< 30s) to catch obvious regressions

**Key points:**
- Low VU count (1 VU)
- Multiple iterations (5) for statistical significance and statelessness validation
- Strict thresholds (zero failures, tight latency)

#### Load Tests (`perf/configs/load.json`)
```json
{
  "scenarios": {
    "load": {
      "executor": "ramping-vus",
      "startVUs": 0,
      "stages": [
        { "duration": "20s", "target": 3 },
        { "duration": "30s", "target": 3 },
        { "duration": "20s", "target": 0 }
      ],
      "gracefulRampDown": "10s"
    }
  },
  "thresholds": {
    "http_req_duration": ["p(95)<1000"],
    "http_req_failed": ["rate<0.1"]
  }
}
```

**Purpose:** Realistic sustained load to find bottlenecks

**Key points:**
- Gradual ramp-up/down (avoid thundering herd)
- Relaxed thresholds (allow some failures under load)
- Longer duration for steady-state observation

---

## Request Tagging & Thresholds

### ✅ Tag requests to separate expected failures from real failures

#### Problem
k6 counts **any non-2xx status as failed**. But you often test error cases intentionally (404s, 400s, etc.).

#### Solution: Tag expected failures

```javascript
// Normal request (expects 200)
const response = http.get(`${BASE_URL}/api/v2/pokemon/1`);

// Intentional error test (expects 404)
const invalidResponse = http.get(`${BASE_URL}/api/v2/pokemon/99999`, {
  tags: { expected_response: 'false' }
});
```

#### Apply thresholds only to "real" requests

```json
{
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"]
  }
}
```

**Result:** Edge-case tests don't pollute failure metrics, but real bugs are still caught.

### ✅ Tag by endpoint type for granular thresholds

```javascript
http.get(listUrl, { tags: { endpoint: 'list' } });
http.get(detailsUrl, { tags: { endpoint: 'details' } });
```

```json
{
  "thresholds": {
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"]
  }
}
```

**Why:** Different endpoints have different performance characteristics.

---

## Realistic User Behavior

### ✅ Add think time between requests

#### Problem
Hammering endpoints back-to-back creates unrealistic traffic patterns and false bottlenecks.

#### Solution: Use `sleep()` with randomized think time

```javascript
import { sleep } from "k6";
import { thinkTime } from "../utils/helper.js";

export default function () {
  const response = http.get(`${BASE_URL}/api/v2/pokemon?limit=20`);
  sleep(thinkTime());  // Random 0.2-1s pause
  
  const detailsResponse = http.get(`${BASE_URL}/api/v2/pokemon/1`);
  sleep(thinkTime());
}
```

**Helper implementation:**
```javascript
export function thinkTime(minSeconds = 0.2, maxSeconds = 1) {
  return minSeconds + Math.random() * (maxSeconds - minSeconds);
}
```

**Benefits:**
- More realistic traffic patterns
- Better cache behavior simulation
- Reduces artificial contention

### ✅ Use centralized route definitions

```javascript
// perf/utils/routes.js
export const ROUTES = {
  pokemonList: '/api/v2/pokemon',
  pokemonDetails: (identifier) => `/api/v2/pokemon/${identifier}`,
  pokemonSearch: '/api/v2/search/pokemon',
  pokemonSuggestions: '/api/v2/pokemon/suggestions',
};
```

```javascript
// In test scripts
import { ROUTES } from '../utils/routes.js';

const response = http.get(`${BASE_URL}${ROUTES.pokemonDetails(1)}`);
```

**Why:** Single source of truth prevents drift between tests and API.

---

## CI/CD Integration

### ✅ Use `workflow_dispatch` for manual test runs

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      suite:
        description: 'Which k6 suite to run'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - smoke
          - details
          - search
          - suggestions
```

**Benefits:**
- Run specific test suites on-demand
- Debug performance issues without full CI run
- Test against different environments

### ✅ Contract check before performance tests

```yaml
- name: Contract Check (Routes)
  run: |
    check_url() {
      url="$1"
      code=$(curl -sS -o /tmp/resp -w "%{http_code}" "$url")
      if [ "$code" != "200" ]; then
        echo "❌ Contract check failed: $url"
        echo "HTTP status: $code"
        head -c 400 /tmp/resp
        exit 1
      fi
      echo "✅ $url"
    }
    
    check_url "http://localhost:20275/api/v2/pokemon?limit=1"
    check_url "http://localhost:20275/api/v2/pokemon/1"
```

**Why:** Fail fast on route mismatches before running expensive perf tests.

### ✅ Gate test steps with suite selection

```yaml
- name: Run Smoke Tests
  if: env.TEST_SUITE == 'all' || env.TEST_SUITE == 'smoke'
  run: k6 run --config perf/configs/smoke.json perf/scripts/pokemon-list.js
```

**Why:** Run only relevant tests, save CI time.

---

## Artifacts & Observability

### ✅ Export k6 summaries per test

```yaml
- name: Run Smoke Tests
  run: |
    k6 run \
      --config perf/configs/smoke.json \
      --summary-export perf/results/${{ env.TEST_SUITE }}/pokemon-list.summary.json \
      perf/scripts/pokemon-list.js
```

### ✅ Upload artifacts with suite name

```yaml
- name: Upload k6 Results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: k6-results-${{ env.TEST_SUITE }}
    path: |
      perf/results/
      api.log
    retention-days: 30
```

**Benefits:**
- Compare results across runs
- Debug failures with API logs
- Track performance trends over time

### ✅ Optional InfluxDB output for dashboards

```yaml
# In CI: only use InfluxDB when explicitly needed
--out influxdb=http://localhost:8086/k6
```

**Recommendation:** For CI, summary JSON is usually enough. Use InfluxDB for:
- Local development/debugging
- Long-running load tests
- Real-time dashboards

---

## Common Pitfalls to Avoid

### ❌ Don't use global thresholds for all requests
```json
// BAD
"http_req_failed": ["rate==0"]  // Breaks on intentional 404s
```

```json
// GOOD
"http_req_failed{expected_response:true}": ["rate==0"]
```

### ❌ Don't run only 1 iteration in smoke
```json
// BAD
"iterations": 1  // Not enough for percentiles or statelessness
```

```json
// GOOD
"iterations": 5  // Better statistical confidence
```

### ❌ Don't ignore route shadowing in Express
```javascript
// BAD (suggestions will be caught by :identifier)
router.get('/pokemon/:identifier', ...);
router.get('/pokemon/suggestions', ...);
```

```javascript
// GOOD (specific routes first)
router.get('/pokemon/suggestions', ...);
router.get('/pokemon/:identifier', ...);
```

### ❌ Don't set `continue-on-error: true` without reason
```yaml
# BAD (hides failures)
- name: Run Details Test
  run: k6 run ...
  continue-on-error: true
```

**When to use:** Only for informational tests that shouldn't block CI.

### ❌ Don't hammer endpoints without think time
```javascript
// BAD
for (let i = 0; i < 10; i++) {
  http.get(url);  // Unrealistic tight loop
}
```

```javascript
// GOOD
for (let i = 0; i < 10; i++) {
  http.get(url);
  sleep(thinkTime());  // Realistic pause
}
```

---

## Next Steps & Improvements

### Priority A: Per-endpoint thresholds
```javascript
// Tag all requests by endpoint
http.get(url, { tags: { endpoint: 'list', expected_response: 'true' } });
```

```json
{
  "thresholds": {
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    "http_req_duration{endpoint:search}": ["p(95)<800"]
  }
}
```

**Why:** Detect regressions in specific endpoints, not just overall.

### Priority B: User journey tests
Create a script that mimics real user flows:

```javascript
export default function () {
  // 70% list
  if (Math.random() < 0.7) {
    http.get(`${BASE_URL}/api/v2/pokemon?limit=20`);
    sleep(thinkTime());
  }
  
  // 20% details
  if (Math.random() < 0.2) {
    const id = Math.floor(Math.random() * 151) + 1;
    http.get(`${BASE_URL}/api/v2/pokemon/${id}`);
    sleep(thinkTime());
  }
  
  // 10% search/suggestions
  if (Math.random() < 0.1) {
    http.get(`${BASE_URL}/api/v2/search/pokemon?q=pika`);
    sleep(thinkTime());
  }
}
```

**Why:** More realistic load patterns, better cache behavior.

### Priority C: Baseline comparison
Store summary JSONs and compare against baseline:

```bash
# Fail if p95 regresses > 20%
if [ $current_p95 -gt $((baseline_p95 * 120 / 100)) ]; then
  echo "Performance regression detected"
  exit 1
fi
```

### Priority D: Load test workflow
Create a separate workflow for longer load tests:

```yaml
name: Load Tests
on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
```

**Why:** Smoke tests are fast gates; load tests find real bottlenecks.

---

## Summary: What Makes This Setup Good

✅ **Organized:** Clear `perf/` structure separate from app code  
✅ **Precise:** Tagged requests + scoped thresholds catch real issues  
✅ **Realistic:** Think time + multiple iterations simulate real traffic  
✅ **Fast:** Smoke tests run in < 30s for quick CI feedback  
✅ **Observable:** Artifacts + summaries enable trend analysis  
✅ **Flexible:** Manual runs + suite selection for debugging  
✅ **Maintainable:** Centralized routes + helpers reduce duplication  

---

## Action Items: What to Add/Fix in Your Current Setup

### 🔴 High Priority (Do First)

#### 1. Tag all requests with `expected_response`
**Current state:** Only `pokemon-details.js` has the invalid request tagged.

**Action needed:**
- Add `{ tags: { expected_response: 'true' } }` to all normal requests in:
  - `perf/scripts/pokemon-list.js`
  - `perf/scripts/pokemon-search.js`
  - `perf/scripts/pokemon-suggestions.js`

**Example:**
```javascript
// Before
const response = http.get(`${BASE_URL}/api/v2/pokemon?limit=20`);

// After
const response = http.get(`${BASE_URL}/api/v2/pokemon?limit=20`, {
  tags: { expected_response: 'true' }
});
```

**Why:** Ensures threshold `http_req_failed{expected_response:true}` works correctly across all scripts.

---

#### 2. Add per-endpoint tags for granular thresholds
**Current state:** No endpoint-specific tagging.

**Action needed:**
- Tag requests by endpoint type:
  ```javascript
  http.get(url, { 
    tags: { 
      endpoint: 'list',
      expected_response: 'true' 
    } 
  });
  ```

**Then update `smoke.json`:**
```json
{
  "thresholds": {
    "http_req_failed{expected_response:true}": ["rate==0"],
    "http_req_duration{endpoint:list}": ["p(95)<300"],
    "http_req_duration{endpoint:details}": ["p(95)<500"],
    "http_req_duration{endpoint:search}": ["p(95)<800"],
    "http_req_duration{endpoint:suggestions}": ["p(95)<600"]
  }
}
```

**Why:** Detect which specific endpoint regressed, not just "something got slower".

---

#### 3. Remove or make InfluxDB optional in CI
**Current state:** All k6 runs use `--out influxdb=http://localhost:8086/k6`.

**Action needed:**
- Add workflow input to control InfluxDB:
  ```yaml
  workflow_dispatch:
    inputs:
      store_influx:
        description: 'Send metrics to InfluxDB'
        type: boolean
        default: false
  ```

- Conditionally add `--out` flag:
  ```yaml
  run: |
    INFLUX_FLAG=""
    if [ "${{ inputs.store_influx }}" = "true" ]; then
      INFLUX_FLAG="--out influxdb=http://localhost:8086/k6"
    fi
    k6 run --config perf/configs/smoke.json $INFLUX_FLAG perf/scripts/pokemon-list.js
  ```

**Why:** InfluxDB adds complexity/flakiness in CI. Summary JSON is usually enough.

---

### 🟡 Medium Priority (Do Soon)

#### 4. Create a user journey test
**Current state:** Tests are endpoint-focused, not flow-focused.

**Action needed:**
- Create `perf/scripts/user-journey.js`:
  ```javascript
  export default function () {
    // 60% browse list
    if (Math.random() < 0.6) {
      http.get(`${BASE_URL}/api/v2/pokemon?limit=20`, {
        tags: { endpoint: 'list', expected_response: 'true' }
      });
      sleep(thinkTime(0.5, 2));
    }
    
    // 25% view details
    if (Math.random() < 0.25) {
      const id = Math.floor(Math.random() * 151) + 1;
      http.get(`${BASE_URL}/api/v2/pokemon/${id}`, {
        tags: { endpoint: 'details', expected_response: 'true' }
      });
      sleep(thinkTime(1, 3));
    }
    
    // 10% search
    if (Math.random() < 0.1) {
      const queries = ['pika', 'char', 'bulb', 'mew'];
      const q = queries[Math.floor(Math.random() * queries.length)];
      http.get(`${BASE_URL}/api/v2/search/pokemon?q=${q}`, {
        tags: { endpoint: 'search', expected_response: 'true' }
      });
      sleep(thinkTime(0.3, 1));
    }
    
    // 5% suggestions
    if (Math.random() < 0.05) {
      http.get(`${BASE_URL}/api/v2/pokemon/suggestions?query=pika`, {
        tags: { endpoint: 'suggestions', expected_response: 'true' }
      });
      sleep(thinkTime(0.2, 0.8));
    }
  }
  ```

**Why:** More realistic than isolated endpoint tests.

---

#### 5. Use `load.json` config in workflow
**Current state:** All tests use `smoke.json`, even `details/search/suggestions`.

**Action needed:**
- Add workflow input for config profile:
  ```yaml
  workflow_dispatch:
    inputs:
      profile:
        description: 'Test profile (smoke or load)'
        type: choice
        default: 'smoke'
        options:
          - smoke
          - load
  ```

- Use it in k6 commands:
  ```yaml
  run: k6 run --config perf/configs/${{ inputs.profile }}.json ...
  ```

**Why:** `load.json` exists but is never used. Run real load tests occasionally.

---

#### 6. Add baseline comparison
**Current state:** No historical comparison, can't detect gradual regressions.

**Action needed:**
- Store baseline summary in repo:
  ```bash
  mkdir -p perf/baselines
  cp perf/results/all/pokemon-list.summary.json perf/baselines/pokemon-list.baseline.json
  ```

- Add comparison step in workflow:
  ```yaml
  - name: Compare against baseline
    run: |
      baseline_p95=$(jq '.metrics.http_req_duration.values["p(95)"]' perf/baselines/pokemon-list.baseline.json)
      current_p95=$(jq '.metrics.http_req_duration.values["p(95)"]' perf/results/all/pokemon-list.summary.json)
      
      threshold=$((baseline_p95 * 120 / 100))  # 20% regression allowed
      if [ $(echo "$current_p95 > $threshold" | bc) -eq 1 ]; then
        echo "❌ Performance regression: p95 ${current_p95}ms > ${threshold}ms"
        exit 1
      fi
      echo "✅ Performance within acceptable range"
  ```

**Why:** Catch gradual performance degradation over time.

---

### 🟢 Low Priority (Nice to Have)

#### 7. Create dedicated load test workflow
**Current state:** Load tests run in same workflow as smoke.

**Action needed:**
- Create `.github/workflows/load-tests.yml`:
  ```yaml
  name: Load Tests
  on:
    workflow_dispatch:
    schedule:
      - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  
  jobs:
    load-test:
      runs-on: ubuntu-latest
      steps:
        # ... setup steps ...
        - name: Run Load Test
          run: k6 run --config perf/configs/load.json perf/scripts/user-journey.js
  ```

**Why:** Separate concerns: smoke = fast gate, load = deep analysis.

---

#### 8. Add metadata to artifacts
**Current state:** Artifacts only contain summaries and logs.

**Action needed:**
- Create metadata file:
  ```yaml
  - name: Create metadata
    run: |
      cat > perf/results/metadata.json <<EOF
      {
        "suite": "${{ env.TEST_SUITE }}",
        "commit": "${{ github.sha }}",
        "branch": "${{ github.ref_name }}",
        "run_id": "${{ github.run_id }}",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      }
      EOF
  ```

**Why:** Easier to correlate results with code changes.

---

#### 9. Clean up old k6 files
**Current state:** Old `scripts/`, `configs/`, `utils/` folders still exist.

**Action needed:**
```bash
rm -rf scripts/pokemon-*.js
rm -rf configs/smoke.json configs/load.json
rm -rf utils/helper.js utils/config.js
```

**Why:** Avoid confusion, keep only `perf/` directory.

---

#### 10. Add ESLint exception for console.error in routes
**Current state:** 10 ESLint warnings for `console.error` in `src/routes/pokemon.routes.ts`.

**Action needed:**
- Either: Use a proper logger (e.g., `winston`, `pino`)
- Or: Add ESLint override:
  ```javascript
  // In .eslintrc.js
  overrides: [
    {
      files: ['src/routes/**/*.ts'],
      rules: {
        'no-console': ['error', { allow: ['error'] }]
      }
    }
  ]
  ```

**Why:** Clean linting output, or proper structured logging.

---

## Quick Win Checklist

Copy this to track your progress:

```markdown
- [ ] Tag all requests with `expected_response: 'true'`
- [ ] Add per-endpoint tags (`endpoint: 'list'`, etc.)
- [ ] Update smoke.json with per-endpoint thresholds
- [ ] Make InfluxDB optional in CI
- [ ] Create user-journey.js script
- [ ] Add workflow input for smoke vs load config
- [ ] Set up baseline comparison
- [ ] Create dedicated load-tests.yml workflow
- [ ] Add metadata.json to artifacts
- [ ] Delete old scripts/configs/utils folders
- [ ] Fix console.error ESLint warnings
```

---

## References

- [k6 Documentation](https://grafana.com/docs/k6/latest/)
- [k6 Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
- [k6 Tags](https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/)
- [k6 Best Practices](https://grafana.com/docs/k6/latest/testing-guides/test-types/)
