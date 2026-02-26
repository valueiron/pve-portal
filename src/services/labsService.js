/**
 * Labs Service
 * Handles API calls to the backend for labs management.
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';

// ---------------------------------------------------------------------------
// Repo management
// ---------------------------------------------------------------------------

export const fetchRepos = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.LABS_REPOS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.LABS_REPOS);
  }

  const response = await fetch(API_ENDPOINTS.LABS_REPOS, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const repos = data.repos || [];
  setCachedData(API_ENDPOINTS.LABS_REPOS, repos);
  return repos;
};

export const addRepo = async (name, url, branch = 'main') => {
  const response = await fetch(API_ENDPOINTS.LABS_REPOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url, branch }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return data.repo;
};

export const deleteRepo = async (id) => {
  const response = await fetch(API_ENDPOINTS.LABS_REPO(id), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return await response.json();
};

export const syncRepo = async (id) => {
  const response = await fetch(API_ENDPOINTS.LABS_REPO_SYNC(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  clearCache(API_ENDPOINTS.LABS_REPOS);
  clearCache(API_ENDPOINTS.LABS);
  return await response.json();
};

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

export const fetchLabs = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.LABS);
    if (cached !== null) return cached;
  } else {
    clearCache(API_ENDPOINTS.LABS);
  }

  const response = await fetch(API_ENDPOINTS.LABS, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const labs = data.labs || [];
  setCachedData(API_ENDPOINTS.LABS, labs);
  return labs;
};

export const fetchLabDetails = async (id) => {
  const cacheKey = API_ENDPOINTS.LAB(id);
  const cached = getCachedData(cacheKey);
  if (cached !== null) return cached;

  const response = await fetch(cacheKey, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  setCachedData(cacheKey, data.lab);
  return data.lab;
};

export const fetchLabInstructions = async (id) => {
  const cacheKey = API_ENDPOINTS.LAB_INSTRUCTIONS(id);
  const cached = getCachedData(cacheKey);
  if (cached !== null) return cached;

  const response = await fetch(cacheKey, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  setCachedData(cacheKey, data.instructions || '');
  return data.instructions || '';
};

export const launchLab = async (id, action = 'deploy') => {
  const response = await fetch(API_ENDPOINTS.LAB_LAUNCH(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return await response.json();
};

export const fetchLabStatus = async (id) => {
  const response = await fetch(API_ENDPOINTS.LAB_STATUS(id), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return await response.json();
};
