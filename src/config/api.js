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
  NETWORKING: `${API_BASE_URL}/api/networking`,
  STORAGE: `${API_BASE_URL}/api/storage`,
  DOCKER_CONTAINERS: `${API_BASE_URL}/api/docker/containers`,
  DOCKER_CONTAINER: (id) => `${API_BASE_URL}/api/docker/containers/${id}`,
  DOCKER_CONTAINER_START: (id) => `${API_BASE_URL}/api/docker/containers/${id}/start`,
  DOCKER_CONTAINER_STOP: (id) => `${API_BASE_URL}/api/docker/containers/${id}/stop`,
  DOCKER_CONTAINER_RESTART: (id) => `${API_BASE_URL}/api/docker/containers/${id}/restart`,
  DOCKER_CONTAINER_LOGS: (id) => `${API_BASE_URL}/api/docker/containers/${id}/logs`,
  DOCKER_CONTAINER_METRICS: (id) => `${API_BASE_URL}/api/docker/containers/${id}/metrics`,
  DOCKER_IMAGES: `${API_BASE_URL}/api/docker/images`,
  DOCKER_IMAGE_INSPECT: (id) => `${API_BASE_URL}/api/docker/images/${encodeURIComponent(id)}`,
  DOCKER_VOLUMES: `${API_BASE_URL}/api/docker/volumes`,
  DOCKER_VOLUME_INSPECT: (name) => `${API_BASE_URL}/api/docker/volumes/${encodeURIComponent(name)}`,
  DOCKER_NETWORKS: `${API_BASE_URL}/api/docker/networks`,
  DOCKER_NETWORK_INSPECT: (id) => `${API_BASE_URL}/api/docker/networks/${encodeURIComponent(id)}`,
  DOCKER_SYSTEM_INFO: `${API_BASE_URL}/api/docker/system/info`,
  DOCKER_SYSTEM_DISK: `${API_BASE_URL}/api/docker/system/disk`,

  // Kubernetes endpoints
  K8S_PODS: `${API_BASE_URL}/api/k8s/pods`,
  K8S_POD: (ns, name) => `${API_BASE_URL}/api/k8s/pods/${ns}/${name}`,
  K8S_POD_LOGS: (ns, name) => `${API_BASE_URL}/api/k8s/pods/${ns}/${name}/logs`,
  K8S_POD_METRICS: (ns, name) => `${API_BASE_URL}/api/k8s/pods/${ns}/${name}/metrics`,
  K8S_POD_RESTART: (ns, name) => `${API_BASE_URL}/api/k8s/pods/${ns}/${name}/restart`,
  K8S_DEPLOYMENTS: `${API_BASE_URL}/api/k8s/deployments`,
  K8S_DEPLOYMENT: (ns, name) => `${API_BASE_URL}/api/k8s/deployments/${ns}/${name}`,
  K8S_DEPLOYMENT_SCALE: (ns, name) => `${API_BASE_URL}/api/k8s/deployments/${ns}/${name}/scale`,
  K8S_DEPLOYMENT_RESTART: (ns, name) => `${API_BASE_URL}/api/k8s/deployments/${ns}/${name}/restart`,
  K8S_SERVICES: `${API_BASE_URL}/api/k8s/services`,
  K8S_SERVICE: (ns, name) => `${API_BASE_URL}/api/k8s/services/${ns}/${name}`,
  K8S_NAMESPACES: `${API_BASE_URL}/api/k8s/namespaces`,
  K8S_NAMESPACE: (name) => `${API_BASE_URL}/api/k8s/namespaces/${name}`,
  K8S_CONFIGMAPS: `${API_BASE_URL}/api/k8s/configmaps`,
  K8S_CONFIGMAP: (ns, name) => `${API_BASE_URL}/api/k8s/configmaps/${ns}/${name}`,
  K8S_PVCS: `${API_BASE_URL}/api/k8s/pvcs`,
  K8S_PVC: (ns, name) => `${API_BASE_URL}/api/k8s/pvcs/${ns}/${name}`,
  K8S_NODES: `${API_BASE_URL}/api/k8s/nodes`,
  K8S_NODE: (name) => `${API_BASE_URL}/api/k8s/nodes/${name}`,
  K8S_SYSTEM_INFO: `${API_BASE_URL}/api/k8s/system/info`,
};

export default API_BASE_URL;

