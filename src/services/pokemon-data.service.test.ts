import { describe, it, expect, beforeAll } from 'vitest';
import { PokemonDataService } from './pokemon-data.service';

/**
 * Test suite for PokemonDataService
 * 
 * This is our first Vitest test - testing the suggestions functionality
 * that we just implemented with local JSON data.
 */
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
