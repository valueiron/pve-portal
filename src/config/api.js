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

// Get WebSocket base URL for VNC proxy (port 5001)
const getWsBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    return `${wsProtocol}//${hostname}:5001`;
  }
  return 'ws://localhost:5001';
};

const WS_BASE_URL = getWsBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  VMS: `${API_BASE_URL}/api/vms`,
  VM_DETAILS: (vmid) => `${API_BASE_URL}/api/vms/${vmid}`,
  VNC_PROXY: (vmid) => `${API_BASE_URL}/api/vms/${vmid}/vncproxy`,
  VNC_WEBSOCKET: (vmid, port, vncticket, node) => {
    const params = new URLSearchParams({ vmid, port, vncticket, node });
    return `${WS_BASE_URL}/vnc?${params.toString()}`;
  },
  NODES: `${API_BASE_URL}/api/nodes`,
  NEXT_VMID: `${API_BASE_URL}/api/nextid`,
  TEMPLATES: `${API_BASE_URL}/api/templates`,
  CLONE_VM: `${API_BASE_URL}/api/vms/clone`,
  NETWORKING: `${API_BASE_URL}/api/networking`,
  STORAGE: `${API_BASE_URL}/api/storage`,
};

export default API_BASE_URL;

