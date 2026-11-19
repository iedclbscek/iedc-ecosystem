import test from 'node:test';
import assert from 'node:assert/strict';
import { isChunkLoadError, recoverChunkLoad } from './chunkRecovery.js';

function browser() {
  const data = new Map();
  return { navigator: { onLine: true }, sessionStorage: { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }, location: { reload() { this.reloads++; }, reloads: 0 } };
}

test('recognizes missing JS/CSS chunks without refreshing unrelated application errors', () => {
  for (const message of ['Failed to fetch dynamically imported module: /assets/page-old.js', 'Importing a module script failed.', 'Loading chunk 12 failed.', 'Unable to preload CSS for /assets/page-old.css']) assert(isChunkLoadError(new Error(message)));
  assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')), false);
  const scope = browser();
  assert.equal(recoverChunkLoad(new Error('Invalid form input'), scope, 100_000), false);
  assert.equal(scope.location.reloads, 0);
});

test('reloads the same URL once, survives a new document, and allows a later recovery', () => {
  const scope = browser(); const error = new TypeError('Failed to fetch dynamically imported module: /assets/page-old.js');
  assert.equal(recoverChunkLoad(error, scope, 100_000), true);
  assert.equal(recoverChunkLoad(error, scope, 100_001), false);
  assert.equal(scope.location.reloads, 1);
  assert.equal(recoverChunkLoad(error, scope, 160_001), true);
  assert.equal(scope.location.reloads, 2);
});

test('offline or unavailable storage leaves recovery to the user instead of looping', () => {
  const error = new Error('Failed to fetch dynamically imported module');
  const scope = browser(); scope.navigator.onLine = false;
  assert.equal(recoverChunkLoad(error, scope, 100_000), false);
  scope.navigator.onLine = true; scope.sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
  assert.equal(recoverChunkLoad(error, scope, 100_000), false);
  assert.equal(scope.location.reloads, 0);
});
