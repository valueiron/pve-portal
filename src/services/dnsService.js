/**
 * DNS service — CRUD operations for the valueiron_dns API via pve-backend proxy.
 */

import { API_ENDPOINTS } from '../config/api.js';

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    // 204 or empty body
    const text = await res.text();
    return text ? JSON.parse(text) : {};
};

const jsonHeaders = { 'Content-Type': 'application/json' };

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const listCustomers = () =>
    fetch(API_ENDPOINTS.DNS_CUSTOMERS).then(handleResponse);

export const createCustomer = (name) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMERS, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    }).then(handleResponse);

export const updateCustomer = (id, name) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER(id), {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    }).then(handleResponse);

export const deleteCustomer = (id) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER(id), { method: 'DELETE' }).then(handleResponse);

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export const listZones = (customerId) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER_ZONES(customerId)).then(handleResponse);

export const createZone = (customerId, name) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER_ZONES(customerId), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ name }),
    }).then(handleResponse);

export const deleteZone = (zoneId) =>
    fetch(API_ENDPOINTS.DNS_ZONE(zoneId), { method: 'DELETE' }).then(handleResponse);

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export const listRecords = (zoneId) =>
    fetch(API_ENDPOINTS.DNS_ZONE_RECORDS(zoneId)).then(handleResponse);

export const createRecord = (zoneId, data) =>
    fetch(API_ENDPOINTS.DNS_ZONE_RECORDS(zoneId), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(data),
    }).then(handleResponse);

export const updateRecord = (zoneId, recordId, data) =>
    fetch(API_ENDPOINTS.DNS_ZONE_RECORD(zoneId, recordId), {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(data),
    }).then(handleResponse);

export const deleteRecord = (zoneId, recordId) =>
    fetch(API_ENDPOINTS.DNS_ZONE_RECORD(zoneId, recordId), { method: 'DELETE' }).then(handleResponse);

// ---------------------------------------------------------------------------
// Blocklists
// ---------------------------------------------------------------------------

export const listBlocklists = (customerId) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER_BLOCKLISTS(customerId)).then(handleResponse);

export const createBlocklist = (customerId, data) =>
    fetch(API_ENDPOINTS.DNS_CUSTOMER_BLOCKLISTS(customerId), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(data),
    }).then(handleResponse);

export const updateBlocklist = (blocklistId, domains) =>
    fetch(API_ENDPOINTS.DNS_BLOCKLIST(blocklistId), {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ domains }),
    }).then(handleResponse);

export const deleteBlocklist = (blocklistId) =>
    fetch(API_ENDPOINTS.DNS_BLOCKLIST(blocklistId), { method: 'DELETE' }).then(handleResponse);
