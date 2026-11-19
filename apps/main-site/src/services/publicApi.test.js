import test from 'node:test';
import assert from 'node:assert/strict';
import publicApi from './publicApi.js';

test('public reads bypass stored responses and preserve data, query parameters and cancellation', async () => {
  const response = await publicApi.get('https://api.example.invalid/api/public/execom', {
    params: { year: 'example' },
    env: { fetch: async request => {
      assert.equal(request.cache, 'no-store');
      assert.equal(new URL(request.url).searchParams.get('year'), 'example');
      return new Response(JSON.stringify({ years: [] }), { headers: { 'Content-Type': 'application/json' } });
    } },
  });
  assert.deepEqual(response.data, { years: [] });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(publicApi.get('https://api.example.invalid', { signal: controller.signal }), error => error.code === 'ERR_CANCELED');
});
