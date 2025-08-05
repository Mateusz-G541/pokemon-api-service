import fs from 'fs';
import path from 'path';
import { 
  Pokemon, 
  PokemonType, 
  PokemonSpecies, 
  EvolutionChain,
  SuggestionsData,
  PokemonSuggestion
} from '../types/pokemon';

// Custom Error Classes for better error handling
class DataLoadError extends Error {
  constructor(message: string, public filePath?: string, public originalError?: Error) {
    super(message);
    this.name = 'DataLoadError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public validationErrors?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ServiceNotInitializedError extends Error {
  constructor(message: string = 'Service is not properly initialized') {
    super(message);
    this.name = 'ServiceNotInitializedError';
  }
}

export class PokemonDataService {
  private readonly dataDir: string;
  private pokemonData: Pokemon[] = [];
  private speciesData: PokemonSpecies[] = [];
  private evolutionChains: EvolutionChain[] = [];
  private typeData: PokemonType[] = [];
  private suggestionsData: SuggestionsData | null = null;

  constructor() {
    this.dataDir = path.join(__dirname, '..', '..', 'data');
    this.loadData();
  }

  /**
   * Public method to initialize/reload data
   * This method is safe for tests to call and provides proper encapsulation
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔄 Initializing Pokemon data service...');
        this.loadData();
        
        // Verify critical data is loaded
        if (this.pokemonData.length === 0) {
          throw new ServiceNotInitializedError('No Pokemon data loaded - service cannot function');
        }
        
        console.log('✅ Pokemon data service initialized successfully');
        resolve();
      } catch (error) {
        console.error('💥 Failed to initialize Pokemon data service:', error);
        reject(error instanceof Error ? error : new Error('Unknown initialization error'));
      }
    });
  }

  /**
   * Check if the service is properly initialized with data
   */
  isInitialized(): boolean {
    return this.pokemonData.length > 0 || 
           this.suggestionsData !== null;
  }

  /**
   * Get initialization status with detailed information
   * Useful for tests to verify what data is loaded
   */
  getInitializationStatus(): {
    pokemonDataLoaded: boolean;
    suggestionsDataLoaded: boolean;
    pokemonCount: number;
    suggestionsCount: number;
  } {
    return {
      pokemonDataLoaded: this.pokemonData.length > 0,
      suggestionsDataLoaded: this.suggestionsData !== null,
      pokemonCount: this.pokemonData.length,
      suggestionsCount: this.suggestionsData?.pokemon?.length || 0
    };
  }

  /**
   * Validate suggestions data structure
   * Useful for tests to ensure data integrity
   */
  validateSuggestionsData(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.suggestionsData) {
      errors.push('Suggestions data is not loaded');
      return { isValid: false, errors };
    }
    
    if (!this.suggestionsData.metadata) {
      errors.push('Missing metadata in suggestions data');
    }
    
