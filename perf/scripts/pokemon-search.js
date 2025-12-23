import http from "k6/http";
import { check, group } from "k6";
import { assert } from "../utils/helper.js";
import { BASE_URL } from '../utils/config.js';

// Search queries to test
const searchQueries = ["pika", "char", "bulb", "mew"];

export default function () {
  group("Pokemon Search API", function () {
    searchQueries.forEach(query => {
      const response = http.get(`${BASE_URL}/api/v2/search/pokemon?q=${query}`);
      assert(response, check(response, {
        "status is 200": (r) => r.status === 200,
        "has results array": (r) => r.json().results && Array.isArray(r.json().results),
        "has count": (r) => typeof r.json().count === "number",
        "results contain query": (r) => {
          const results = r.json().results;
          return results.length === 0 || results.some(p => p.name.toLowerCase().includes(query.toLowerCase()));
        },
      }), `Pokemon Search for "${query}"`);
    });

    // Test empty search
    const emptyResponse = http.get(`${BASE_URL}/api/v2/search/pokemon?q=`);
    assert(emptyResponse, check(emptyResponse, {
      "status is 400": (r) => r.status === 400,
    }), "Empty Search Query");

    // Test non-existent Pokemon
    const noResultsResponse = http.get(`${BASE_URL}/api/v2/search/pokemon?q=nonexistentpokemon123`);
    assert(noResultsResponse, check(noResultsResponse, {
      "status is 200": (r) => r.status === 200,
      "empty results": (r) => r.json().results.length === 0,
    }), "No Results Search");
  });
}
