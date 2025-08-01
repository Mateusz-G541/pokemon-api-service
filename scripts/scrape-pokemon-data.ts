import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';

interface PokemonData {
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

interface TypeData {
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

interface SpeciesData {
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

interface EvolutionChainData {
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

class PokemonDataScraper {
  private readonly baseUrl = 'https://pokeapi.co/api/v2';
  private readonly dataDir = path.join(__dirname, '..', 'data');
  private readonly imagesDir = path.join(__dirname, '..', 'images');

  constructor() {
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.dataDir,
      path.join(this.imagesDir, 'pokemon'),
      path.join(this.imagesDir, 'pokemon', 'sprites'),
      path.join(this.imagesDir, 'pokemon', 'artwork'),
      path.join(this.imagesDir, 'types'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async downloadImage(url: string, filepath: string): Promise<void> {
    try {
      if (!url) return;
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
      });

      const writer = createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to download image from ${url}:`, error);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scrapePokemonData(): Promise<void> {
    console.log('🚀 Starting Pokemon data scraping...');
    
    const pokemonData: PokemonData[] = [];
    const speciesData: SpeciesData[] = [];
    const evolutionChains: EvolutionChainData[] = [];
    
    // Get total number of Pokemon
    const pokemonListResponse = await axios.get(`${this.baseUrl}/pokemon?limit=100000`);
    const totalPokemon = pokemonListResponse.data.results.length;
    
    console.log(`📊 Found ${totalPokemon} Pokemon to scrape`);

    // Scrape Pokemon data (limit to first 151 for initial testing, can be changed)
    const POKEMON_LIMIT = parseInt(process.env.POKEMON_LIMIT || '151');
    
    for (let i = 1; i <= Math.min(POKEMON_LIMIT, totalPokemon); i++) {
      try {
        console.log(`🔍 Scraping Pokemon ${i}/${Math.min(POKEMON_LIMIT, totalPokemon)}`);
        
        // Get Pokemon data
        const pokemonResponse = await axios.get(`${this.baseUrl}/pokemon/${i}`);
        const pokemon: PokemonData = pokemonResponse.data;
        
        // Download Pokemon sprites
        if (pokemon.sprites.front_default) {
          const filename = `${pokemon.id}.png`;
          await this.downloadImage(
            pokemon.sprites.front_default,
            path.join(this.imagesDir, 'pokemon', 'sprites', filename)
          );
          // Update sprite path to local path
          pokemon.sprites.front_default = `/images/pokemon/sprites/${filename}`;
        }

        if (pokemon.sprites.other['official-artwork'].front_default) {
          const filename = `${pokemon.id}-artwork.png`;
          await this.downloadImage(
            pokemon.sprites.other['official-artwork'].front_default,
            path.join(this.imagesDir, 'pokemon', 'artwork', filename)
          );
          // Update artwork path to local path
          pokemon.sprites.other['official-artwork'].front_default = `/images/pokemon/artwork/${filename}`;
        }

        pokemonData.push(pokemon);

        // Get species data
        const speciesResponse = await axios.get(`${this.baseUrl}/pokemon-species/${i}`);
        const species: SpeciesData = speciesResponse.data;
        speciesData.push(species);

        // Get evolution chain (avoid duplicates)
        const evolutionChainUrl = species.evolution_chain.url;
        const evolutionChainId = parseInt(evolutionChainUrl.split('/').slice(-2, -1)[0]);
        
        if (!evolutionChains.find(chain => chain.id === evolutionChainId)) {
          const evolutionResponse = await axios.get(evolutionChainUrl);
          const evolutionChain: EvolutionChainData = evolutionResponse.data;
          evolutionChains.push(evolutionChain);
        }

        // Rate limiting to avoid overwhelming the API
        await this.delay(100);
        
      } catch (error) {
        console.error(`❌ Error scraping Pokemon ${i}:`, error);
      }
    }

    // Save Pokemon data
    fs.writeFileSync(
      path.join(this.dataDir, 'pokemon.json'),
      JSON.stringify(pokemonData, null, 2)
    );

    // Save species data
    fs.writeFileSync(
      path.join(this.dataDir, 'species.json'),
      JSON.stringify(speciesData, null, 2)
    );

    // Save evolution chains
    fs.writeFileSync(
      path.join(this.dataDir, 'evolution-chains.json'),
      JSON.stringify(evolutionChains, null, 2)
    );

    console.log('✅ Pokemon data scraping completed!');
  }

  async scrapeTypeData(): Promise<void> {
    console.log('🚀 Starting type data scraping...');
    
    const typeData: TypeData[] = [];
    
    // Get all types
    const typesResponse = await axios.get(`${this.baseUrl}/type`);
    const types = typesResponse.data.results;

    for (const typeInfo of types) {
      try {
        console.log(`🔍 Scraping type: ${typeInfo.name}`);
        
        const typeResponse = await axios.get(typeInfo.url);
        const type: TypeData = typeResponse.data;
        
        typeData.push(type);
        
        await this.delay(100);
        
      } catch (error) {
        console.error(`❌ Error scraping type ${typeInfo.name}:`, error);
      }
    }

    // Save type data
    fs.writeFileSync(
      path.join(this.dataDir, 'types.json'),
      JSON.stringify(typeData, null, 2)
    );

    console.log('✅ Type data scraping completed!');
  }

  async scrapeAll(): Promise<void> {
    await this.scrapePokemonData();
    await this.scrapeTypeData();
    console.log('🎉 All data scraping completed!');
  }
}

// Run the scraper
if (require.main === module) {
  const scraper = new PokemonDataScraper();
  scraper.scrapeAll().catch(console.error);
}

export default PokemonDataScraper;
