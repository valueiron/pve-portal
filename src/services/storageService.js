/**
 * Storage Service
 * Handles API calls to the backend for storage-related operations
 */
import { API_ENDPOINTS } from '../config/api';

/**
 * Fetch all storage resources from the backend
 * @returns {Promise<Object>} Object containing storage resources
 */
export const fetchStorage = async () => {
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
    return data;
  } catch (error) {
    console.error('Error fetching storage resources:', error);
    throw error;
  }
};
