// frontend/app/assets/js/utils/cache.js
// Simple LRU cache with per-entry TTL and JSON serialization.
//
// Usage:
//   import { LRUCache } from './cache.js';
//   const cache = new LRUCache();
//   cache.set('user', { name: 'Ada' }, { ttl: 1000 }); // ttl in milliseconds
//   const user = cache.get('user'); // -> { name: 'Ada' }

export class LRUCache {
  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  _isExpired(entry) {
    return entry.expiresAt !== Infinity && Date.now() > entry.expiresAt;
  }

  _serialize(value) {
    return JSON.stringify(value);
  }

  _deserialize(value) {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  set(key, value, { ttl } = {}) {
    const expiresAt = typeof ttl === 'number' ? Date.now() + ttl : Infinity;
    const serialized = this._serialize(value);

    if (this.map.has(key)) {
      this.map.delete(key); // maintain LRU order
    }
    this.map.set(key, { value: serialized, expiresAt });

    this._evict();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (this._isExpired(entry)) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end to mark as recently used
    this.map.delete(key);
    this.map.set(key, entry);

    return this._deserialize(entry.value);
  }

  has(key) {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (this._isExpired(entry)) {
      this.map.delete(key);
      return false;
    }
    return true;
  }

  clear() {
    this.map.clear();
  }

  _evict() {
    // Remove expired entries first
    for (const [key, entry] of this.map) {
      if (this._isExpired(entry)) {
        this.map.delete(key);
      }
    }
    // Evict least-recently-used items when capacity exceeded
    while (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}

export default LRUCache;
