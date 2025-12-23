# Performance Testing Utilities

This directory contains reusable utilities for k6 performance tests.

## Logger

A comprehensive logging utility for k6 tests with support for different log levels, formats, and contextual information.

### Features

- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
- **Flexible Formats**: JSON or TEXT output
- **Contextual Information**: Automatic VU and iteration tracking
- **HTTP Logging**: Specialized methods for request/response logging
- **Conditional Logging**: Log only for specific VUs or iterations
- **Child Loggers**: Create loggers with additional context

### Basic Usage

```javascript
import { Logger } from './utils/logger.js';

export default function () {
  Logger.debug('Detailed debug information');
  Logger.info('General information');
  Logger.warn('Warning message');
  Logger.error('Error message');
}
```

### Environment Variables

Control logger behavior via environment variables:

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `LOG_LEVEL` | DEBUG, INFO, WARN, ERROR, NONE | INFO | Minimum log level to display |
| `LOG_FORMAT` | JSON, TEXT | TEXT | Output format |
| `LOG_TIMESTAMP` | true, false | true | Include timestamps |
| `LOG_CONTEXT` | true, false | true | Include VU/iteration context |

### Examples

**Run with DEBUG level:**
```bash
k6 run -e LOG_LEVEL=DEBUG script.js
```

**Run with JSON format:**
```bash
k6 run -e LOG_FORMAT=JSON script.js
```

**Run with ERROR level only:**
```bash
k6 run -e LOG_LEVEL=ERROR script.js
```

**Disable timestamps:**
```bash
k6 run -e LOG_TIMESTAMP=false script.js
```

### Log Levels

**DEBUG** - Detailed information for debugging
```javascript
Logger.debug('Request parameters', { url, headers });
```

**INFO** - General informational messages
```javascript
Logger.info('User logged in successfully');
```

**WARN** - Warning messages for potential issues
```javascript
Logger.warn('Slow request detected', { duration: 1500 });
```

**ERROR** - Error messages for failures
```javascript
Logger.error('Authentication failed', { status: 401 });
```

### HTTP Logging

**Log request:**
```javascript
Logger.logRequest('GET', url, params);
```

**Log response:**
```javascript
const response = http.get(url);
Logger.logResponse(response);
```

**Log both:**
```javascript
const response = http.get(url, params);
Logger.logHTTP('GET', url, params, response);
```

### Conditional Logging

**Log only for VU 1:**
```javascript
Logger.logForVU(1, 'INFO', 'This only appears for VU 1');
```

**Log only for first iteration:**
```javascript
Logger.logForIteration(0, 'INFO', 'First iteration setup');
```

**Log every 10 iterations:**
```javascript
Logger.logEveryN(10, 'INFO', 'Progress update', { iteration: __ITER });
```

### Child Loggers

Create loggers with additional context:

```javascript
const userLogger = Logger.child({ module: 'UserService' });
userLogger.info('User created');  // [UserService] User created

const orderLogger = Logger.child({ module: 'OrderService', orderId: 'ORD-123' });
orderLogger.info('Processing order');  // [OrderService] [orderId: ORD-123] Processing order
```

### Output Formats

**TEXT format (default):**
```
[2024-01-15T10:30:00.000Z] [INFO] [VU1] [Iter0] User logged in successfully
[2024-01-15T10:30:01.234Z] [WARN] [VU2] [Iter5] Slow request detected {"duration":1500}
[2024-01-15T10:30:02.456Z] [ERROR] [VU3] [Iter2] Authentication failed {"status":401}
```

**JSON format:**
```json
{"level":"INFO","message":"User logged in successfully","timestamp":"2024-01-15T10:30:00.000Z","vu":1,"iteration":0}
{"level":"WARN","message":"Slow request detected","timestamp":"2024-01-15T10:30:01.234Z","vu":2,"iteration":5,"data":{"duration":1500}}
{"level":"ERROR","message":"Authentication failed","timestamp":"2024-01-15T10:30:02.456Z","vu":3,"iteration":2,"data":{"status":401}}
```

### Real-World Example

```javascript
import http from 'k6/http';
import { check } from 'k6';
import { Logger } from './utils/logger.js';

export default function () {
  Logger.info('Starting test iteration');
  
  // Login
  if (__ITER === 0) {
    Logger.debug('First iteration - performing login');
    
    const loginRes = http.post('/api/login', credentials);
    Logger.logResponse(loginRes);
    
    const loginSuccess = check(loginRes, {
      'login successful': (r) => r.status === 200
    });
    
    if (!loginSuccess) {
      Logger.error('Login failed', {
        status: loginRes.status,
        body: loginRes.body
      });
      return;
    }
    
    Logger.info('Login successful');
  }
  
  // Fetch data
  const dataRes = http.get('/api/data');
  
  if (dataRes.status !== 200) {
    Logger.error('Data fetch failed', {
      status: dataRes.status,
      duration: dataRes.timings.duration
    });
  } else {
    Logger.debug('Data fetched successfully', {
      duration: dataRes.timings.duration
    });
  }
  
  // Warn on slow requests
  if (dataRes.timings.duration > 1000) {
    Logger.warn('Slow request detected', {
      url: dataRes.url,
      duration: dataRes.timings.duration
    });
  }
}
```

## Routes

Centralized API route definitions.

### Usage

```javascript
import { ROUTES } from './utils/routes.js';

export default function () {
  http.get(ROUTES.POKEMON_LIST);
  http.get(ROUTES.POKEMON_DETAILS(1));
}
```

## Best Practices

1. **Use appropriate log levels**
   - DEBUG: Detailed debugging information
   - INFO: General progress and state
   - WARN: Potential issues
   - ERROR: Actual failures

2. **Control verbosity with environment variables**
   - Development: `LOG_LEVEL=DEBUG`
   - CI/CD: `LOG_LEVEL=INFO`
   - Production: `LOG_LEVEL=WARN`

3. **Use conditional logging for high-volume tests**
   ```javascript
   Logger.logForVU(1, 'DEBUG', 'Detailed info');
   Logger.logEveryN(100, 'INFO', 'Progress update');
   ```

4. **Structure your log data**
   ```javascript
   Logger.error('Request failed', {
     url: response.url,
     status: response.status,
     duration: response.timings.duration
   });
   ```

5. **Use child loggers for modules**
   ```javascript
   const authLogger = Logger.child({ module: 'Auth' });
   const apiLogger = Logger.child({ module: 'API' });
   ```
