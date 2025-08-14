import { 
  QueryTestData, 
  InvalidQueryTestData, 
  SuggestionConfig 
} from '../../src/types/pokemon';

export const TestData = {

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
      expectedResults: ['Charmander', 'Charmeleon', 'Charizard'],  
      minExpectedCount: 3,
      maxExpectedCount: 10,
      description: 'Should find Charmander evolution line'
    },
    broad: {
      query: 'war', 
      expectedResults: ['Wartortle'],
      minExpectedCount: 1,
      maxExpectedCount: 10,
      description: 'Should find Pokemon matching 3+ character query'
    }
  },

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


  config: {
    maxSuggestions: 10,
    minQueryLength: 3,
    timeoutMs: 5000,
    retryAttempts: 3
  }
};

export const TestHelpers = {

  validateSuggestionsArray: (suggestions: unknown): suggestions is string[] => {
    return Array.isArray(suggestions) && 
           suggestions.every(item => typeof item === 'string');
  },

  createTestDescription: (scenario: string, expected: string): string => {
    return `${scenario} - ${expected}`;
  },

  generateTestCases: <T>(data: Record<string, T>) => {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      data: value
    }));
  }
};
