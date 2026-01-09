/**
 * VM Service
 * Handles API calls to the backend for VM-related operations
 */
import { API_ENDPOINTS } from '../config/api';

/**
 * Fetch all VMs from the backend
 * @returns {Promise<Array>} Array of VM objects
 */
export const fetchVMs = async () => {
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
    return data.vms || [];
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