    if (!Array.isArray(this.suggestionsData.pokemon)) {
      errors.push('Pokemon array is missing or invalid');
    } else {
      // Validate each Pokemon entry
      this.suggestionsData.pokemon.forEach((pokemon, index) => {
        if (!pokemon.id || typeof pokemon.id !== 'number') {
          errors.push(`Pokemon at index ${index} has invalid id`);
        }
        if (!pokemon.name || typeof pokemon.name !== 'string') {
          errors.push(`Pokemon at index ${index} has invalid name`);
        }
        if (!pokemon.displayName || typeof pokemon.displayName !== 'string') {
          errors.push(`Pokemon at index ${index} has invalid displayName`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private loadData(): void {
    const errors: string[] = [];
    
    try {
      // Verify data directory exists
      if (!fs.existsSync(this.dataDir)) {
        throw new DataLoadError(`Data directory does not exist: ${this.dataDir}`);
      }

      // Load Pokemon data with error handling
      try {
        const pokemonPath = path.join(this.dataDir, 'pokemon.json');
        if (fs.existsSync(pokemonPath)) {
          const rawData = fs.readFileSync(pokemonPath, 'utf-8');
          this.pokemonData = JSON.parse(rawData);
          
          if (!Array.isArray(this.pokemonData)) {
            throw new ValidationError('Pokemon data must be an array');
          }
          
          console.log(`✅ Loaded ${this.pokemonData.length} Pokemon`);
        } else {
          errors.push('Pokemon data file not found');
          console.warn('⚠️ Pokemon data file not found');
        }
      } catch (error) {
        const errorMsg = `Failed to load Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        throw new DataLoadError(errorMsg, 'pokemon.json', error instanceof Error ? error : undefined);
      }

      // Load species data with error handling
      try {
        const speciesPath = path.join(this.dataDir, 'species.json');
        if (fs.existsSync(speciesPath)) {
          const rawData = fs.readFileSync(speciesPath, 'utf-8');
          this.speciesData = JSON.parse(rawData);
          
          if (!Array.isArray(this.speciesData)) {
            throw new ValidationError('Species data must be an array');
          }
          
          console.log(`✅ Loaded ${this.speciesData.length} species`);
        } else {
          errors.push('Species data file not found');
          console.warn('⚠️ Species data file not found');
        }
      } catch (error) {
        const errorMsg = `Failed to load species data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        // Don't throw for optional data, just log
      }

      // Load evolution chains with error handling
      try {
        const evolutionPath = path.join(this.dataDir, 'evolution-chains.json');
        if (fs.existsSync(evolutionPath)) {
          const rawData = fs.readFileSync(evolutionPath, 'utf-8');
          this.evolutionChains = JSON.parse(rawData);
          
          if (!Array.isArray(this.evolutionChains)) {
            throw new ValidationError('Evolution chains data must be an array');
          }
          
          console.log(`✅ Loaded ${this.evolutionChains.length} evolution chains`);
        } else {
          errors.push('Evolution chains data file not found');
          console.warn('⚠️ Evolution chains data file not found');
        }
      } catch (error) {
        const errorMsg = `Failed to load evolution chains: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        // Don't throw for optional data, just log
      }

      // Load type data with error handling
      try {
        const typePath = path.join(this.dataDir, 'types.json');
        if (fs.existsSync(typePath)) {
          const rawData = fs.readFileSync(typePath, 'utf-8');
          this.typeData = JSON.parse(rawData);
          
          if (!Array.isArray(this.typeData)) {
            throw new ValidationError('Type data must be an array');
          }
          
          console.log(`✅ Loaded ${this.typeData.length} types`);
        } else {
          errors.push('Type data file not found');
          console.warn('⚠️ Type data file not found');
        }
      } catch (error) {
        const errorMsg = `Failed to load type data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        // Don't throw for optional data, just log
      }

      // Load suggestions data with error handling (critical for suggestions feature)
      try {
        const suggestionsPath = path.join(this.dataDir, 'suggestions.json');
        if (fs.existsSync(suggestionsPath)) {
          const rawData = fs.readFileSync(suggestionsPath, 'utf-8');
          this.suggestionsData = JSON.parse(rawData);
          
          // Validate suggestions data structure
          if (!this.suggestionsData || !this.suggestionsData.pokemon || !Array.isArray(this.suggestionsData.pokemon)) {
            throw new ValidationError('Invalid suggestions data structure');
          }
          
          console.log(`✅ Loaded ${this.suggestionsData.pokemon.length} suggestions`);
        } else {
          errors.push('Suggestions data file not found');
          console.warn('⚠️ Suggestions data file not found - suggestions feature will not work');
        }
      } catch (error) {
        const errorMsg = `Failed to load suggestions data: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
        // Don't throw for suggestions data, but warn
        console.warn('⚠️ Suggestions feature will not be available');
      }

      // Summary logging
      if (errors.length > 0) {
        console.warn(`⚠️ Data loading completed with ${errors.length} warnings/errors:`);
        errors.forEach(error => console.warn(`  - ${error}`));
      } else {
        console.log('✅ All data loaded successfully');
      }
      
    } catch (error) {
      console.error('💥 Critical error during data loading:', error);
      throw error; // Re-throw critical errors
    }
  }

  // Transform image URLs to use local server
  private transformImageUrls(pokemon: Pokemon): Pokemon {
    const baseUrl = process.env.BASE_URL || 'http://srv36.mikr.us:20275';
    
    return {
      ...pokemon,
      sprites: {
        ...pokemon.sprites,
        front_default: pokemon.sprites.front_default 
          ? `${baseUrl}/images/pokemon/sprites/${pokemon.id}.png`
          : null,
        front_shiny: pokemon.sprites.front_shiny 
          ? `${baseUrl}/images/pokemon/sprites/shiny/${pokemon.id}.png`
          : null,
        back_default: pokemon.sprites.back_default 
          ? `${baseUrl}/images/pokemon/sprites/back/${pokemon.id}.png`
          : null,
        back_shiny: pokemon.sprites.back_shiny 
          ? `${baseUrl}/images/pokemon/sprites/back/shiny/${pokemon.id}.png`
          : null,
        other: {
          ...pokemon.sprites.other,
          'official-artwork': {
            front_default: `${baseUrl}/images/pokemon/official-artwork/${pokemon.id}.png`,
            front_shiny: null
          }
        }
      }
    };
  }

  // Get Pokemon by ID or name
  getPokemon(identifier: string | number): Pokemon | null {
    try {
      // Validate input
      if (identifier === null || identifier === undefined) {
        console.debug('Invalid identifier provided to getPokemon:', identifier);
        return null;
      }

      // Check if service is initialized
      if (!this.isInitialized()) {
        throw new ServiceNotInitializedError('Service must be initialized before getting Pokemon data');
      }

      let pokemon: Pokemon | null = null;
      
      if (typeof identifier === 'number') {
        // Validate number input
        if (identifier < 1 || !Number.isInteger(identifier)) {
          console.debug(`Invalid Pokemon ID: ${identifier} (must be positive integer)`);
          return null;
        }
        pokemon = this.pokemonData.find(p => p.id === identifier) || null;
      } else if (typeof identifier === 'string') {
        // Validate and sanitize string input
        const sanitizedName = identifier.trim().toLowerCase();
        if (sanitizedName.length === 0) {
          console.debug('Empty Pokemon name provided');
          return null;
        }
        pokemon = this.pokemonData.find(p => 
          p.name.toLowerCase() === sanitizedName || 
          p.id.toString() === identifier.trim()
        ) || null;
      } else {
        console.debug(`Invalid identifier type: ${typeof identifier}`);
        return null;
      }
      
      return pokemon ? this.transformImageUrls(pokemon) : null;
      
    } catch (error) {
      console.error('💥 Error in getPokemon:', error);
      
      // For non-critical errors, return null instead of throwing
      if (error instanceof ServiceNotInitializedError) {
        console.warn('⚠️ Returning null due to service not initialized');
        return null;
      }
      
      // Re-throw unexpected errors
      throw error;
    }
  }

  // Get Pokemon species by ID or name
  getPokemonSpecies(identifier: string | number): PokemonSpecies | null {
    if (typeof identifier === 'number') {
      return this.speciesData.find(s => s.id === identifier) || null;
    }
    
    const name = identifier.toLowerCase();
    return this.speciesData.find(s => 
      s.name.toLowerCase() === name || 
      s.id.toString() === identifier
    ) || null;
  }

  // Get evolution chain by ID
  getEvolutionChain(id: number): EvolutionChain | null {
    return this.evolutionChains.find(ec => ec.id === id) || null;
  }

  // Get type by ID or name
  getType(identifier: string | number): PokemonType | null {
    if (typeof identifier === 'number') {
      return this.typeData.find(t => t.id === identifier) || null;
    }
    
    const name = identifier.toLowerCase();
    return this.typeData.find(t => t.name.toLowerCase() === name) || null;
  }

  // Get all Pokemon (with pagination)
  getAllPokemon(offset: number = 0, limit: number = 20): { count: number; results: Array<{ name: string; url: string }> } {
    const total = this.pokemonData.length;
    const paginatedPokemon = this.pokemonData.slice(offset, offset + limit);
    const baseUrl = process.env.BASE_URL || 'http://srv36.mikr.us:20275';
    
    return {
      count: total,
      results: paginatedPokemon.map(p => ({
        name: p.name,
        url: `${baseUrl}/api/v2/pokemon/${p.id}`
      }))
    };
  }

  // Get all types
  getAllTypes(): { count: number; results: Array<{ name: string; url: string }> } {
    return {
      count: this.typeData.length,
      results: this.typeData.map(t => ({
        name: t.name,
        url: `/api/v2/type/${t.id}`
      }))
    };
  }

  // Search Pokemon by name (partial match)
  searchPokemon(query: string): Pokemon[] {
    const searchTerm = query.toLowerCase();
    return this.pokemonData.filter(pokemon => 
      pokemon.name.toLowerCase().includes(searchTerm)
    );
  }

  // Get Pokemon by type
  getPokemonByType(typeName: string): Pokemon[] {
    const type = this.getType(typeName);
    if (!type) return [];

    const pokemonInType = type.pokemon.map(p => {
      const urlParts = p.pokemon.url.split('/');
      return parseInt(urlParts[urlParts.length - 2]);
    });

    return this.pokemonData.filter(pokemon => 
      pokemonInType.includes(pokemon.id)
    );
  }

  // Get stats
  getStats(): {
    totalPokemon: number;
    totalTypes: number;
    totalEvolutionChains: number;
    totalSpecies: number;
  } {
    return {
      totalPokemon: this.pokemonData.length,
      totalTypes: this.typeData.length,
      totalEvolutionChains: this.evolutionChains.length,
      totalSpecies: this.speciesData.length,
    };
  }

  // Get Pokemon name suggestions for search functionality
  getPokemonSuggestions(query: string): string[] {
    try {
      // Validate input
      if (!query || typeof query !== 'string') {
        console.debug('Invalid query provided to getPokemonSuggestions:', { query, type: typeof query });
        return [];
      }

      // Sanitize input
      const sanitizedQuery = query.trim();
      if (sanitizedQuery.length === 0) {
        console.debug('Empty query after sanitization');
        return [];
      }

      // Enforce minimum query length (business rule)
      if (sanitizedQuery.length < 3) {
        console.debug(`Query too short: ${sanitizedQuery.length} characters (minimum: 3)`);
        return [];
      }

      // Check if service is initialized
      if (!this.isInitialized()) {
        throw new ServiceNotInitializedError('Service must be initialized before getting suggestions');
      }

      // Check if suggestions data is loaded
      if (!this.suggestionsData || !this.suggestionsData.pokemon) {
        console.warn('⚠️ Suggestions data not loaded - returning empty results');
        return [];
      }

      // Validate suggestions data structure
      if (!Array.isArray(this.suggestionsData.pokemon)) {
        throw new ValidationError('Suggestions data is corrupted - pokemon array is invalid');
      }

      const queryLower = sanitizedQuery.toLowerCase();
      
      // Filter Pokemon names that contain the query string with error handling
      try {
        const suggestions = this.suggestionsData.pokemon
          .filter((pokemon: PokemonSuggestion) => {
            // Validate each Pokemon entry
            if (!pokemon || typeof pokemon.name !== 'string') {
              console.warn('Invalid Pokemon entry found in suggestions data:', pokemon);
              return false;
            }
            return pokemon.name.toLowerCase().includes(queryLower);
          })
          .map((pokemon: PokemonSuggestion) => {
            try {
              // Capitalize first letter for proper display
              const name = pokemon.displayName || pokemon.name;
              if (typeof name !== 'string') {
                console.warn('Invalid name found for Pokemon:', pokemon);
                return pokemon.name; // Fallback to original name
              }
              return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            } catch (error) {
              console.warn('Error processing Pokemon name:', pokemon, error);
              return pokemon.name; // Fallback to original name
            }
          })
          .slice(0, 10); // Limit to 10 suggestions

        console.debug(`Found ${suggestions.length} suggestions for query: "${sanitizedQuery}"`);
        return suggestions;
        
      } catch (error) {
        console.error('Error filtering suggestions:', error);
        throw new ValidationError(`Failed to process suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('💥 Error in getPokemonSuggestions:', error);
      
      // For non-critical errors, return empty array instead of throwing
      if (error instanceof ServiceNotInitializedError || error instanceof ValidationError) {
        console.warn('⚠️ Returning empty suggestions due to error:', error.message);
        return [];
      }
      
      // Re-throw unexpected errors
      throw error;
    }
  }

  // Reload data (useful after scraping new data)
  reloadData(): void {
    this.loadData();
  }
}
