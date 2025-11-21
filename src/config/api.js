/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 */

// Backend API base URL
// Default to Flask backend running on port 5000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// API endpoints
export const API_ENDPOINTS = {
  VMS: `${API_BASE_URL}/api/vms`,
  VM_DETAILS: (vmid) => `${API_BASE_URL}/api/vms/${vmid}`,
  NODES: `${API_BASE_URL}/api/nodes`,
};

export default API_BASE_URL;

