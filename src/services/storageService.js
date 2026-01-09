/**
 * Storage Service
 * Handles API calls to the backend for storage-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';

/**
 * Fetch all storage resources from the backend
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data
 * @returns {Promise<Object>} Object containing storage resources
 */
export const fetchStorage = async (forceRefresh = false) => {
  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cachedData = getCachedData(API_ENDPOINTS.STORAGE);
    if (cachedData !== null) {
      return cachedData;
    }
  } else {
    // Clear cache if forcing refresh
    clearCache(API_ENDPOINTS.STORAGE);
  }

  try {
    const response = await fetch(API_ENDPOINTS.STORAGE, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Store in cache
    setCachedData(API_ENDPOINTS.STORAGE, data);
    
    return data;
  } catch (error) {
    console.error('Error fetching storage resources:', error);
    throw error;
  }
};
