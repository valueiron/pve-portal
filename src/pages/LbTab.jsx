import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSyncAlt } from 'react-icons/fa';
import { getStatus, listRoutes, createRoute, updateRoute, deleteRoute } from '../services/routesService';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    backgroundColor: 'var(--bg-surface-3)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
};

const btnPrimary = {
    padding: '0.55rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#000',
    fontWeight: '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
};

const btnGhost = {
    ...btnPrimary,
    background: 'var(--bg-surface-3)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
};

const btnDanger = {
    ...btnPrimary,
    background: 'transparent',
    color: 'var(--red, #ef4444)',
    border: '1px solid var(--red, #ef4444)',
};

const btnIconSm = {
    padding: '0.3rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-strong)',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.8rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
};

// ---------------------------------------------------------------------------
// RouteModal
// ---------------------------------------------------------------------------
function RouteModal({ route, onClose, onSave }) {
    const [form, setForm] = useState({
        name:        route?.name        ?? '',
        rule:        route?.rule        ?? '',
        serviceUrls: route?.serviceUrls ? route.serviceUrls.join('\n') : '',
        entryPoints: route?.entryPoints ? route.entryPoints.join(', ') : 'websecure',
        middlewares: route?.middlewares ? route.middlewares.join(', ') : '',
        priority:    route?.priority    != null ? String(route.priority) : '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const payload = {
                name:       form.name.trim(),
                rule:       form.rule.trim(),
                serviceUrls: form.serviceUrls.split('\n').map((s) => s.trim()).filter(Boolean),
            };
            const eps = form.entryPoints.split(',').map((s) => s.trim()).filter(Boolean);
            if (eps.length) payload.entryPoints = eps;
            const mws = form.middlewares.split(',').map((s) => s.trim()).filter(Boolean);
            if (mws.length) payload.middlewares = mws;
            if (form.priority.trim() !== '') payload.priority = Number(form.priority);

            await onSave(payload);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                width: '480px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    {route ? 'Edit Route' : 'Add Route'}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Name *
                            <input style={{ ...inputStyle, marginTop: '0.3rem' }}
                                value={form.name} onChange={set('name')} required />
                        </label>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Rule *
                            <input style={{ ...inputStyle, marginTop: '0.3rem' }}
                                value={form.rule} onChange={set('rule')}
                                placeholder="Host(`app.example.com`)" required />
                        </label>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Service URLs * (one per line)
                            <textarea style={{ ...inputStyle, marginTop: '0.3rem', minHeight: '80px', resize: 'vertical' }}
                                value={form.serviceUrls} onChange={set('serviceUrls')}
                                placeholder="http://service:80" required />
                        </label>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Entry Points (comma-separated)
                            <input style={{ ...inputStyle, marginTop: '0.3rem' }}
                                value={form.entryPoints} onChange={set('entryPoints')}
                                placeholder="websecure" />
                        </label>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Middlewares (comma-separated)
                            <input style={{ ...inputStyle, marginTop: '0.3rem' }}
                                value={form.middlewares} onChange={set('middlewares')}
                                placeholder="keycloak-auth@file, secure-headers@file" />
                        </label>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Priority (optional)
                            <input style={{ ...inputStyle, marginTop: '0.3rem' }}
                                type="number" value={form.priority} onChange={set('priority')} />
                        </label>
                    </div>
                    {error && (
                        <div style={{
                            marginTop: '1rem', padding: '0.6rem 0.75rem',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red, #ef4444)',
                            borderRadius: 'var(--radius-sm)', color: 'var(--red, #ef4444)', fontSize: '0.85rem',
                        }}>
                            {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                        <button type="button" style={btnGhost} onClick={onClose} disabled={submitting}>
                            Cancel
                        </button>
                        <button type="submit" style={btnPrimary} disabled={submitting}>
                            {submitting ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// DeleteConfirm modal
// ---------------------------------------------------------------------------
function DeleteConfirm({ route, onClose, onConfirm }) {
    const [submitting, setSubmitting] = useState(false);

    const handleConfirm = async () => {
        setSubmitting(true);
        await onConfirm();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div style={{
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                width: '380px',
                maxWidth: '95vw',
            }}>
                <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                    Delete Route
                </h3>
                <p style={{ margin: '0 0 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Delete <strong style={{ color: 'var(--text-primary)' }}>{route.name}</strong>? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button style={btnGhost} onClick={onClose} disabled={submitting}>Cancel</button>
                    <button style={btnDanger} onClick={handleConfirm} disabled={submitting}>
                        {submitting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// LbTab
// ---------------------------------------------------------------------------
export default function LbTab() {
    const [available, setAvailable] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState(null);
    const [deleteConfirmRoute, setDeleteConfirmRoute] = useState(null);

    const loadStatus = async () => {
        try {
            const status = await getStatus();
            setAvailable(status.available);
            if (status.available) {
                await loadRoutes();
            }
        } catch (err) {
            setAvailable(false);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadRoutes = async () => {
        try {
            const data = await listRoutes();
            setRoutes(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await loadStatus();
    };

    const handleSave = async (payload) => {
        if (editingRoute) {
            await updateRoute(editingRoute.id ?? editingRoute.name, payload);
        } else {
            await createRoute(payload);
        }
        await loadRoutes();
    };

    const handleDelete = async () => {
        try {
            await deleteRoute(deleteConfirmRoute.id ?? deleteConfirmRoute.name);
            setDeleteConfirmRoute(null);
            await loadRoutes();
        } catch (err) {
            setError(err.message);
            setDeleteConfirmRoute(null);
        }
    };

    const openAdd = () => { setEditingRoute(null); setModalOpen(true); };
    const openEdit = (r) => { setEditingRoute(r); setModalOpen(true); };

    if (loading) {
        return <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading…</div>;
    }

    if (!available) {
        return (
            <div style={{
                padding: '1.25rem 1.5rem',
                background: 'var(--bg-surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
            }}>
                Load Balancer not configured. Set <code style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>ROUTE_API_URL</code> on the backend to enable.
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                <button style={btnPrimary} onClick={openAdd}>
                    <FaPlus /> Add Route
                </button>
                <button style={btnGhost} onClick={handleRefresh}>
                    <FaSyncAlt /> Refresh
                </button>
                {error && (
                    <span style={{ marginLeft: '0.5rem', color: 'var(--red, #ef4444)', fontSize: '0.85rem' }}>
                        {error}
                    </span>
                )}
            </div>

            {/* Routes table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%', borderCollapse: 'collapse',
                    fontSize: '0.875rem', color: 'var(--text-primary)',
                }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                            {['Name', 'Rule', 'Service URLs', 'Middlewares', ''].map((h) => (
                                <th key={h} style={{
                                    padding: '0.6rem 0.75rem', textAlign: 'left',
                                    color: 'var(--text-secondary)', fontWeight: '500', fontSize: '0.8rem',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {routes.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '1.5rem 0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                    No routes configured.
                                </td>
                            </tr>
                        )}
                        {routes.map((r) => (
                            <tr key={r.id ?? r.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: '500' }}>{r.name}</td>
                                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.rule}</td>
                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                    {(r.serviceUrls ?? []).join(', ') || '—'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                    {(r.middlewares ?? []).join(', ') || '—'}
                                </td>
                                <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                                    <button style={{ ...btnIconSm, color: 'var(--text-secondary)', marginRight: '0.4rem' }}
                                        title="Edit" onClick={() => openEdit(r)}>
                                        <FaEdit />
                                    </button>
                                    <button style={{ ...btnIconSm, color: 'var(--red, #ef4444)', borderColor: 'var(--red, #ef4444)' }}
                                        title="Delete" onClick={() => setDeleteConfirmRoute(r)}>
                                        <FaTrash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <RouteModal
                    route={editingRoute}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
            {deleteConfirmRoute && (
                <DeleteConfirm
                    route={deleteConfirmRoute}
                    onClose={() => setDeleteConfirmRoute(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
