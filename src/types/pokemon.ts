export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  order: number;
  is_default: boolean;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    front_female: string | null;
    front_shiny_female: string | null;
    back_default: string | null;
    back_shiny: string | null;
    back_female: string | null;
    back_shiny_female: string | null;
    other: {
      'official-artwork': {
        front_default: string | null;
        front_shiny: string | null;
      };
    };
  };
  abilities: Array<{
    ability: {
      name: string;
      url: string;
    };
    is_hidden: boolean;
    slot: number;
  }>;
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: {
      name: string;
      url: string;
    };
  }>;
  types: Array<{
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }>;
  species: {
    name: string;
    url: string;
  };
}

export interface PokemonType {
  id: number;
  name: string;
  damage_relations: {
    no_damage_to: Array<{ name: string; url: string }>;
    half_damage_to: Array<{ name: string; url: string }>;
    double_damage_to: Array<{ name: string; url: string }>;
    no_damage_from: Array<{ name: string; url: string }>;
    half_damage_from: Array<{ name: string; url: string }>;
    double_damage_from: Array<{ name: string; url: string }>;
  };
  pokemon: Array<{
    pokemon: {
      name: string;
      url: string;
    };
    slot: number;
  }>;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  gender_rate: number;
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number;
  has_gender_differences: boolean;
  forms_switchable: boolean;
  growth_rate: {
    name: string;
    url: string;
  };
  pokedex_numbers: Array<{
    entry_number: number;
    pokedex: {
      name: string;
      url: string;
    };
  }>;
  egg_groups: Array<{
    name: string;
    url: string;
  }>;
  color: {
    name: string;
    url: string;
  };
  shape: {
    name: string;
    url: string;
  };
  evolves_from_species: {
    name: string;
    url: string;
  } | null;
  evolution_chain: {
    url: string;
  };
  habitat: {
    name: string;
    url: string;
  } | null;
  generation: {
    name: string;
    url: string;
  };
  names: Array<{
    name: string;
    language: {
      name: string;
      url: string;
    };
  }>;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
      url: string;
    };
    version: {
      name: string;
      url: string;
    };
  }>;
}

export interface EvolutionChain {
  id: number;
  baby_trigger_item: any | null;
  chain: {
    is_baby: boolean;
    species: {
      name: string;
      url: string;
    };
    evolution_details: Array<{
      item: any | null;
      trigger: {
        name: string;
        url: string;
      };
      gender: number | null;
      held_item: any | null;
      known_move: any | null;
      known_move_type: any | null;
      location: any | null;
      min_level: number | null;
      min_happiness: number | null;
      min_beauty: number | null;
      min_affection: number | null;
      needs_overworld_rain: boolean;
      party_species: any | null;
      party_type: any | null;
      relative_physical_stats: number | null;
      time_of_day: string;
      trade_species: any | null;
      turn_upside_down: boolean;
    }>;
    evolves_to: Array<any>;
  };
}

// ===== SUGGESTIONS DATA INTERFACES =====

/**
 * Individual Pokemon entry in suggestions data
 * (Different from main Pokemon interface - simpler structure for suggestions)
 */
export interface PokemonSuggestion {
  /** Unique identifier for the Pokemon */
  id: number;
  /** Pokemon name in lowercase (from API) */
  name: string;
  /** Display name for UI (usually same as name) */
  displayName: string;
}

/**
 * Metadata information for the suggestions dataset
 */
export interface SuggestionsMetadata {
  /** ISO timestamp when data was generated */
  generatedAt: string;
  /** Total number of Pokemon in the dataset */
  totalCount: number;
  /** Pokemon generation (1 for Gen 1) */
  generation: number;
  /** Human-readable description of the dataset */
  description: string;
}

/**
 * Complete suggestions data structure loaded from JSON
 */
export interface SuggestionsData {
  /** Metadata about the dataset */
  metadata: SuggestionsMetadata;
  /** Array of Pokemon entries for suggestions */
  pokemon: PokemonSuggestion[];
}

/**
 * Configuration options for Pokemon suggestions
 */
export interface SuggestionConfig {
  /** Minimum query length required */
  minQueryLength: number;
  /** Maximum number of suggestions to return */
  maxSuggestions: number;
  /** Timeout for suggestion operations (ms) */
  timeoutMs: number;
}

// ===== TEST DATA INTERFACES =====

/**
 * Options for suggestion query validation in tests
 */
export interface SuggestionValidationOptions {
  /** Minimum expected count of results */
  minCount?: number;
  /** Maximum expected count of results */
  maxCount?: number;
  /** Pokemon names that should be included in results */
  shouldContain?: string[];
  /** Pokemon names that should NOT be included in results */
  shouldNotContain?: string[];
  /** Whether empty results are acceptable */
  allowEmpty?: boolean;
}

/**
 * Test case data structure for data-driven testing
 */
export interface TestCase<T = any> {
  /** Descriptive name for the test case */
  name: string;
  /** Test data payload */
  data: T;
}

/**
 * Query test data structure
 */
export interface QueryTestData {
  /** Search query string */
  query: string;
  /** Expected Pokemon names in results */
  expectedResults: string[];
  /** Minimum expected result count */
  minExpectedCount: number;
  /** Maximum expected result count */
  maxExpectedCount: number;
  /** Human-readable description of what this test validates */
  description: string;
}

/**
 * Invalid query test data structure
 */
export interface InvalidQueryTestData {
  /** Invalid search query */
  query: string;
  /** Expected count (usually 0 for invalid queries) */
  expectedCount: number;
  /** Description of why this query is invalid */
  description: string;
}

/**
 * Performance test result
 */
export interface PerformanceResult<T> {
  /** The actual result from the operation */
  result: T;
  /** Time taken in milliseconds */
  executionTime: number;
  /** Whether the operation completed within acceptable time */
  withinTimeLimit: boolean;
}
