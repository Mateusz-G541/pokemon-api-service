# Pokemon API Performance Testing Stack

This repository now includes everything needed to run the Pokemon API with integrated performance testing and monitoring.

## Quick Start

### Start the entire stack (API + InfluxDB + Grafana):
```bash
npm run stack:up
```

This starts:
- **Pokemon API** on http://localhost:20275
- **InfluxDB** on http://localhost:8086 (metrics storage)
- **Grafana** on http://localhost:3000 (visualization - login: admin/admin)

### Run Performance Tests

All tests send metrics to InfluxDB automatically:

```bash
# Smoke test (minimal load)
npm run test:smoke

# Load test (higher load)
npm run test:load

# Test individual endpoints
npm run test:details      # Pokemon details endpoint
npm run test:search       # Search functionality
npm run test:suggestions  # Suggestions endpoint
```

### Monitor Metrics

1. Open Grafana: http://localhost:3000
2. Login with admin/admin
3. View dashboards to see combined metrics:
   - k6 load test results (external metrics)
   - Pokemon API internal metrics (HTTP requests, access patterns, search queries)

### Stop the Stack

```bash
npm run stack:down
```

### View Logs

```bash
npm run stack:logs
```

## Architecture

The stack consists of:

- **Pokemon API Service**: Node.js/Express API with integrated metrics
- **InfluxDB**: Time-series database for storing metrics from both k6 and the API
- **Grafana**: Visualization dashboards for all metrics
- **k6**: Load testing tool that sends metrics to InfluxDB

Both the external load test metrics (from k6) and internal application metrics (from the API) flow to the same InfluxDB database, allowing unified monitoring in Grafana.

## Configuration

### Environment Variables

See `.env.example` for available options. Key metrics settings:

```
INFLUXDB_URL=http://localhost:8086
INFLUXDB_DATABASE=k6
```

### Test Configurations

- `configs/smoke.json` - Light load for quick testing
- `configs/load.json` - Heavy load for stress testing

### Test Scripts

All scripts in `scripts/` are k6 performance tests that can be run individually or with configurations.
