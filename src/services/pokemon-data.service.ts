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
        this.loadData();
        resolve();
      } catch (error) {
        reject(error);
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
    try {
      // Load Pokemon data
      const pokemonPath = path.join(this.dataDir, 'pokemon.json');
      if (fs.existsSync(pokemonPath)) {
        this.pokemonData = JSON.parse(fs.readFileSync(pokemonPath, 'utf-8'));
      }

      // Load species data
      const speciesPath = path.join(this.dataDir, 'species.json');
      if (fs.existsSync(speciesPath)) {
        this.speciesData = JSON.parse(fs.readFileSync(speciesPath, 'utf-8'));
      }

      // Load evolution chains
      const evolutionPath = path.join(this.dataDir, 'evolution-chains.json');
      if (fs.existsSync(evolutionPath)) {
        this.evolutionChains = JSON.parse(fs.readFileSync(evolutionPath, 'utf-8'));
      }

      // Load type data
      const typePath = path.join(this.dataDir, 'types.json');
      if (fs.existsSync(typePath)) {
        this.typeData = JSON.parse(fs.readFileSync(typePath, 'utf-8'));
      }

      // Load suggestions data
      const suggestionsPath = path.join(this.dataDir, 'suggestions.json');
      if (fs.existsSync(suggestionsPath)) {
        this.suggestionsData = JSON.parse(fs.readFileSync(suggestionsPath, 'utf-8'));
      }

      console.log(`Loaded ${this.pokemonData.length} Pokemon, ${this.typeData.length} types, ${this.evolutionChains.length} evolution chains, ${this.suggestionsData?.pokemon?.length || 0} suggestions`);
    } catch (error) {
      console.error('Error loading Pokemon data:', error);
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
    let pokemon: Pokemon | null = null;
    
    if (typeof identifier === 'number') {
      pokemon = this.pokemonData.find(p => p.id === identifier) || null;
    } else {
      const name = identifier.toLowerCase();
      pokemon = this.pokemonData.find(p => 
        p.name.toLowerCase() === name || 
        p.id.toString() === identifier
      ) || null;
    }
    
    // Transform image URLs to use local server
    return pokemon ? this.transformImageUrls(pokemon) : null;
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
    // Validate input
    if (!query || typeof query !== 'string') {
      return [];
    }

    // Business rule: minimum 3 characters required
    if (query.length < 3) {
      return [];
    }

    // Check if suggestions data is loaded
    if (!this.suggestionsData || !this.suggestionsData.pokemon) {
      console.warn('Suggestions data not loaded');
      return [];
    }

    const queryLower = query.toLowerCase().trim();
    
    // Filter Pokemon names that contain the query string
    const suggestions = this.suggestionsData.pokemon
      .filter((pokemon: PokemonSuggestion) => pokemon.name.includes(queryLower))
      .map((pokemon: PokemonSuggestion) => {
        // Capitalize first letter for proper display
        const name = pokemon.displayName || pokemon.name;
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      })
      .slice(0, 10); // Limit to 10 suggestions

    return suggestions;
  }

  // Reload data (useful after scraping new data)
  reloadData(): void {
    this.loadData();
  }
}
