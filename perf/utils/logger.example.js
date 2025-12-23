/**
 * Logger Usage Examples
 * 
 * This file demonstrates various ways to use the Logger utility in k6 tests.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Logger } from './logger.js';

export const options = {
  vus: 2,
  iterations: 5
};

// Example 1: Basic Logging
export function basicLogging() {
  Logger.debug('This is a debug message');
  Logger.info('This is an info message');
  Logger.warn('This is a warning message');
  Logger.error('This is an error message');
}

// Example 2: Logging with Data
export function loggingWithData() {
  const userData = {
    id: 123,
    name: 'John Doe',
    email: 'john@example.com'
  };
  
  Logger.info('User data loaded', userData);
  Logger.debug('Processing user', { userId: userData.id });
}

// Example 3: HTTP Request/Response Logging
export function httpLogging() {
  const url = 'https://api.example.com/data';
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123'
    },
    tags: { endpoint: 'data' }
  };
  
  // Log request
  Logger.logRequest('GET', url, params);
  
  const response = http.get(url, params);
  
  // Log response
  Logger.logResponse(response);
  
  // Or log both together
  // Logger.logHTTP('GET', url, params, response);
}

// Example 4: Conditional Logging (VU-specific)
export function conditionalLogging() {
  // Log only for VU 1
  Logger.logForVU(1, 'INFO', 'This only appears for VU 1');
  
  // Log only for first iteration
  Logger.logForIteration(0, 'INFO', 'This only appears for iteration 0');
  
  // Log every 10 iterations
  Logger.logEveryN(10, 'INFO', 'This appears every 10 iterations');
}

// Example 5: Child Logger with Context
export function childLogger() {
  const userLogger = Logger.child({ module: 'UserService' });
  userLogger.info('User logged in');
  userLogger.debug('Fetching user profile');
  
  const orderLogger = Logger.child({ module: 'OrderService', orderId: 'ORD-123' });
  orderLogger.info('Processing order');
  orderLogger.warn('Low stock detected');
}

// Example 6: Real-World Test Scenario
export default function () {
  Logger.info('Starting test iteration');
  
  // Login
  if (__ITER === 0) {
    Logger.debug('First iteration - performing login');
    
    const loginRes = http.post('https://api.example.com/login', 
      JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
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
  const dataRes = http.get('https://api.example.com/data');
  
  if (dataRes.status !== 200) {
    Logger.error('Data fetch failed', {
      status: dataRes.status,
      url: dataRes.url,
      duration: dataRes.timings.duration
    });
  } else {
    Logger.debug('Data fetched successfully', {
      duration: dataRes.timings.duration,
      bodySize: dataRes.body.length
    });
  }
  
  // Log slow requests
  if (dataRes.timings.duration > 1000) {
    Logger.warn('Slow request detected', {
      url: dataRes.url,
      duration: dataRes.timings.duration,
      breakdown: {
        blocked: dataRes.timings.blocked,
        connecting: dataRes.timings.connecting,
        waiting: dataRes.timings.waiting,
        receiving: dataRes.timings.receiving
      }
    });
  }
  
  sleep(1);
  Logger.info('Iteration complete');
}

// Example 7: Different Log Formats
export function logFormats() {
  // Run with: k6 run -e LOG_FORMAT=JSON script.js
  // Output: {"level":"INFO","message":"JSON format","timestamp":"...","vu":1,"iteration":0}
  
  // Run with: k6 run -e LOG_FORMAT=TEXT script.js
  // Output: [2024-01-15T10:30:00.000Z] [INFO] [VU1] [Iter0] TEXT format
  
  Logger.info('This message format depends on LOG_FORMAT env var');
}

// Example 8: Different Log Levels
export function logLevels() {
  // Run with: k6 run -e LOG_LEVEL=DEBUG script.js
  // Shows: DEBUG, INFO, WARN, ERROR
  
  // Run with: k6 run -e LOG_LEVEL=INFO script.js
  // Shows: INFO, WARN, ERROR (DEBUG hidden)
  
  // Run with: k6 run -e LOG_LEVEL=WARN script.js
  // Shows: WARN, ERROR (DEBUG and INFO hidden)
  
  // Run with: k6 run -e LOG_LEVEL=ERROR script.js
  // Shows: ERROR only
  
  Logger.debug('Debug message');
  Logger.info('Info message');
  Logger.warn('Warning message');
  Logger.error('Error message');
}
