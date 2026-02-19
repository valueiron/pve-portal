/**
 * Kubernetes Service
 * Handles API calls to the backend for Kubernetes-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';

const fetchJSON = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// --- Cached list fetches ---

export const fetchPods = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.K8S_PODS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.K8S_PODS);
  }
  const data = await fetchJSON(API_ENDPOINTS.K8S_PODS);
  setCachedData(API_ENDPOINTS.K8S_PODS, data);
  return data;
};

export const fetchDeployments = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.K8S_DEPLOYMENTS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.K8S_DEPLOYMENTS);
  }
  const data = await fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENTS);
  setCachedData(API_ENDPOINTS.K8S_DEPLOYMENTS, data);
  return data;
};

export const fetchServices = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.K8S_SERVICES);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.K8S_SERVICES);
  }
  const data = await fetchJSON(API_ENDPOINTS.K8S_SERVICES);
  setCachedData(API_ENDPOINTS.K8S_SERVICES, data);
  return data;
};

export const fetchNamespaces = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.K8S_NAMESPACES);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.K8S_NAMESPACES);
  }
  const data = await fetchJSON(API_ENDPOINTS.K8S_NAMESPACES);
  setCachedData(API_ENDPOINTS.K8S_NAMESPACES, data);
  return data;
};

export const fetchNodes = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.K8S_NODES);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.K8S_NODES);
  }
  const data = await fetchJSON(API_ENDPOINTS.K8S_NODES);
  setCachedData(API_ENDPOINTS.K8S_NODES, data);
  return data;
};

export const fetchClusterInfo = async () => {
  return fetchJSON(API_ENDPOINTS.K8S_SYSTEM_INFO);
};

// --- Single-item fetches ---

export const fetchPodMetrics = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_POD_METRICS(namespace, name));
};

export const fetchPodLogs = async (namespace, name, tail = 100) => {
  const url = `${API_ENDPOINTS.K8S_POD_LOGS(namespace, name)}?tail=${tail}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.text();
};

// --- Pod actions ---

export const deletePod = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_POD(namespace, name), { method: 'DELETE' });
};

export const restartPod = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_POD_RESTART(namespace, name), { method: 'POST' });
};

// --- Deployment actions ---

export const deleteDeployment = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT(namespace, name), { method: 'DELETE' });
};

export const restartDeployment = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT_RESTART(namespace, name), { method: 'POST' });
};

export const scaleDeployment = async (namespace, name, replicas) => {
  return fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT_SCALE(namespace, name), {
    method: 'POST',
    body: JSON.stringify({ replicas }),
  });
};

// --- Service actions ---

export const deleteService = async (namespace, name) => {
  return fetchJSON(API_ENDPOINTS.K8S_SERVICE(namespace, name), { method: 'DELETE' });
};

// --- Namespace actions ---

export const deleteNamespace = async (name) => {
  return fetchJSON(API_ENDPOINTS.K8S_NAMESPACE(name), { method: 'DELETE' });
};
