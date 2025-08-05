/**
 * Test Data Fixtures
 * 
 * WHY: Centralized test data management ensures:
 * 1. Consistency - All tests use the same reference data
 * 2. Maintainability - Change test data in one place
 * 3. Reusability - Share data across multiple test files
 * 4. Type Safety - TypeScript ensures data structure correctness
 */

import { 
  QueryTestData, 
  InvalidQueryTestData, 
  SuggestionConfig 
} from '../../src/types/pokemon';

export const TestData = {
  /**
   * Valid search queries for testing suggestions
   * WHY: Having predefined queries ensures we test known scenarios
   */
  validQueries: {
    pikachu: {
      query: 'pik',
      expectedResults: ['Pikachu'],  // Service capitalizes Pokemon names
      minExpectedCount: 1,
      maxExpectedCount: 10,
      description: 'Should find Pikachu-related Pokemon'
    },
    charmander: {
      query: 'char',
      expectedResults: ['Charmander', 'Charmeleon', 'Charizard'],  // Service capitalizes
      minExpectedCount: 3,
      maxExpectedCount: 10,
      description: 'Should find Charmander evolution line'
    },
    broad: {
      query: 'war',  // wartortle - 3+ characters, exists in data
      expectedResults: ['Wartortle'],  // Service capitalizes
      minExpectedCount: 1,
      maxExpectedCount: 10,
      description: 'Should find Pokemon matching 3+ character query'
    }
  },

  /**
   * Invalid/Edge case queries
   * WHY: Testing edge cases ensures robust error handling
   */
  invalidQueries: {
    tooShort: {
      query: 'pi',
      expectedCount: 0,
      description: 'Should return empty for queries shorter than 3 characters'
    },
    empty: {
      query: '',
      expectedCount: 0,
      description: 'Should handle empty query gracefully'
    },
    nonExistent: {
      query: 'xyz',
      expectedCount: 0,
      description: 'Should return empty for non-existent Pokemon'
    },
    specialChars: {
      query: '!@#',
      expectedCount: 0,
      description: 'Should handle special characters gracefully'
    }
  },

  /**
   * Expected API response structures
   * WHY: Defines the contract our API should follow
   */
  apiResponses: {
    successfulSuggestion: {
      statusCode: 200,
      contentType: 'application/json',
      bodyType: 'array',
      description: 'Standard successful suggestion response'
    },
    badRequest: {
      statusCode: 400,
      contentType: 'application/json',
      bodyStructure: { error: 'string' },
      description: 'Bad request error response'
    },
    serverError: {
      statusCode: 500,
      contentType: 'application/json',
      bodyStructure: { error: 'string' },
      description: 'Internal server error response'
    }
  },

  /**
   * Test configuration constants
   * WHY: Centralized configuration makes tests easier to maintain
   */
  config: {
    maxSuggestions: 10,
    minQueryLength: 3,
    timeoutMs: 5000,
    retryAttempts: 3
  }
};

/**
 * Test Helper Functions
 * WHY: Reusable functions reduce code duplication and improve test readability
 */
export const TestHelpers = {
  /**
   * Validates that a suggestions array meets basic requirements
   */
  validateSuggestionsArray: (suggestions: unknown): suggestions is string[] => {
    return Array.isArray(suggestions) && 
           suggestions.every(item => typeof item === 'string');
  },

  /**
   * Creates a test description with context
   */
  createTestDescription: (scenario: string, expected: string): string => {
    return `${scenario} - ${expected}`;
  },

  /**
   * Generates test cases from data
   * WHY: Data-driven testing allows us to run the same test logic with different inputs
   */
  generateTestCases: <T>(data: Record<string, T>) => {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      data: value
    }));
  }
};
