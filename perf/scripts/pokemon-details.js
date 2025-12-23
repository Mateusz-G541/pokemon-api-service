import http from "k6/http";
import { check, group, sleep } from "k6";
import { assert, thinkTime } from "../utils/helper.js";
import { getEmbededResources } from "../utils/helper.js";
import { BASE_URL } from '../utils/config.js';

// Common Pokemon IDs to test
const testPokemonIds = [1, 25, 150]; // Bulbasaur, Pikachu, Mewtwo
const testPokemonNames = ["pikachu", "charizard", "mew"];

export default function () {
  group("Pokemon Details API", function () {
    // Test by ID
    testPokemonIds.forEach(id => {
      const response = http.get(`${BASE_URL}/api/v2/pokemon/${id}`);
      assert(response, check(response, {
        "status is 200": (r) => r.status === 200,
        "has id": (r) => r.json().id === id,
        "has name": (r) => r.json().name,
        "has types": (r) => r.json().types && Array.isArray(r.json().types),
        "has stats": (r) => r.json().stats && Array.isArray(r.json().stats),
      }), `Pokemon Details by ID ${id}`);

      if (response.status === 200) {
        getEmbededResources(response.body);
      }

      sleep(thinkTime());
    });

    // Test by name
    testPokemonNames.forEach(name => {
      const response = http.get(`${BASE_URL}/api/v2/pokemon/${name}`);
      assert(response, check(response, {
        "status is 200": (r) => r.status === 200,
        "has name": (r) => r.json().name === name,
        "has id": (r) => typeof r.json().id === "number",
      }), `Pokemon Details by Name ${name}`);

      sleep(thinkTime());
    });

    // Test invalid Pokemon
    const invalidResponse = http.get(`${BASE_URL}/api/v2/pokemon/99999`);
    assert(invalidResponse, check(invalidResponse, {
      "status is 404": (r) => r.status === 404,
    }), "Invalid Pokemon ID");

    sleep(thinkTime());
  });
}
