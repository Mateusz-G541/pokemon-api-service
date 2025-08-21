import { describe, it, expect } from 'vitest';

// Only treat CI environments as skip conditions. Do NOT rely on NODE_ENV,
// because Vitest sets NODE_ENV='test' locally which would skip tests unintentionally.
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res as Response;
  } finally {
    clearTimeout(id);
  }
}

describe('Version endpoint (integration)', () => {
  // Skip in CI to avoid hanging if service isn't running
  if (isCI) {
    it.skip('skipped in CI environment');
    return;
  }

  const PORT = process.env.PORT || '20275';
  const BASE = `http://localhost:${PORT}`;

  it('GET /version returns 200', async () => {
    const res = await fetchWithTimeout(`${BASE}/version`, 3000);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('version');
  });

  it('GET /api/v2/version returns 200', async () => {
    const res = await fetchWithTimeout(`${BASE}/api/v2/version`, 3000);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('version');
  });
});
