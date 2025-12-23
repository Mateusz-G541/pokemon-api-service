import http from "k6/http";
import { check, group, sleep } from "k6";
import { assert, thinkTime } from "../utils/helper.js";
import { BASE_URL } from '../utils/config.js';
import { ROUTES } from '../utils/routes.js';

// Suggestion queries to test
const suggestionQueries = ["pika", "char", "bulb", "mew", "squ"];

export default function () {
  group("Pokemon Suggestions API", function () {
    suggestionQueries.forEach(query => {
      const response = http.get(`${BASE_URL}${ROUTES.pokemonSuggestions}?query=${query}`, {
        tags: { endpoint: 'suggestions', expected_response: 'true' }
      });
      assert(response, check(response, {
        "status is 200": (r) => r.status === 200,
        "returns array": (r) => Array.isArray(r.json()),
        "suggestions contain query": (r) => {
          const suggestions = r.json();
          return suggestions.length === 0 || suggestions.some(s => s.toLowerCase().includes(query.toLowerCase()));
        },
      }), `Pokemon Suggestions for "${query}"`);

      sleep(thinkTime());
    });

    // Test short query (should return empty)
    const shortResponse = http.get(`${BASE_URL}${ROUTES.pokemonSuggestions}?query=pi`, {
      tags: { endpoint: 'suggestions', expected_response: 'true' }
    });
    assert(shortResponse, check(shortResponse, {
      "status is 200": (r) => r.status === 200,
      "empty array for short query": (r) => Array.isArray(r.json()) && r.json().length === 0,
    }), "Short Query Suggestions");

    sleep(thinkTime());

    // Test no query parameter
    const noQueryResponse = http.get(`${BASE_URL}${ROUTES.pokemonSuggestions}`, {
      tags: { endpoint: 'suggestions', expected_response: 'false' }
    });
    assert(noQueryResponse, check(noQueryResponse, {
      "status is 400": (r) => r.status === 400,
    }), "Missing Query Parameter");

    sleep(thinkTime());
  });
}
