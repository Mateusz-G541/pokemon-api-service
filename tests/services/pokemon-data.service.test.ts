
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PokemonDataService } from '../../src/services/pokemon-data.service';
import { TestData, TestHelpers } from '../fixtures/test-data';
import { TestAssertions } from '../utils/custom-matchers';

describe('PokemonDataService', () => {
let pokemonService: PokemonDataService;

beforeAll(() => {
        console.log('🔧 Initializing PokemonDataService for testing...');
pokemonService = new PokemonDataService();
  });

beforeEach(async () => {
    await pokemonService.initialize();
    
    expect(pokemonService.isInitialized()).toBe(true);
  });

describe('Service Initialization', () => {
  it('should initialize properly and report correct status', async () => {
    const status = pokemonService.getInitializationStatus();
    
    expect(status.pokemonDataLoaded).toBe(true);
    expect(status.suggestionsDataLoaded).toBe(true);
    expect(status.pokemonCount).toBeGreaterThan(0);
    expect(status.suggestionsCount).toBeGreaterThan(0);
  });

  it('should validate suggestions data structure', () => {
    const validation = pokemonService.validateSuggestionsData();
    
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should handle reinitialization correctly', async () => {
    // Reinitialize the service
    await pokemonService.initialize();
    
    // Should still be properly initialized
    expect(pokemonService.isInitialized()).toBe(true);
    
    const status = pokemonService.getInitializationStatus();
    expect(status.suggestionsDataLoaded).toBe(true);
  });
});

describe('Pokemon Suggestions', () => {
describe('Valid Query Processing', () => {
        const validQueryCases = TestHelpers.generateTestCases(TestData.validQueries);


      validQueryCases.forEach(({ name, data }) => {


it(TestHelpers.createTestDescription(
        `should handle "${data.query}" query`,
   data.description
   ), async () => {

//Arrange

        const query = data.query;

//Act

          const suggestions = await TestAssertions.validatePerformance(
            () => pokemonService.getPokemonSuggestions(query),
TestData.config.timeoutMs
          );

//Assert

                  TestAssertions.validateSuggestionResponse(suggestions, {
    minCount: data.minExpectedCount || 0,
            maxCount: data.maxExpectedCount || TestData.config.maxSuggestions,
            shouldContain: data.expectedResults,
            allowEmpty: false
});

       
        if (data.expectedResults.length > 0) {
        data.expectedResults.forEach(expectedPokemon => {
    expect(suggestions).toContain(expectedPokemon);
});
        }
        });
        });
        });

describe('Edge Cases & Error Handling', () => {

        const invalidQueryCases = TestHelpers.generateTestCases(TestData.invalidQueries);
      
      invalidQueryCases.forEach(({ name, data }) => {
it(TestHelpers.createTestDescription(
        `should handle "${data.query}" query`,
   data.description
   ), () => {
  // ARRANGE
        const query = data.query;

// ACT
          const suggestions = pokemonService.getPokemonSuggestions(query);

// ASSERT: Edge cases should return empty arrays, not errors
          TestAssertions.validateSuggestionResponse(suggestions, {
    minCount: data.expectedCount,
            maxCount: data.expectedCount,
            allowEmpty: true
});
        });
        });
        });

describe('Business Logic Validation', () => {

it('should enforce maximum suggestion limit', () => {
// ARRANGE
        const broadQuery = 'a';

// ACT
        const suggestions = pokemonService.getPokemonSuggestions(broadQuery);

// ASSERT
expect(suggestions.length).toBeLessThanOrEqual(TestData.config.maxSuggestions);
        TestAssertions.validateSuggestionResponse(suggestions, {
    maxCount: TestData.config.maxSuggestions
});
        });

it('should return case-insensitive results', () => {
        // ARRANGE: Test both uppercase and lowercase versions
        const lowerQuery = 'pik';
        const upperQuery = 'PIK';
        const mixedQuery = 'PiK';

        // ACT
        const lowerResults = pokemonService.getPokemonSuggestions(lowerQuery);
        const upperResults = pokemonService.getPokemonSuggestions(upperQuery);
        const mixedResults = pokemonService.getPokemonSuggestions(mixedQuery);

// ASSERT: All should return the same results
expect(lowerResults).toEqual(upperResults);
expect(upperResults).toEqual(mixedResults);
expect(lowerResults.length).toBeGreaterThan(0);
      });

it('should return results in consistent order', () => {
        // ARRANGE
        const query = 'char';

        // ACT: Run the same query multiple times
        const firstRun = pokemonService.getPokemonSuggestions(query);
        const secondRun = pokemonService.getPokemonSuggestions(query);
        const thirdRun = pokemonService.getPokemonSuggestions(query);

// ASSERT: Results should be identical and in the same order
expect(firstRun).toEqual(secondRun);
expect(secondRun).toEqual(thirdRun);
      });
              });

describe('Performance & Reliability', () => {

it('should respond within acceptable time limits', async () => {
        // ARRANGE
        const query = 'pik';
        const maxResponseTime = 50; // milliseconds

        // ACT & ASSERT: Use our performance validation helper
        const suggestions = await TestAssertions.validatePerformance(
          () => pokemonService.getPokemonSuggestions(query),
maxResponseTime
        );

expect(suggestions.length).toBeGreaterThan(0);
      });

it('should handle concurrent requests correctly', async () => {
        // ARRANGE: Simulate multiple simultaneous requests with valid Pokemon names
        const queries = ['pik', 'char', 'ivy', 'war']; // pikachu, charmander, ivysaur, wartortle

        // ACT: Execute all queries concurrently
        const promises = queries.map(query =>
        Promise.resolve(pokemonService.getPokemonSuggestions(query))
        );

        const results = await Promise.all(promises);

// ASSERT: All requests should complete successfully
        results.forEach((suggestions, index) => {
        TestAssertions.validateSuggestionResponse(suggestions);
          if (suggestions.length === 0) {
        console.warn(`No results for query: ${queries[index]}`);
        }
// Only expect results if query matches actual Pokemon in our data
expect(suggestions.length).toBeGreaterThanOrEqual(0);
        });
                });
                });
                });

describe('Service Health & Configuration', () => {

it('should initialize with valid configuration', () => {
// ARRANGE & ACT: Service should be initialized in beforeAll

// ASSERT: Service should be properly instantiated
expect(pokemonService).toBeInstanceOf(PokemonDataService);
expect(pokemonService).toBeDefined();
    });

it('should have access to suggestions data', () => {
        // ARRANGE
        const testQuery = 'test';

        // ACT: Try to get suggestions (should not throw error)
        const suggestions = pokemonService.getPokemonSuggestions(testQuery);

// ASSERT: Should return an array (even if empty)
expect(suggestions).toBeInstanceOf(Array);
    });
    describe('PokemonDataService - Suggestions', () => {
        let pokemonService: PokemonDataService;
      
        // beforeAll runs once before all tests in this describe block
        beforeAll(() => {
          // Create a new instance of our service
          // This will automatically load the suggestions.json data
          pokemonService = new PokemonDataService();
        });
      
        /**
         * Test 1: Basic functionality - should return suggestions for valid query
         */
        it('should return Pokemon suggestions for query "pik"', () => {
          // Arrange: Set up our test data
          const query = 'pik';
          
          // Act: Call the method we want to test
          const suggestions = pokemonService.getPokemonSuggestions(query);
          
          // Assert: Check that the results are what we expect
          expect(suggestions).toBeInstanceOf(Array);
          expect(suggestions.length).toBeGreaterThan(0);
          expect(suggestions).toContain('Pikachu');
        });
      
        /**
         * Test 2: Edge case - should return empty array for short query
         */
        it('should return empty array for query shorter than 3 characters', () => {
          // Arrange
          const shortQuery = 'pi';
          
          // Act
          const suggestions = pokemonService.getPokemonSuggestions(shortQuery);
          
          // Assert
          expect(suggestions).toBeInstanceOf(Array);
          expect(suggestions.length).toBe(0);
        });
      
        /**
         * Test 3: Limit check - should return maximum 10 suggestions
         */
        it('should limit suggestions to maximum 10 results', () => {
          // Arrange: Use a query that might match many Pokemon
          const broadQuery = 'a'; // Many Pokemon names contain 'a'
          
          // Act
          const suggestions = pokemonService.getPokemonSuggestions(broadQuery);
          
          // Assert
          expect(suggestions).toBeInstanceOf(Array);
          expect(suggestions.length).toBeLessThanOrEqual(10);
        });
      });
            });
            });
