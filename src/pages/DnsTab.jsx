import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSyncAlt, FaChevronRight, FaArrowLeft, FaGlobe, FaShieldAlt } from 'react-icons/fa';
import * as dns from '../services/dnsService';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'SRV'];

const RECORD_TYPE_COLORS = {
    A:     { bg: 'rgba(6, 182, 212, 0.12)',  border: '#06b6d4', text: '#06b6d4' },
    AAAA:  { bg: 'rgba(6, 182, 212, 0.08)',  border: '#0891b2', text: '#0891b2' },
    CNAME: { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#10b981' },
    TXT:   { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#f59e0b' },
    MX:    { bg: 'rgba(139, 92, 246, 0.12)', border: '#8b5cf6', text: '#8b5cf6' },
    SRV:   { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#f97316' },
};

// ---------------------------------------------------------------------------
// Shared input style
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

const btnDanger = {
    ...btnPrimary,
    background: 'var(--red-muted)',
    color: 'var(--red)',
    border: '1px solid var(--red)',
};

const btnGhost = {
    ...btnPrimary,
    background: 'var(--bg-surface-3)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-strong)',
};

// ---------------------------------------------------------------------------
// Modal overlay
// ---------------------------------------------------------------------------
const Modal = ({ title, onClose, onSubmit, submitting, children }) => (
    <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <div style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            minWidth: '420px',
            maxWidth: '90vw',
            boxShadow: 'var(--shadow-lg)',
        }}>
            <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>
                {title}
            </h3>
            {children}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button style={btnGhost} onClick={onClose} disabled={submitting}>Cancel</button>
                <button style={btnPrimary} onClick={onSubmit} disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------
const Field = ({ label, children }) => (
    <div style={{ marginBottom: '0.9rem' }}>
        <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {label}
        </label>
        {children}
    </div>
);

// ---------------------------------------------------------------------------
// Record type badge
// ---------------------------------------------------------------------------
const TypeBadge = ({ type }) => {
    const c = RECORD_TYPE_COLORS[type] || { bg: 'var(--bg-surface-3)', border: 'var(--border-strong)', text: 'var(--text-secondary)' };
    return (
        <span style={{
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.text,
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-mono)',
        }}>
            {type}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
const SectionHeader = ({ title, action }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
        </h3>
        {action}
    </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const DnsTab = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [records, setRecords] = useState([]);
    const [blocklists, setBlocklists] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Modal: { type: string, data?: object }
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});

    // -----------------------------------------------------------------------
    // Loaders
    // -----------------------------------------------------------------------
    const loadCustomers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await dns.listCustomers();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(`Failed to load customers: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadZones = async (customerId) => {
        try {
            const data = await dns.listZones(customerId);
            setZones(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(`Failed to load zones: ${e.message}`);
        }
    };

    const loadRecords = async (zoneId) => {
        try {
            const data = await dns.listRecords(zoneId);
            setRecords(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(`Failed to load records: ${e.message}`);
        }
    };

    const loadBlocklists = async (customerId) => {
        try {
            const data = await dns.listBlocklists(customerId);
            setBlocklists(Array.isArray(data) ? data : []);
        } catch (e) {
            // non-critical
        }
    };

    useEffect(() => { loadCustomers(); }, []);

    useEffect(() => {
        if (selectedCustomer) {
            loadZones(selectedCustomer.id);
            loadBlocklists(selectedCustomer.id);
            setSelectedZone(null);
            setRecords([]);
        } else {
            setZones([]);
            setBlocklists([]);
            setSelectedZone(null);
            setRecords([]);
        }
    }, [selectedCustomer]);

    useEffect(() => {
        if (selectedZone) {
            loadRecords(selectedZone.id);
        } else {
            setRecords([]);
        }
    }, [selectedZone]);

    // -----------------------------------------------------------------------
    // Modal helpers
    // -----------------------------------------------------------------------
    const openModal = (type, data = {}, initialForm = {}) => {
        setModal({ type, data });
        setForm(initialForm);
    };
    const closeModal = () => { setModal(null); setForm({}); };

    // -----------------------------------------------------------------------
    // Submit handlers
    // -----------------------------------------------------------------------
    const handleSubmit = async () => {
        if (!modal) return;
        setSubmitting(true);
        setError(null);
        try {
            switch (modal.type) {
                case 'addCustomer': {
                    if (!form.name?.trim()) { setError("Name is required"); return; }
                    await dns.createCustomer(form.name.trim());
                    await loadCustomers();
                    break;
                }
                case 'editCustomer': {
                    if (!form.name?.trim()) { setError("Name is required"); return; }
                    await dns.updateCustomer(modal.data.id, form.name.trim());
                    await loadCustomers();
                    if (selectedCustomer?.id === modal.data.id) {
                        setSelectedCustomer(prev => ({ ...prev, name: form.name.trim() }));
                    }
                    break;
                }
                case 'addZone': {
                    if (!form.name?.trim()) { setError("Zone name is required"); return; }
                    await dns.createZone(selectedCustomer.id, form.name.trim());
                    await loadZones(selectedCustomer.id);
                    break;
                }
                case 'addRecord': {
                    if (!form.name?.trim() || !form.type || !form.value?.trim()) {
                        setError("Name, type, and value are required");
                        return;
                    }
                    await dns.createRecord(selectedZone.id, {
                        name: form.name.trim(),
                        type: form.type,
                        value: form.value.trim(),
                        ttl: parseInt(form.ttl) || 3600,
                    });
                    await loadRecords(selectedZone.id);
                    break;
                }
                case 'editRecord': {
                    if (!form.value?.trim()) { setError("Value is required"); return; }
                    await dns.updateRecord(selectedZone.id, modal.data.id, {
                        value: form.value.trim(),
                        ttl: parseInt(form.ttl) || 3600,
                    });
                    await loadRecords(selectedZone.id);
                    break;
                }
                case 'addBlocklist': {
                    if (!form.name?.trim()) { setError("Name is required"); return; }
                    const domains = (form.domains || '').split('\n').map(d => d.trim()).filter(Boolean);
                    await dns.createBlocklist(selectedCustomer.id, { name: form.name.trim(), domains });
                    await loadBlocklists(selectedCustomer.id);
                    break;
                }
                case 'editBlocklist': {
                    const domains = (form.domains || '').split('\n').map(d => d.trim()).filter(Boolean);
                    await dns.updateBlocklist(modal.data.id, domains);
                    await loadBlocklists(selectedCustomer.id);
                    break;
                }
                default: break;
            }
            closeModal();
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Delete handlers
    // -----------------------------------------------------------------------
    const deleteCustomer = async (customer) => {
        if (!window.confirm(`Delete customer "${customer.name}"? This removes all their zones and records.`)) return;
        try {
            await dns.deleteCustomer(customer.id);
            if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
            await loadCustomers();
        } catch (e) {
            setError(`Failed to delete customer: ${e.message}`);
        }
    };

    const deleteZone = async (zone) => {
        if (!window.confirm(`Delete zone "${zone.name}"? All records will be removed.`)) return;
        try {
            await dns.deleteZone(zone.id);
            if (selectedZone?.id === zone.id) setSelectedZone(null);
            await loadZones(selectedCustomer.id);
        } catch (e) {
            setError(`Failed to delete zone: ${e.message}`);
        }
    };

    const deleteRecord = async (record) => {
        if (!window.confirm(`Delete ${record.type} record "${record.name}"?`)) return;
        try {
            await dns.deleteRecord(selectedZone.id, record.id);
            await loadRecords(selectedZone.id);
        } catch (e) {
            setError(`Failed to delete record: ${e.message}`);
        }
    };

    const deleteBlocklist = async (bl) => {
        if (!window.confirm(`Delete blocklist "${bl.name}"?`)) return;
        try {
            await dns.deleteBlocklist(bl.id);
            await loadBlocklists(selectedCustomer.id);
        } catch (e) {
            setError(`Failed to delete blocklist: ${e.message}`);
        }
    };

    // -----------------------------------------------------------------------
    // Render modal content
    // -----------------------------------------------------------------------
    const renderModalContent = () => {
        if (!modal) return null;
        switch (modal.type) {
            case 'addCustomer':
                return (
                    <Modal title="Add Customer" onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Customer Name">
                            <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. homelab" autoFocus />
                        </Field>
                    </Modal>
                );
            case 'editCustomer':
                return (
                    <Modal title="Rename Customer" onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Customer Name">
                            <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                        </Field>
                    </Modal>
                );
            case 'addZone':
                return (
                    <Modal title={`Add Zone — ${selectedCustomer?.name}`} onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Zone Name (FQDN)">
                            <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. home.lab" autoFocus />
                        </Field>
                    </Modal>
                );
            case 'addRecord':
                return (
                    <Modal title={`Add Record — ${selectedZone?.name}`} onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Name">
                            <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="@ or hostname (e.g. www)" autoFocus />
                        </Field>
                        <Field label="Type">
                            <select style={inputStyle} value={form.type || 'A'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="Value">
                            <input style={inputStyle} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 192.168.1.1" />
                        </Field>
                        <Field label="TTL (seconds)">
                            <input style={inputStyle} type="number" value={form.ttl ?? 3600} onChange={e => setForm(f => ({ ...f, ttl: e.target.value }))} min="60" />
                        </Field>
                    </Modal>
                );
            case 'editRecord':
                return (
                    <Modal title={`Edit Record — ${modal.data.name} (${modal.data.type})`} onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Value">
                            <input style={inputStyle} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} autoFocus />
                        </Field>
                        <Field label="TTL (seconds)">
                            <input style={inputStyle} type="number" value={form.ttl ?? 3600} onChange={e => setForm(f => ({ ...f, ttl: e.target.value }))} min="60" />
                        </Field>
                    </Modal>
                );
            case 'addBlocklist':
                return (
                    <Modal title={`Add Blocklist — ${selectedCustomer?.name}`} onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Blocklist Name">
                            <input style={inputStyle} value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. malware-feeds" autoFocus />
                        </Field>
                        <Field label="Domains (one per line)">
                            <textarea
                                style={{ ...inputStyle, height: '120px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                value={form.domains || ''}
                                onChange={e => setForm(f => ({ ...f, domains: e.target.value }))}
                                placeholder={"malware.example.com\nads.tracker.io"}
                            />
                        </Field>
                    </Modal>
                );
            case 'editBlocklist':
                return (
                    <Modal title={`Edit Blocklist — ${modal.data.name}`} onClose={closeModal} onSubmit={handleSubmit} submitting={submitting}>
                        <Field label="Domains (one per line)">
                            <textarea
                                style={{ ...inputStyle, height: '180px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                                value={form.domains || ''}
                                onChange={e => setForm(f => ({ ...f, domains: e.target.value }))}
                            />
                        </Field>
                    </Modal>
                );
            default: return null;
        }
    };

    // -----------------------------------------------------------------------
    // Render records panel
    // -----------------------------------------------------------------------
    const renderRecordsPanel = () => (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button style={btnGhost} onClick={() => setSelectedZone(null)}>
                    <FaArrowLeft size={12} /> Back to zones
                </button>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                    <FaGlobe style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    {selectedZone.name}
                </span>
            </div>

            <SectionHeader
                title={`Records (${records.length})`}
                action={
                    <button style={btnPrimary} onClick={() => openModal('addRecord', {}, { type: 'A', ttl: 3600 })}>
                        <FaPlus size={11} /> Add Record
                    </button>
                }
            />

            {records.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '1rem 0' }}>
                    No records yet. Add one to get started.
                </div>
            ) : (
                <div className="page-table-container">
                    <table className="page-table" style={{ fontSize: '0.875rem' }}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Value</th>
                                <th>TTL</th>
                                <th style={{ width: '90px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(rec => (
                                <tr key={rec.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{rec.name}</td>
                                    <td><TypeBadge type={rec.type} /></td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.value}>{rec.value}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{rec.ttl}s</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <button
                                                title="Edit"
                                                style={{ ...btnGhost, padding: '0.3rem 0.5rem' }}
                                                onClick={() => openModal('editRecord', rec, { value: rec.value, ttl: rec.ttl })}
                                            >
                                                <FaEdit size={12} />
                                            </button>
                                            <button
                                                title="Delete"
                                                style={{ ...btnDanger, padding: '0.3rem 0.5rem' }}
                                                onClick={() => deleteRecord(rec)}
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // -----------------------------------------------------------------------
    // Render zones + blocklists panel
    // -----------------------------------------------------------------------
    const renderCustomerPanel = () => (
        <div>
            {/* Zones */}
            <SectionHeader
                title={`Zones (${zones.length})`}
                action={
                    <button style={btnPrimary} onClick={() => openModal('addZone')}>
                        <FaPlus size={11} /> Add Zone
                    </button>
                }
            />

            {zones.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '0.5rem 0 1.5rem' }}>
                    No zones yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                    {zones.map(zone => (
                        <div key={zone.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'var(--bg-surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'border-color var(--duration-fast)',
                        }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <FaGlobe size={13} style={{ color: 'var(--accent)' }} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    {zone.name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    serial {zone.serial}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    style={{ ...btnGhost, padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                                    onClick={() => setSelectedZone(zone)}
                                >
                                    Records <FaChevronRight size={10} />
                                </button>
                                <button
                                    title="Delete zone"
                                    style={{ ...btnDanger, padding: '0.3rem 0.5rem' }}
                                    onClick={() => deleteZone(zone)}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Blocklists */}
            <SectionHeader
                title={`Blocklists (${blocklists.length})`}
                action={
                    <button style={btnPrimary} onClick={() => openModal('addBlocklist')}>
                        <FaPlus size={11} /> Add Blocklist
                    </button>
                }
            />

            {blocklists.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                    No blocklists yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {blocklists.map(bl => (
                        <div key={bl.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'var(--bg-surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <FaShieldAlt size={13} style={{ color: 'var(--amber)' }} />
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{bl.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {(bl.domains || []).length} domain{(bl.domains || []).length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                    title="Edit domains"
                                    style={{ ...btnGhost, padding: '0.3rem 0.5rem' }}
                                    onClick={() => openModal('editBlocklist', bl, { domains: (bl.domains || []).join('\n') })}
                                >
                                    <FaEdit size={12} />
                                </button>
                                <button
                                    title="Delete blocklist"
                                    style={{ ...btnDanger, padding: '0.3rem 0.5rem' }}
                                    onClick={() => deleteBlocklist(bl)}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // -----------------------------------------------------------------------
    // Main render
    // -----------------------------------------------------------------------
    return (
        <div style={{ marginTop: '1rem' }}>
            {error && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--red-muted)',
                    border: '1px solid var(--red)',
                    color: 'var(--red)',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span>{error}</span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '1rem' }} onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                {/* Left panel — Customers */}
                <div style={{
                    width: '220px',
                    flexShrink: 0,
                    background: 'var(--bg-surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                }}>
                    <SectionHeader
                        title="Customers"
                        action={
                            <button
                                title="Add customer"
                                style={{ ...btnPrimary, padding: '0.25rem 0.5rem' }}
                                onClick={() => openModal('addCustomer')}
                            >
                                <FaPlus size={10} />
                            </button>
                        }
                    />

                    {loading ? (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '0.5rem 0' }}>Loading…</div>
                    ) : customers.length === 0 ? (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No customers yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {customers.map(c => {
                                const isSelected = selectedCustomer?.id === c.id;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelectedCustomer(isSelected ? null : c)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.5rem 0.6rem',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            background: isSelected ? 'var(--accent-muted)' : 'transparent',
                                            border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                                            transition: 'all var(--duration-fast)',
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: isSelected ? '600' : '400',
                                            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '130px',
                                        }}>
                                            {c.name}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                            <button
                                                title="Rename"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0.15rem 0.25rem', borderRadius: '3px' }}
                                                onClick={() => openModal('editCustomer', c, { name: c.name })}
                                            >
                                                <FaEdit size={11} />
                                            </button>
                                            <button
                                                title="Delete"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '0.15rem 0.25rem', borderRadius: '3px' }}
                                                onClick={() => deleteCustomer(c)}
                                            >
                                                <FaTrash size={11} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <button
                            style={{ ...btnGhost, width: '100%', justifyContent: 'center', padding: '0.4rem' }}
                            onClick={loadCustomers}
                        >
                            <FaSyncAlt size={11} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {!selectedCustomer ? (
                        <div style={{
                            background: 'var(--bg-surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2.5rem',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            fontSize: '0.9rem',
                        }}>
                            Select a customer to manage their zones and blocklists.
                        </div>
                    ) : (
                        <div style={{
                            background: 'var(--bg-surface-1)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '1.25rem',
                        }}>
                            <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    {selectedCustomer.name}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>
                                    id: {selectedCustomer.id}
                                </span>
                            </div>

                            {selectedZone ? renderRecordsPanel() : renderCustomerPanel()}
                        </div>
                    )}
                </div>
            </div>

            {renderModalContent()}
        </div>
    );
};

export default DnsTab;
