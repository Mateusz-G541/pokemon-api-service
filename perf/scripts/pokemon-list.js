import http from "k6/http";
import { check, group, sleep } from "k6";
import { assert, thinkTime } from "../utils/helper.js";
import { getEmbededResources } from "../utils/helper.js";
import { BASE_URL } from '../utils/config.js';

export default function () {
  group("Pokemon List API", function () {
    // Test basic list endpoint
    const listResponse = http.get(`${BASE_URL}/api/v2/pokemon?limit=20`);
    assert(listResponse, check(listResponse, {
      "status is 200": (r) => r.status === 200,
      "has results array": (r) => r.json().results && Array.isArray(r.json().results),
      "has count": (r) => typeof r.json().count === "number",
    }), "Pokemon List");

    sleep(thinkTime());

    // Test pagination
    const paginatedResponse = http.get(`${BASE_URL}/api/v2/pokemon?offset=20&limit=10`);
    assert(paginatedResponse, check(paginatedResponse, {
      "status is 200": (r) => r.status === 200,
      "returns correct limit": (r) => r.json().results.length === 10,
    }), "Pokemon List Pagination");

    sleep(thinkTime());

    // Load embedded resources if any
    if (listResponse.status === 200) {
      getEmbededResources(listResponse.body);
    }

    sleep(thinkTime());
  });
}
