/**
 * Logger Utility for k6 Performance Tests
 * 
 * Provides structured logging with different log levels and context information.
 * Supports environment-based log level control and VU/iteration context.
 * 
 * Usage:
 *   import { Logger } from './utils/logger.js';
 *   
 *   Logger.debug('Detailed debug information');
 *   Logger.info('General information');
 *   Logger.warn('Warning message');
 *   Logger.error('Error message');
 * 
 * Environment Variables:
 *   LOG_LEVEL - Set minimum log level (DEBUG, INFO, WARN, ERROR)
 *   LOG_FORMAT - Set log format (JSON, TEXT)
 *   LOG_TIMESTAMP - Enable/disable timestamps (true, false)
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'NONE'
};

class K6Logger {
  constructor() {
    // Get log level from environment (default: INFO)
    const envLevel = (__ENV.LOG_LEVEL || 'INFO').toUpperCase();
    this.minLevel = LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.INFO;
    
    // Get log format from environment (default: TEXT)
    this.format = (__ENV.LOG_FORMAT || 'TEXT').toUpperCase();
    
    // Get timestamp setting from environment (default: true)
    this.includeTimestamp = __ENV.LOG_TIMESTAMP !== 'false';
    
    // Get VU context setting (default: true)
    this.includeContext = __ENV.LOG_CONTEXT !== 'false';
  }

  /**
   * Format log message based on configuration
   */
  _formatMessage(level, message, data = null) {
    const levelName = LOG_LEVEL_NAMES[level];
    
    if (this.format === 'JSON') {
      return this._formatJSON(levelName, message, data);
    } else {
      return this._formatText(levelName, message, data);
    }
  }

  /**
   * Format message as JSON
   */
  _formatJSON(level, message, data) {
    const logEntry = {
      level,
      message
    };

    if (this.includeTimestamp) {
      logEntry.timestamp = new Date().toISOString();
    }

    if (this.includeContext) {
      logEntry.vu = __VU;
      logEntry.iteration = __ITER;
    }

    if (data !== null) {
      logEntry.data = data;
    }

    return JSON.stringify(logEntry);
  }

  /**
   * Format message as text
   */
  _formatText(level, message, data) {
    const parts = [];

    if (this.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    parts.push(`[${level}]`);

    if (this.includeContext) {
      parts.push(`[VU${__VU}]`);
      parts.push(`[Iter${__ITER}]`);
    }

    parts.push(message);

    if (data !== null) {
      if (typeof data === 'object') {
        parts.push(JSON.stringify(data));
      } else {
        parts.push(String(data));
      }
    }

    return parts.join(' ');
  }

  /**
   * Log at DEBUG level
   */
  debug(message, data = null) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      console.log(this._formatMessage(LOG_LEVELS.DEBUG, message, data));
    }
  }

  /**
   * Log at INFO level
   */
  info(message, data = null) {
    if (this.minLevel <= LOG_LEVELS.INFO) {
      console.log(this._formatMessage(LOG_LEVELS.INFO, message, data));
    }
  }

  /**
   * Log at WARN level
   */
  warn(message, data = null) {
    if (this.minLevel <= LOG_LEVELS.WARN) {
      console.warn(this._formatMessage(LOG_LEVELS.WARN, message, data));
    }
  }

  /**
   * Log at ERROR level
   */
  error(message, data = null) {
    if (this.minLevel <= LOG_LEVELS.ERROR) {
      console.error(this._formatMessage(LOG_LEVELS.ERROR, message, data));
    }
  }

  /**
   * Log HTTP request details
   */
  logRequest(method, url, params = {}) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      const requestInfo = {
        method,
        url,
        headers: params.headers || {},
        tags: params.tags || {}
      };

      if (params.body) {
        requestInfo.bodyLength = params.body.length;
      }

      this.debug('HTTP Request', requestInfo);
    }
  }

  /**
   * Log HTTP response details
   */
  logResponse(response) {
    if (this.minLevel <= LOG_LEVELS.DEBUG) {
      const responseInfo = {
        status: response.status,
        statusText: response.status_text,
        url: response.url,
        duration: response.timings.duration,
        bodyLength: response.body ? response.body.length : 0
      };

      if (response.status >= 400) {
        this.error('HTTP Response Error', responseInfo);
      } else {
        this.debug('HTTP Response', responseInfo);
      }
    }
  }

  /**
   * Log HTTP request and response together
   */
  logHTTP(method, url, params, response) {
    this.logRequest(method, url, params);
    this.logResponse(response);
  }

  /**
   * Log only for specific VU
   */
  logForVU(vu, level, message, data = null) {
    if (__VU === vu) {
      switch (level.toUpperCase()) {
        case 'DEBUG':
          this.debug(message, data);
          break;
        case 'INFO':
          this.info(message, data);
          break;
        case 'WARN':
          this.warn(message, data);
          break;
        case 'ERROR':
          this.error(message, data);
          break;
      }
    }
  }

  /**
   * Log only for specific iteration
   */
  logForIteration(iteration, level, message, data = null) {
    if (__ITER === iteration) {
      switch (level.toUpperCase()) {
        case 'DEBUG':
          this.debug(message, data);
          break;
        case 'INFO':
          this.info(message, data);
          break;
        case 'WARN':
          this.warn(message, data);
          break;
        case 'ERROR':
          this.error(message, data);
          break;
      }
    }
  }

  /**
   * Log every N iterations
   */
  logEveryN(n, level, message, data = null) {
    if (__ITER % n === 0) {
      switch (level.toUpperCase()) {
        case 'DEBUG':
          this.debug(message, data);
          break;
        case 'INFO':
          this.info(message, data);
          break;
        case 'WARN':
          this.warn(message, data);
          break;
        case 'ERROR':
          this.error(message, data);
          break;
      }
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context) {
    const childLogger = new K6Logger();
    childLogger.context = context;
    
    const originalFormatText = childLogger._formatText.bind(childLogger);
    childLogger._formatText = (level, message, data) => {
      const contextStr = typeof context === 'object' 
        ? JSON.stringify(context) 
        : String(context);
      return originalFormatText(level, `[${contextStr}] ${message}`, data);
    };

    const originalFormatJSON = childLogger._formatJSON.bind(childLogger);
    childLogger._formatJSON = (level, message, data) => {
      const logEntry = JSON.parse(originalFormatJSON(level, message, data));
      logEntry.context = context;
      return JSON.stringify(logEntry);
    };

    return childLogger;
  }
}

// Export singleton instance
export const Logger = new K6Logger();

// Export class for custom instances
export { K6Logger };

// Export log levels for external use
export { LOG_LEVELS };
