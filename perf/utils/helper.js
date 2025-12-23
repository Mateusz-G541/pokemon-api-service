export function assert(response, ok, label) {
  if (!ok) {
    const status = response && typeof response.status !== 'undefined' ? response.status : 'unknown';
    const url = response && typeof response.url === 'string' ? response.url : 'unknown';
    throw new Error(`Assertion failed${label ? ` (${label})` : ''}: status=${status} url=${url}`);
  }
}

export function getEmbededResources(_htmlOrBody) {
  return [];
}
