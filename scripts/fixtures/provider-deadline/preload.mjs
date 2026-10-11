// Test-only transport mapping. Real fetch/signals/body readers remain in use.
const originalFetch = globalThis.fetch;
globalThis.fetch = function(input, init) {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input));
  if (url.hostname === 'api.votesmart.org') {
    const target = new URL(url.pathname, process.env.PROVIDER_FIXTURE_ORIGIN);
    // No credential is needed or retained by the internal test provider.
    return originalFetch(target, init);
  }
  return originalFetch(input, init);
};
