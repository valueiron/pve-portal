import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';

const jsonFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errMsg = body.error || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  if (response.status === 204) return null;
  return response.json();
};

// ── cached list helper ─────────────────────────────────────────────────────
const cachedFetch = async (key, forceRefresh) => {
  if (!forceRefresh) {
    const cached = getCachedData(key);
    if (cached !== null) return cached;
  } else {
    clearCache(key);
  }
  const data = await jsonFetch(key);
  setCachedData(key, data);
  return data;
};

// ── Devices ────────────────────────────────────────────────────────────────
export const fetchDevices = (forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_DEVICES, forceRefresh);

// ── Networks (interfaces) ──────────────────────────────────────────────────
export const fetchNetworks = (deviceId, forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_NETWORKS(deviceId), forceRefresh);

export const createNetwork = async (deviceId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_NETWORKS(deviceId), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_NETWORKS(deviceId));
  return result;
};

export const updateNetwork = async (deviceId, iface, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_NETWORK(deviceId, iface), {
    method: 'PUT', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_NETWORKS(deviceId));
  return result;
};

export const deleteNetwork = async (deviceId, iface, ifType) => {
  const result = await jsonFetch(
    `${API_ENDPOINTS.VYOS_NETWORK(deviceId, iface)}?type=${ifType}`,
    { method: 'DELETE' },
  );
  clearCache(API_ENDPOINTS.VYOS_NETWORKS(deviceId));
  return result;
};

// ── VRFs ───────────────────────────────────────────────────────────────────
export const fetchVRFs = (deviceId, forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_VRFS(deviceId), forceRefresh);

export const createVRF = async (deviceId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_VRFS(deviceId), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_VRFS(deviceId));
  return result;
};

export const updateVRF = async (deviceId, vrf, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_VRF(deviceId, vrf), {
    method: 'PUT', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_VRFS(deviceId));
  return result;
};

export const deleteVRF = async (deviceId, vrf) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_VRF(deviceId, vrf), {
    method: 'DELETE',
  });
  clearCache(API_ENDPOINTS.VYOS_VRFS(deviceId));
  return result;
};

// ── VLANs ──────────────────────────────────────────────────────────────────
export const fetchVLANs = (deviceId, forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_VLANS(deviceId), forceRefresh);

export const createVLAN = async (deviceId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_VLANS(deviceId), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_VLANS(deviceId));
  return result;
};

export const updateVLAN = async (deviceId, iface, vlanId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_VLAN(deviceId, iface, vlanId), {
    method: 'PUT', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_VLANS(deviceId));
  return result;
};

export const deleteVLAN = async (deviceId, iface, vlanId, ifType) => {
  const result = await jsonFetch(
    `${API_ENDPOINTS.VYOS_VLAN(deviceId, iface, vlanId)}?type=${ifType}`,
    { method: 'DELETE' },
  );
  clearCache(API_ENDPOINTS.VYOS_VLANS(deviceId));
  return result;
};

// ── Firewall Policies ──────────────────────────────────────────────────────
export const fetchPolicies = (deviceId, forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId), forceRefresh);

export const createPolicy = async (deviceId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const updatePolicy = async (deviceId, policy, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICY(deviceId, policy), {
    method: 'PUT', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const deletePolicy = async (deviceId, policy) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICY(deviceId, policy), {
    method: 'DELETE',
  });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

// ── Firewall Rules ─────────────────────────────────────────────────────────
export const addRule = async (deviceId, policy, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_RULES(deviceId, policy), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const deleteRule = async (deviceId, policy, ruleId) => {
  const result = await jsonFetch(
    API_ENDPOINTS.VYOS_FIREWALL_RULE(deviceId, policy, ruleId),
    { method: 'DELETE' },
  );
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const disablePolicy = async (deviceId, policy) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICY_DISABLE(deviceId, policy), { method: 'PUT' });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const enablePolicy = async (deviceId, policy) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_POLICY_ENABLE(deviceId, policy), { method: 'PUT' });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const disableRule = async (deviceId, policy, ruleId) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_RULE_DISABLE(deviceId, policy, ruleId), { method: 'PUT' });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

export const enableRule = async (deviceId, policy, ruleId) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_FIREWALL_RULE_ENABLE(deviceId, policy, ruleId), { method: 'PUT' });
  clearCache(API_ENDPOINTS.VYOS_FIREWALL_POLICIES(deviceId));
  return result;
};

// ── Address Groups ─────────────────────────────────────────────────────────
export const fetchAddressGroups = (deviceId, forceRefresh = false) =>
  cachedFetch(API_ENDPOINTS.VYOS_ADDRESS_GROUPS(deviceId), forceRefresh);

export const createAddressGroup = async (deviceId, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_ADDRESS_GROUPS(deviceId), {
    method: 'POST', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_ADDRESS_GROUPS(deviceId));
  return result;
};

export const updateAddressGroup = async (deviceId, group, data) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_ADDRESS_GROUP(deviceId, group), {
    method: 'PUT', body: JSON.stringify(data),
  });
  clearCache(API_ENDPOINTS.VYOS_ADDRESS_GROUPS(deviceId));
  return result;
};

export const deleteAddressGroup = async (deviceId, group) => {
  const result = await jsonFetch(API_ENDPOINTS.VYOS_ADDRESS_GROUP(deviceId, group), {
    method: 'DELETE',
  });
  clearCache(API_ENDPOINTS.VYOS_ADDRESS_GROUPS(deviceId));
  return result;
};
