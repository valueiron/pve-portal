/**
 * Networking Service
 * Handles API calls to the backend for networking-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';

export const fetchNetworking = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.NETWORKING);
    if (cached !== null) return cached;
  }
  const data = await fetchJSON(API_ENDPOINTS.NETWORKING);
  setCachedData(API_ENDPOINTS.NETWORKING, data);
  return data;
};
