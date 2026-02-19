/**
 * Docker Service
 * Handles API calls to the backend for Docker-related operations
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

export const fetchContainers = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.DOCKER_CONTAINERS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.DOCKER_CONTAINERS);
  }
  const data = await fetchJSON(API_ENDPOINTS.DOCKER_CONTAINERS);
  setCachedData(API_ENDPOINTS.DOCKER_CONTAINERS, data);
  return data;
};

export const startContainer = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_START(id), { method: 'POST' });
};

export const stopContainer = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_STOP(id), { method: 'POST' });
};

export const restartContainer = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_RESTART(id), { method: 'POST' });
};

export const fetchContainerMetrics = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_METRICS(id));
};

export const inspectContainer = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER(id));
};

export const inspectImage = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_IMAGE_INSPECT(id));
};

export const inspectVolume = async (name) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_VOLUME_INSPECT(name));
};

export const inspectNetwork = async (id) => {
  return fetchJSON(API_ENDPOINTS.DOCKER_NETWORK_INSPECT(id));
};

export const fetchContainerLogs = async (id, tail = 100) => {
  const url = `${API_ENDPOINTS.DOCKER_CONTAINER_LOGS(id)}?tail=${tail}`;
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.text();
};

export const fetchImages = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.DOCKER_IMAGES);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.DOCKER_IMAGES);
  }
  const data = await fetchJSON(API_ENDPOINTS.DOCKER_IMAGES);
  setCachedData(API_ENDPOINTS.DOCKER_IMAGES, data);
  return data;
};

export const fetchVolumes = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.DOCKER_VOLUMES);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.DOCKER_VOLUMES);
  }
  const data = await fetchJSON(API_ENDPOINTS.DOCKER_VOLUMES);
  setCachedData(API_ENDPOINTS.DOCKER_VOLUMES, data);
  return data;
};

export const fetchDockerNetworks = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.DOCKER_NETWORKS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.DOCKER_NETWORKS);
  }
  const data = await fetchJSON(API_ENDPOINTS.DOCKER_NETWORKS);
  setCachedData(API_ENDPOINTS.DOCKER_NETWORKS, data);
  return data;
};

export const fetchSystemInfo = async () => {
  return fetchJSON(API_ENDPOINTS.DOCKER_SYSTEM_INFO);
};

export const fetchSystemDisk = async () => {
  return fetchJSON(API_ENDPOINTS.DOCKER_SYSTEM_DISK);
};
