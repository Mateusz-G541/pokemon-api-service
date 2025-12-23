export const ROUTES = {
  pokemonList: '/api/v2/pokemon',
  pokemonDetails: (identifier) => `/api/v2/pokemon/${identifier}`,
  pokemonSearch: '/api/v2/search/pokemon',
  pokemonSuggestions: '/api/v2/pokemon/suggestions',
};
