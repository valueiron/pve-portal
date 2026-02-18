/**
 * VM Service
 * Handles API calls to the backend for VM-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData, clearCache } from '../utils/cache';

/**
 * Fetch all VMs from the backend
 * @param {boolean} forceRefresh - If true, bypass cache and fetch fresh data
 * @returns {Promise<Array>} Array of VM objects
 */
export const fetchVMs = async (forceRefresh = false) => {
  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cachedData = getCachedData(API_ENDPOINTS.VMS);
    if (cachedData !== null) {
      return cachedData;
    }
  } else {
    // Clear cache if forcing refresh
    clearCache(API_ENDPOINTS.VMS);
  }

  try {
    const response = await fetch(API_ENDPOINTS.VMS, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const vms = data.vms || [];
    
    // Store in cache
    setCachedData(API_ENDPOINTS.VMS, vms);
    
    return vms;
  } catch (error) {
    console.error('Error fetching VMs:', error);
    throw error;
  }
};

/**
 * Fetch detailed information about a specific VM
 * @param {number} vmid - Virtual Machine ID
 * @returns {Promise<Object>} VM details object
 */
export const fetchVMDetails = async (vmid) => {
  try {
    const response = await fetch(API_ENDPOINTS.VM_DETAILS(vmid), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching VM ${vmid} details:`, error);
    throw error;
  }
};

/**
 * Start a virtual machine
 * @param {number} vmid - Virtual Machine ID
 * @returns {Promise<Object>} Response data
 */
export const startVM = async (vmid) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.VM_DETAILS(vmid)}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error starting VM ${vmid}:`, error);
    throw error;
  }
};

/**
 * Create a VNC proxy ticket for a Proxmox VM
 * @param {number} vmid - Virtual Machine ID
 * @returns {Promise<Object>} VNC proxy info (ticket, port, node)
 */
export const createVNCProxy = async (vmid) => {
  try {
    const response = await fetch(API_ENDPOINTS.VNC_PROXY(vmid), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error creating VNC proxy for VM ${vmid}:`, error);
    throw error;
  }
};

/**
 * Fetch all Proxmox VM templates
 * @returns {Promise<Array>} Array of template objects { vmid, name, node }
 */
export const fetchTemplates = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.TEMPLATES, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Clone a VM or template to a new VM
 * @param {Object} cloneConfig
 * @param {string} cloneConfig.node - Source node name
 * @param {number} cloneConfig.vmid - Source VM/template ID
 * @param {number} cloneConfig.newid - New VM ID
 * @param {string} [cloneConfig.name] - Optional name for the new VM
 * @param {boolean} [cloneConfig.full=true] - Full clone vs linked clone
 * @param {string} [cloneConfig.storage] - Storage pool for full clone
 * @returns {Promise<Object>} Response data
 */
export const cloneVM = async (cloneConfig) => {
  try {
    const response = await fetch(API_ENDPOINTS.CLONE_VM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cloneConfig),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error cloning VM:', error);
    throw error;
  }
};

/**
 * Get the next available VM ID from the Proxmox cluster
 * @returns {Promise<number>} Next available VM ID
 */
export const getNextVmId = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.NEXT_VMID, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.vmid;
  } catch (error) {
    console.error('Error fetching next VM ID:', error);
    throw error;
  }
};

/**
 * Create a new Proxmox virtual machine
 * @param {Object} vmConfig - VM configuration
 * @param {string} vmConfig.node - Proxmox node name
 * @param {number} vmConfig.vmid - VM ID
 * @param {string} vmConfig.name - VM name
 * @param {number} vmConfig.cores - CPU cores
 * @param {number} vmConfig.memory - Memory in MB
 * @param {string} vmConfig.storage - Storage pool name
 * @param {number} vmConfig.disk_gb - Disk size in GB
 * @param {boolean} vmConfig.start - Start after creation
 * @returns {Promise<Object>} Response data
 */
export const createVM = async (vmConfig) => {
  try {
    const response = await fetch(API_ENDPOINTS.VMS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vmConfig),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating VM:', error);
    throw error;
  }
};

/**
 * Shutdown a virtual machine
 * @param {number} vmid - Virtual Machine ID
 * @returns {Promise<Object>} Response data
 */
export const shutdownVM = async (vmid) => {
  try {
    const response = await fetch(`${API_ENDPOINTS.VM_DETAILS(vmid)}/shutdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error shutting down VM ${vmid}:`, error);
    throw error;
  }
};
