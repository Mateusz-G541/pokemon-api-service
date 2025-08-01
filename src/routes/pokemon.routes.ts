import express from 'express';
import { PokemonDataService } from '../services/pokemon-data.service';

const router = express.Router();
const pokemonService = new PokemonDataService();

// GET /api/v2/pokemon - List all Pokemon with pagination
router.get('/pokemon', (req: express.Request, res: express.Response) => {
  try {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per request

    const result = pokemonService.getAllPokemon(offset, limit);
    res.json(result);
  } catch (error) {
    console.error('Error fetching Pokemon list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/pokemon/:identifier - Get specific Pokemon by ID or name
router.get('/pokemon/:identifier', (req: express.Request, res: express.Response) => {
  try {
    const { identifier } = req.params;
    const pokemon = pokemonService.getPokemon(identifier);

    if (!pokemon) {
      return res.status(404).json({ error: 'Pokemon not found' });
    }

    res.json(pokemon);
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/pokemon-species/:identifier - Get Pokemon species by ID or name
router.get('/pokemon-species/:identifier', (req: express.Request, res: express.Response) => {
  try {
    const { identifier } = req.params;
    const species = pokemonService.getPokemonSpecies(identifier);

    if (!species) {
      return res.status(404).json({ error: 'Pokemon species not found' });
    }

    res.json(species);
  } catch (error) {
    console.error('Error fetching Pokemon species:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/evolution-chain/:id - Get evolution chain by ID
router.get('/evolution-chain/:id', (req: express.Request, res: express.Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid evolution chain ID' });
    }

    const evolutionChain = pokemonService.getEvolutionChain(id);

    if (!evolutionChain) {
      return res.status(404).json({ error: 'Evolution chain not found' });
    }

    res.json(evolutionChain);
  } catch (error) {
    console.error('Error fetching evolution chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/type - List all types
router.get('/type', (req: express.Request, res: express.Response) => {
  try {
    const result = pokemonService.getAllTypes();
    res.json(result);
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/type/:identifier - Get specific type by ID or name
router.get('/type/:identifier', (req: express.Request, res: express.Response) => {
  try {
    const { identifier } = req.params;
    const type = pokemonService.getType(identifier);

    if (!type) {
      return res.status(404).json({ error: 'Type not found' });
    }

    res.json(type);
  } catch (error) {
    console.error('Error fetching type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/search/pokemon - Search Pokemon by name
router.get('/search/pokemon', (req: express.Request, res: express.Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = pokemonService.searchPokemon(query);
    res.json({
      count: results.length,
      results: results.map(p => ({
        id: p.id,
        name: p.name,
        url: `/api/v2/pokemon/${p.id}`
      }))
    });
  } catch (error) {
    console.error('Error searching Pokemon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v2/stats - Get service statistics
router.get('/stats', (req: express.Request, res: express.Response) => {
  try {
    const stats = pokemonService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v2/reload - Reload data (useful after scraping)
router.post('/reload', (req: express.Request, res: express.Response) => {
  try {
    pokemonService.reloadData();
    const stats = pokemonService.getStats();
    res.json({
      message: 'Data reloaded successfully',
      stats
    });
  } catch (error) {
    console.error('Error reloading data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
