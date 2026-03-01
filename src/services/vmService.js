/**
 * VM Service
 * Handles API calls to the backend for VM-related operations
 */
import { API_ENDPOINTS } from '../config/api';
import { getCachedData, setCachedData } from '../utils/cache';
import fetchJSON from '../utils/fetchJSON';

export const fetchVMs = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getCachedData(API_ENDPOINTS.VMS);
    if (cached !== null) return cached;
  }
  const vms = (await fetchJSON(API_ENDPOINTS.VMS)).vms ?? [];
  setCachedData(API_ENDPOINTS.VMS, vms);
  return vms;
};

export const fetchVMDetails = (vmid) =>
  fetchJSON(API_ENDPOINTS.VM_DETAILS(vmid));

export const startVM = (vmid) =>
  fetchJSON(API_ENDPOINTS.VM_START(vmid), { method: 'POST' });

export const shutdownVM = (vmid) =>
  fetchJSON(API_ENDPOINTS.VM_SHUTDOWN(vmid), { method: 'POST' });

export const createVNCProxy = (vmid) =>
  fetchJSON(API_ENDPOINTS.VNC_PROXY(vmid), { method: 'POST' });

export const createTerminalSession = (vmid) =>
  fetchJSON(API_ENDPOINTS.TERMINAL_SESSION(vmid), { method: 'POST' });
