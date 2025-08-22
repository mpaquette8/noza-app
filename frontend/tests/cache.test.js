const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../app/assets/js/utils/cache.js');

test('stores and retrieves serialized values', async () => {
  const { LRUCache } = await load();
  const cache = new LRUCache();
  cache.set('a', { foo: 'bar' }, { ttl: 1000 });
  assert.deepEqual(cache.get('a'), { foo: 'bar' });
});

test('evicts least recently used entries', async () => {
  const { LRUCache } = await load();
  const cache = new LRUCache(2);
  cache.set('a', 1, { ttl: 1000 });
  cache.set('b', 2, { ttl: 1000 });
  cache.get('a'); // mark 'a' as recently used
  cache.set('c', 3, { ttl: 1000 });
  assert.strictEqual(cache.has('b'), false);
  assert.strictEqual(cache.has('a'), true);
});

test('expires entries based on TTL', async () => {
  const { LRUCache } = await load();
  const cache = new LRUCache();
  cache.set('a', 1, { ttl: 10 });
  await new Promise(r => setTimeout(r, 20));
  assert.strictEqual(cache.get('a'), undefined);
});
