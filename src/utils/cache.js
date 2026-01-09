/**
 * Cache Utility
 * Provides in-memory caching for API responses
 * Cache is per-session and cleared on page refresh
 */

// In-memory cache store
const cache = {};

/**
 * Get cached data for an endpoint
 * @param {string} endpoint - The cache key (typically the endpoint URL)
 * @returns {any|null} Cached data or null if not found
 */
export const getCachedData = (endpoint) => {
  return cache[endpoint] || null;
};

/**
 * Set cached data for an endpoint
 * @param {string} endpoint - The cache key (typically the endpoint URL)
 * @param {any} data - The data to cache
 */
export const setCachedData = (endpoint, data) => {
  cache[endpoint] = data;
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
