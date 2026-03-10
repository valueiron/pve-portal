/**
 * Cache Utility
 * Provides in-memory caching for API responses
 * Cache is per-session and cleared on page refresh
 */

// In-memory cache store
const cache = {};

const DEFAULT_TTL_MS = 30_000; // 30 seconds

/**
 * Get cached data for an endpoint
 * @param {string} endpoint - The cache key (typically the endpoint URL)
 * @returns {any|null} Cached data or null if not found or expired
 */
export const getCachedData = (endpoint) => {
  const entry = cache[endpoint];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete cache[endpoint];
    return null;
  }
  return entry.data;
};

/**
 * Set cached data for an endpoint
 * @param {string} endpoint - The cache key (typically the endpoint URL)
 * @param {any} data - The data to cache
 * @param {number} [ttl] - TTL in milliseconds (default 30s)
 */
export const setCachedData = (endpoint, data, ttl = DEFAULT_TTL_MS) => {
  cache[endpoint] = { data, expiresAt: Date.now() + ttl };
};

/**
 * Clear cached data for a specific endpoint
 * @param {string} endpoint - The cache key to clear
 */
export const clearCache = (endpoint) => {
  if (cache[endpoint]) {
    delete cache[endpoint];
  }
};

/**
 * Clear all cached data
 */
export const clearAllCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
};
