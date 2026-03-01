/**
 * Storage Service
 * Handles API calls to the backend for storage-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';

export const fetchStorage = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.STORAGE);
    if (cached !== null) return cached;
  }
  const data = await fetchJSON(API_ENDPOINTS.STORAGE);
  setCachedData(API_ENDPOINTS.STORAGE, data);
  return data;
};
