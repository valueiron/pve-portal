/**
 * Routes service — CRUD operations for the route-api (Traefik HTTP provider) via pve-backend proxy.
 */

import { API_ENDPOINTS } from '../config/api.js';

const handleResponse = async (res) => {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
};

const jsonHeaders = { 'Content-Type': 'application/json' };

export const getStatus = () =>
    fetch(API_ENDPOINTS.ROUTES_STATUS).then(handleResponse);

export const listRoutes = () =>
    fetch(API_ENDPOINTS.ROUTES).then(handleResponse);

export const createRoute = (data) =>
    fetch(API_ENDPOINTS.ROUTES, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(data),
    }).then(handleResponse);

export const updateRoute = (id, data) =>
    fetch(API_ENDPOINTS.ROUTE(id), {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(data),
    }).then(handleResponse);

export const deleteRoute = (id) =>
    fetch(API_ENDPOINTS.ROUTE(id), { method: 'DELETE' }).then(handleResponse);
