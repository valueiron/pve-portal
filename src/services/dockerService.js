/**
 * Docker Service
 * Handles API calls to the backend for Docker-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';
import API_BASE_URL from '../config/api';

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

export const fetchVulnStatus = () =>
  fetchJSON(API_ENDPOINTS.DOCKER_VULN_STATUS);

export const triggerTrivyDownload = () =>
  fetchJSON(API_ENDPOINTS.DOCKER_VULN_DOWNLOAD, { method: 'POST' });

export const scanImageVulnerabilities = (imageRef) =>
  fetch(API_ENDPOINTS.DOCKER_VULN_SCAN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageRef }),
    signal: AbortSignal.timeout(300_000),
  }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || 'scan failed'))));

// ── Multi-host / agent management ────────────────────────────────────────────

export const fetchHosts = () => fetchJSON(API_ENDPOINTS.DOCKER_HOSTS);

export const createAgent = (name) =>
  fetchJSON(API_ENDPOINTS.DOCKER_AGENTS, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const deleteAgent = (id) =>
  fetchJSON(API_ENDPOINTS.DOCKER_AGENT(id), { method: 'DELETE' });

/**
 * Creates a service object scoped to a specific Docker host.
 *
 * hostId = 'local'  → uses the standard /api/docker/* endpoints (local docker-api)
 * hostId = <uuid>   → routes through the agent tunnel at /api/docker/agents/<uuid>/*
 */
export function createDockerService(hostId) {
  const isLocal = !hostId || hostId === 'local';
  const agentId = isLocal ? null : hostId;
  const base = isLocal
    ? `${API_BASE_URL}/api/docker`
    : `${API_BASE_URL}/api/docker/agents/${hostId}`;

  const get = (path) => fetchJSON(`${base}${path}`);
  const post = (path, body) => fetchJSON(`${base}${path}`, {
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const del = (path) => fetchJSON(`${base}${path}`, { method: 'DELETE' });

  return {
    hostId: hostId || 'local',
    supportsExec: true,

    fetchContainers: () => get('/containers'),
    startContainer:  (id) => post(`/containers/${id}/start`),
    stopContainer:   (id) => post(`/containers/${id}/stop`),
    restartContainer: (id) => post(`/containers/${id}/restart`),
    removeContainer: (id) => del(`/containers/${id}`),
    inspectContainer: (id) => get(`/containers/${id}`),
    fetchContainerMetrics: (id) => get(`/containers/${id}/metrics`),
    fetchContainerLogs: async (id, tail = 100) => {
      const resp = await fetch(`${base}/containers/${id}/logs?tail=${tail}`);
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      return resp.text();
    },
    createContainerExecSession: (id, shell = 'auto') => fetchJSON(`${base}/containers/${id}/exec`, {
      method: 'POST',
      body: JSON.stringify({ shell }),
    }),
    execWsUrl: isLocal
      ? (sessionId) => API_ENDPOINTS.DOCKER_CONTAINER_EXEC_WEBSOCKET(sessionId)
      : (sessionId) => API_ENDPOINTS.DOCKER_AGENT_EXEC_WEBSOCKET(agentId, sessionId),

    fetchImages:  () => get('/images'),
    inspectImage: (id) => get(`/images/${encodeURIComponent(id)}`),
    pullImage:    (image) => post(`/images/pull?image=${encodeURIComponent(image)}`),
    removeImage:  (id) => del(`/images/${id}`),

    fetchVolumes:  () => get('/volumes'),
    inspectVolume: (name) => get(`/volumes/${encodeURIComponent(name)}`),
    removeVolume:  (name) => del(`/volumes/${encodeURIComponent(name)}`),

    fetchDockerNetworks: () => get('/networks'),
    inspectNetwork:      (id) => get(`/networks/${encodeURIComponent(id)}`),

    fetchSystemInfo: () => get('/system/info'),
    fetchSystemDisk: () => get('/system/disk'),

    fetchVulnStatus:          () => get('/vulnerabilities/status'),
    triggerTrivyDownload:     () => post('/vulnerabilities/download'),
    scanImageVulnerabilities: (imageRef) =>
      fetch(`${base}/vulnerabilities/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageRef }),
        signal: AbortSignal.timeout(300_000),
      }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || 'scan failed')))),
  };
}
