/**
 * Networking Service
 * Handles API calls to the backend for networking-related operations
 */
import { API_ENDPOINTS } from '../config/api';

/**
 * Fetch all networking resources from the backend
 * @returns {Promise<Object>} Object containing networking resources
 */
export const fetchNetworking = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.NETWORKING, {
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
    console.error('Error fetching networking resources:', error);
    throw error;
  }
};
