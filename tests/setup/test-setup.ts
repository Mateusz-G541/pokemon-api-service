/**
 * Global Test Setup Configuration
 * 
 * WHY: Centralized test configuration ensures consistency across all tests
 * and makes it easy to modify global test behavior in one place.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

/**
 * Global test environment setup
 * Runs once before all tests across all files
 */
beforeAll(() => {
  console.log('🧪 Starting Pokemon API Service Test Suite');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  
  // Suppress console logs during tests (optional)
  // console.log = vi.fn();
});

/**
 * Global test environment cleanup
 * Runs once after all tests are completed
 */
afterAll(() => {
  console.log('✅ Pokemon API Service Test Suite Completed');
});

/**
 * Per-test setup
 * Runs before each individual test
 */
beforeEach(() => {
  // Reset any global state if needed
  // Clear mocks, reset databases, etc.
});

/**
 * Per-test cleanup
 * Runs after each individual test
 */
afterEach(() => {
  // Clean up after each test
  // This ensures tests don't affect each other
});
