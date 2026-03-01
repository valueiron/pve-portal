/**
 * Kubernetes Service
 * Handles API calls to the backend for Kubernetes-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';

const withCache = async (key, forceRefresh, fetcher) => {
  if (!forceRefresh) {
    const cached = getCachedData(key);
    if (cached !== null) return cached;
  }
  const data = await fetcher();
  setCachedData(key, data);
  return data;
};

// --- Cached list fetches ---

export const fetchPods = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.K8S_PODS, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.K8S_PODS));

export const fetchDeployments = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.K8S_DEPLOYMENTS, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENTS));

export const fetchServices = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.K8S_SERVICES, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.K8S_SERVICES));

export const fetchNamespaces = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.K8S_NAMESPACES, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.K8S_NAMESPACES));

export const fetchNodes = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.K8S_NODES, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.K8S_NODES));

export const fetchClusterInfo = () =>
  fetchJSON(API_ENDPOINTS.K8S_SYSTEM_INFO);

// --- Single-item fetches ---

export const fetchPodMetrics = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_POD_METRICS(namespace, name));

export const fetchPodLogs = async (namespace, name, tail = 100) => {
  const response = await fetch(`${API_ENDPOINTS.K8S_POD_LOGS(namespace, name)}?tail=${tail}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.text();
};

// --- Pod exec session ---

export const createPodExecSession = (namespace, name, container = '', shell = 'auto') =>
  fetchJSON(API_ENDPOINTS.K8S_POD_EXEC_SESSION(namespace, name), {
    method: 'POST',
    body: JSON.stringify({ container, shell }),
  });

// --- Pod actions ---

export const deletePod = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_POD(namespace, name), { method: 'DELETE' });

export const restartPod = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_POD_RESTART(namespace, name), { method: 'POST' });

// --- Deployment actions ---

export const deleteDeployment = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT(namespace, name), { method: 'DELETE' });

export const restartDeployment = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT_RESTART(namespace, name), { method: 'POST' });

export const scaleDeployment = (namespace, name, replicas) =>
  fetchJSON(API_ENDPOINTS.K8S_DEPLOYMENT_SCALE(namespace, name), {
    method: 'POST',
    body: JSON.stringify({ replicas }),
  });

// --- Service actions ---

export const deleteService = (namespace, name) =>
  fetchJSON(API_ENDPOINTS.K8S_SERVICE(namespace, name), { method: 'DELETE' });

// --- Namespace actions ---

export const deleteNamespace = (name) =>
  fetchJSON(API_ENDPOINTS.K8S_NAMESPACE(name), { method: 'DELETE' });
