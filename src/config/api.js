/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 * 
 * Configuration priority:
 * 1. Runtime config from window.__API_BASE_URL__ (set by config.js script in Docker)
 * 2. Build-time env var VITE_API_BASE_URL
 * 3. Auto-detect from current page URL (works for mobile/remote access)
 * 4. Default: http://localhost:5000
 */

// Get API base URL from runtime config, build-time env, or default
const getApiBaseUrl = () => {
  // Check for runtime configuration (set by config.js in Docker)
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__;
  }
  
  // Check for build-time environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Auto-detect from current page URL (works for mobile/remote access)
  // This allows the API to work when accessing via IP address or domain name
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Use the same hostname as the current page, but with port 5000 for the backend
    return `${protocol}//${hostname}:5000`;
  }
  
  // Default fallback
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  VMS: `${API_BASE_URL}/api/vms`,
  VM_DETAILS: (vmid) => `${API_BASE_URL}/api/vms/${vmid}`,
  NODES: `${API_BASE_URL}/api/nodes`,
  NETWORKING: `${API_BASE_URL}/api/networking`,
  STORAGE: `${API_BASE_URL}/api/storage`,
};

export default API_BASE_URL;

