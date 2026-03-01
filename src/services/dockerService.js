/**
 * Docker Service
 * Handles API calls to the backend for Docker-related operations
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

export const fetchContainers = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.DOCKER_CONTAINERS, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.DOCKER_CONTAINERS));

export const fetchImages = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.DOCKER_IMAGES, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.DOCKER_IMAGES));

export const fetchVolumes = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.DOCKER_VOLUMES, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.DOCKER_VOLUMES));

export const fetchDockerNetworks = (forceRefresh = false) =>
  withCache(API_ENDPOINTS.DOCKER_NETWORKS, forceRefresh, () =>
    fetchJSON(API_ENDPOINTS.DOCKER_NETWORKS));

export const startContainer = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_START(id), { method: 'POST' });

export const stopContainer = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_STOP(id), { method: 'POST' });

export const restartContainer = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_RESTART(id), { method: 'POST' });

export const fetchContainerMetrics = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_METRICS(id));

export const inspectContainer = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER(id));

export const inspectImage = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_IMAGE_INSPECT(id));

export const inspectVolume = (name) =>
  fetchJSON(API_ENDPOINTS.DOCKER_VOLUME_INSPECT(name));

export const inspectNetwork = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_NETWORK_INSPECT(id));

export const fetchContainerLogs = async (id, tail = 100) => {
  const response = await fetch(`${API_ENDPOINTS.DOCKER_CONTAINER_LOGS(id)}?tail=${tail}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${response.status}`);
  }
  return response.text();
};

export const createContainerExecSession = (id, shell = 'auto') =>
  fetchJSON(API_ENDPOINTS.DOCKER_CONTAINER_EXEC_SESSION(id), {
    method: 'POST',
    body: JSON.stringify({ shell }),
  });

export const fetchSystemInfo = () =>
  fetchJSON(API_ENDPOINTS.DOCKER_SYSTEM_INFO);

export const fetchSystemDisk = () =>
  fetchJSON(API_ENDPOINTS.DOCKER_SYSTEM_DISK);
