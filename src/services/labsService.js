/**
 * Labs Service
 * Handles API calls to the backend for labs management.
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';

// ---------------------------------------------------------------------------
// Repo management
// ---------------------------------------------------------------------------

export const fetchRepos = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.LABS_REPOS);
    if (cached !== null) return cached;
  }
  const data = await fetchJSON(API_ENDPOINTS.LABS_REPOS);
  const repos = data.repos || [];
  setCachedData(API_ENDPOINTS.LABS_REPOS, repos);
  return repos;
};

export const addRepo = async (name, url, branch = 'main') => {
  const data = await fetchJSON(API_ENDPOINTS.LABS_REPOS, {
    method: 'POST',
    body: JSON.stringify({ name, url, branch }),
  });
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return data.repo;
};

export const deleteRepo = async (id) => {
  const data = await fetchJSON(API_ENDPOINTS.LABS_REPO(id), { method: 'DELETE' });
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return data;
};

export const syncRepo = async (id) => {
  const data = await fetchJSON(API_ENDPOINTS.LABS_REPO_SYNC(id), { method: 'POST' });
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return data;
};

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

export const fetchLabs = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.LABS);
    if (cached !== null) return cached;
  }
  const data = await fetchJSON(API_ENDPOINTS.LABS);
  const labs = data.labs || [];
  setCachedData(API_ENDPOINTS.LABS, labs);
  return labs;
};

export const fetchLabDetails = async (id) => {
  const cacheKey = API_ENDPOINTS.LAB(id);
  const cached = getCachedData(cacheKey);
  if (cached !== null) return cached;
  const data = await fetchJSON(cacheKey);
  setCachedData(cacheKey, data.lab);
  return data.lab;
};

export const fetchLabInstructions = async (id) => {
  const cacheKey = API_ENDPOINTS.LAB_INSTRUCTIONS(id);
  const cached = getCachedData(cacheKey);
  if (cached !== null) return cached;
  const data = await fetchJSON(cacheKey);
  const instructions = data.instructions || '';
  setCachedData(cacheKey, instructions);
  return instructions;
};

export const launchLab = (id, action = 'deploy', params = {}) =>
  fetchJSON(API_ENDPOINTS.LAB_LAUNCH(id), {
    method: 'POST',
    body: JSON.stringify({ action, ...params }),
  });

export const fetchLabStatus = (id) =>
  fetchJSON(API_ENDPOINTS.LAB_STATUS(id));

export const fetchLabVms = async (id) => {
  const data = await fetchJSON(API_ENDPOINTS.LAB_VMS(id));
  return data.vms || [];
};

export const registerLabVms = (id, vms) =>
  fetchJSON(API_ENDPOINTS.LAB_VMS(id), {
    method: 'POST',
    body: JSON.stringify({ vms }),
  });

export const validateLab = (id) =>
  fetchJSON(API_ENDPOINTS.LAB_VALIDATE(id), { method: 'POST' });
