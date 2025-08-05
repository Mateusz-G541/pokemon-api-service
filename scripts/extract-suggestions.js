const fs = require('fs');
const path = require('path');

/**
 * Script to extract Pokemon names from the large pokemon.json file
 * and create a lightweight suggestions.json file for search functionality
 */

async function extractPokemonSuggestions() {
  try {
    console.log('🔄 Starting Pokemon suggestions extraction...');
    
    const pokemonDataPath = path.join(__dirname, '..', 'data', 'pokemon.json');
    const suggestionsOutputPath = path.join(__dirname, '..', 'data', 'suggestions.json');
    
    // Check if pokemon.json exists
    if (!fs.existsSync(pokemonDataPath)) {
      console.error('❌ pokemon.json not found at:', pokemonDataPath);
      return;
    }
    
    console.log('📖 Reading pokemon.json...');
    const pokemonData = JSON.parse(fs.readFileSync(pokemonDataPath, 'utf8'));
    
    // Extract Pokemon names (Generation 1 only - IDs 1-151)
    const suggestions = [];
    
    for (const [pokemonId, pokemonInfo] of Object.entries(pokemonData)) {
      const id = parseInt(pokemonId);
      
      // Only include Generation 1 Pokemon (IDs 1-151)
      if (id >= 1 && id <= 151 && pokemonInfo.name) {
        suggestions.push({
          id: id,
          name: pokemonInfo.name.toLowerCase(),
          displayName: pokemonInfo.name
        });
      }
    }
    
    // Sort by ID for consistent ordering
    suggestions.sort((a, b) => a.id - b.id);
    
    // Create the suggestions data structure
    const suggestionsData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: suggestions.length,
        generation: 1,
        description: "Pokemon names for search suggestions (Generation 1 only)"
      },
      pokemon: suggestions
    };
    
    // Write to suggestions.json
    fs.writeFileSync(suggestionsOutputPath, JSON.stringify(suggestionsData, null, 2));
    
    console.log('✅ Successfully extracted Pokemon suggestions!');
    console.log(`📊 Total Pokemon names extracted: ${suggestions.length}`);
    console.log(`💾 Saved to: ${suggestionsOutputPath}`);
    
    // Show first few examples
    console.log('\n🔍 Sample suggestions:');
    suggestions.slice(0, 10).forEach(pokemon => {
      console.log(`  ${pokemon.id}: ${pokemon.displayName}`);
    });
    
  } catch (error) {
    console.error('❌ Error extracting Pokemon suggestions:', error);
  }
}

// Run the extraction
extractPokemonSuggestions();
