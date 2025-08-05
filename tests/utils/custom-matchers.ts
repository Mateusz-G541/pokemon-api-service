/**
 * Custom Test Matchers & Assertions
 * 
 * WHY: Custom matchers make tests more readable and maintainable by:
 * 1. Encapsulating complex assertion logic
 * 2. Providing domain-specific test language
 * 3. Reducing code duplication across tests
 * 4. Making test failures more descriptive
 */

import { expect } from 'vitest';
import { 
  SuggestionValidationOptions, 
  PerformanceResult 
} from '../../src/types/pokemon';

/**
 * Custom matcher for validating Pokemon suggestion arrays
 * 
 * WHY: Instead of writing the same validation logic in every test,
 * we create a reusable matcher that clearly expresses our intent
 */
export const customMatchers = {
  /**
   * Validates that the value is a proper suggestions array
   * Usage: expect(suggestions).toBeValidSuggestionArray()
   */
  toBeValidSuggestionArray(received: unknown) {
    const pass = Array.isArray(received) && 
                 received.every(item => typeof item === 'string' && item.length > 0);
    
    return {
      pass,
      message: () => pass 
        ? `Expected ${received} not to be a valid suggestion array`
        : `Expected ${received} to be a valid suggestion array (array of non-empty strings)`
    };
  },

  /**
   * Validates suggestions count is within expected limits
   * Usage: expect(suggestions).toHaveValidSuggestionCount(maxCount)
   */
  toHaveValidSuggestionCount(received: unknown[], maxCount: number = 10) {
    const pass = Array.isArray(received) && 
                 received.length >= 0 && 
                 received.length <= maxCount;
    
    return {
      pass,
      message: () => pass
        ? `Expected ${received.length} not to be within valid range (0-${maxCount})`
        : `Expected ${received.length} to be within valid range (0-${maxCount})`
    };
  },

  /**
   * Validates that suggestions contain expected Pokemon names
   * Usage: expect(suggestions).toContainPokemon(['Pikachu', 'Pichu'])
   */
  toContainPokemon(received: string[], expectedPokemon: string[]) {
    const receivedLower = received.map(name => name.toLowerCase());
    const expectedLower = expectedPokemon.map(name => name.toLowerCase());
    const containsAll = expectedLower.every(pokemon => 
      receivedLower.some(suggestion => suggestion.includes(pokemon.toLowerCase()))
    );
    
    return {
      pass: containsAll,
      message: () => containsAll
        ? `Expected suggestions not to contain ${expectedPokemon.join(', ')}`
        : `Expected suggestions to contain ${expectedPokemon.join(', ')}, but got ${received.join(', ')}`
    };
  }
};

/**
 * Test Assertion Helpers
 * 
 * WHY: These helpers provide high-level assertions that combine
 * multiple checks into semantic, business-logic focused validations
 */
export class TestAssertions {
  /**
   * Comprehensive validation for suggestion responses
   * 
   * WHY: Instead of writing 5-6 separate assertions in each test,
   * we have one method that validates all aspects of a proper response
   */
  static validateSuggestionResponse(
    suggestions: unknown,
    options: {
      minCount?: number;
      maxCount?: number;
      shouldContain?: string[];
      shouldNotContain?: string[];
      allowEmpty?: boolean;
    } = {}
  ) {
    const {
      minCount = 0,
      maxCount = 10,
      shouldContain = [],
      shouldNotContain = [],
      allowEmpty = true
    } = options;

    // Basic type validation
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions).toSatisfy((arr: unknown[]) => 
      arr.every(item => typeof item === 'string')
    );

    const suggestionsArray = suggestions as string[];

    // Count validation
    expect(suggestionsArray.length).toBeGreaterThanOrEqual(minCount);
    expect(suggestionsArray.length).toBeLessThanOrEqual(maxCount);

    // Content validation
    if (shouldContain.length > 0) {
      shouldContain.forEach(pokemon => {
        expect(suggestionsArray.some(suggestion => 
          suggestion.toLowerCase().includes(pokemon.toLowerCase())
        )).toBe(true);
      });
    }

    if (shouldNotContain.length > 0) {
      shouldNotContain.forEach(pokemon => {
        expect(suggestionsArray.some(suggestion => 
          suggestion.toLowerCase().includes(pokemon.toLowerCase())
        )).toBe(false);
      });
    }

    // Empty validation
    if (!allowEmpty && suggestionsArray.length === 0) {
      throw new Error('Expected non-empty suggestions array');
    }

    return suggestionsArray;
  }

  /**
   * Validates error responses have proper structure
   */
  static validateErrorResponse(error: unknown, expectedMessage?: string) {
    expect(error).toBeInstanceOf(Error);
    
    if (expectedMessage) {
      expect((error as Error).message).toContain(expectedMessage);
    }
  }

  /**
   * Performance assertion helper
   * 
   * WHY: In production systems, we need to ensure our functions
   * perform within acceptable time limits
   */
  static async validatePerformance<T>(
    operation: () => T | Promise<T>,
    maxTimeMs: number = 100
  ): Promise<T> {
    const startTime = Date.now();
    const result = await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThanOrEqual(maxTimeMs);
    
    return result;
  }
}
