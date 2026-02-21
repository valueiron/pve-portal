/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 *
 * All API calls go through nginx on the same origin (port 80).
 * Nginx proxies /api/ → pve-backend:5000  and  /vnc → pve-backend:5001
 *
 * Override priority:
 * 1. Runtime config from window.__API_BASE_URL__ (set by config.js in Docker)
 * 2. Build-time env var VITE_API_BASE_URL
 * 3. Same origin as the page (default — works for any host/IP)
 */

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__;
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Use the same origin as the page — nginx proxies /api/ to the backend
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// WebSocket base — nginx proxies /vnc to pve-backend:5001
const getWsBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }
  return 'ws://localhost';
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

  // VyOS endpoints
  VYOS_DEVICES: `${API_BASE_URL}/api/vyos/devices`,
  VYOS_NETWORKS: (deviceId) => `${API_BASE_URL}/api/vyos/${deviceId}/networks`,
  VYOS_NETWORK: (deviceId, iface) => `${API_BASE_URL}/api/vyos/${deviceId}/networks/${iface}`,
  VYOS_VRFS: (deviceId) => `${API_BASE_URL}/api/vyos/${deviceId}/vrfs`,
  VYOS_VRF: (deviceId, vrf) => `${API_BASE_URL}/api/vyos/${deviceId}/vrfs/${vrf}`,
  VYOS_VLANS: (deviceId) => `${API_BASE_URL}/api/vyos/${deviceId}/vlans`,
  VYOS_VLAN: (deviceId, iface, vlanId) => `${API_BASE_URL}/api/vyos/${deviceId}/vlans/${iface}/${vlanId}`,
  VYOS_FIREWALL_POLICIES: (deviceId) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies`,
  VYOS_FIREWALL_POLICY: (deviceId, policy) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}`,
  VYOS_FIREWALL_RULE: (deviceId, policy, ruleId) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/rules/${ruleId}`,
  VYOS_FIREWALL_RULES: (deviceId, policy) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/rules`,
  VYOS_ADDRESS_GROUPS: (deviceId) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/address-groups`,
  VYOS_ADDRESS_GROUP: (deviceId, group) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/address-groups/${group}`,
  VYOS_FIREWALL_POLICY_DISABLE: (deviceId, policy) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/disable`,
  VYOS_FIREWALL_POLICY_ENABLE: (deviceId, policy) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/enable`,
  VYOS_FIREWALL_RULE_DISABLE: (deviceId, policy, ruleId) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/rules/${ruleId}/disable`,
  VYOS_FIREWALL_RULE_ENABLE: (deviceId, policy, ruleId) => `${API_BASE_URL}/api/vyos/${deviceId}/firewall/policies/${policy}/rules/${ruleId}/enable`,
  VYOS_NAT_RULES: (deviceId, natType) => `${API_BASE_URL}/api/vyos/${deviceId}/nat/${natType}/rules`,
  VYOS_NAT_RULE: (deviceId, natType, ruleId) => `${API_BASE_URL}/api/vyos/${deviceId}/nat/${natType}/rules/${ruleId}`,
};

export default API_BASE_URL;

