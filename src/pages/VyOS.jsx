import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  FaNetworkWired, FaLayerGroup, FaTag, FaShieldAlt, FaObjectGroup,
  FaSyncAlt, FaPlus, FaEdit, FaTrash, FaTimes, FaTh, FaTable,
  FaChevronDown, FaChevronUp, FaSitemap, FaToggleOn, FaToggleOff,
  FaExchangeAlt,
} from "react-icons/fa";
import "./Page.css";
import {
  fetchDevices,
  fetchNetworks, createNetwork, updateNetwork, deleteNetwork,
  fetchVRFs, createVRF, updateVRF, deleteVRF,
  fetchVLANs, createVLAN, updateVLAN, deleteVLAN,
  fetchPolicies, createPolicy, updatePolicy, deletePolicy, addRule, deleteRule,
  disablePolicy, enablePolicy, disableRule, enableRule,
  fetchAddressGroups, createAddressGroup, updateAddressGroup, deleteAddressGroup,
  fetchNATRules, createNATRule, updateNATRule, deleteNATRule,
} from "../services/vyosService";

// ── helpers ────────────────────────────────────────────────────────────────

const VYOS_TEAL = "#00bcd4";
const VYOS_TEAL_DIM = "rgba(0,188,212,0.15)";

const Badge = ({ label, color = VYOS_TEAL, bg }) => (
  <span style={{
    display: "inline-block",
    padding: "0.2rem 0.55rem",
    borderRadius: "20px",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    backgroundColor: bg || `${color}22`,
    color: color,
    border: `1px solid ${color}55`,
  }}>{label}</span>
);

const actionBadgeColor = (action) => {
  if (!action) return { color: "#888", bg: "#88888822" };
  const a = action.toLowerCase();
  if (a === "accept") return { color: "#4caf50", bg: "#4caf5022" };
  if (a === "drop") return { color: "#f44336", bg: "#f4433622" };
  if (a === "reject") return { color: "#ff9800", bg: "#ff980022" };
  return { color: "#888", bg: "#88888822" };
};

const AddrTag = ({ addr }) => (
  <span style={{
    display: "inline-block",
    padding: "0.18rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
    backgroundColor: VYOS_TEAL_DIM,
    color: VYOS_TEAL,
    border: `1px solid ${VYOS_TEAL}44`,
    fontFamily: "monospace",
  }}>{addr}</span>
);

const Spinner = () => (
  <FaSyncAlt style={{ animation: "spin 1s linear infinite", color: VYOS_TEAL }} />
);

const inputStyle = {
  width: "100%",
  padding: "0.65rem 0.85rem",
  border: "1px solid #6b6b6b",
  borderRadius: "8px",
  fontSize: "0.9rem",
  backgroundColor: "#fff",
  color: "#000",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "0.3rem",
  color: "var(--text-primary)",
  fontSize: "0.85rem",
  fontWeight: 600,
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: "1rem" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const parseAddresses = (raw) =>
  raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

// ── Modal ──────────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, onSubmit, submitting, children }) => createPortal(
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.72)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{
      background: "var(--bg-surface-1, #1e1e2e)",
      border: "1px solid var(--border-subtle, #333)",
      borderRadius: "12px",
      padding: "1.75rem",
      width: "100%",
      maxWidth: "480px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.1rem", fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.1rem", padding: "0.25rem" }}>
          <FaTimes />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {children}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid #6b6b6b", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={{ padding: "0.6rem 1.4rem", borderRadius: "8px", border: "none", background: submitting ? "#6b6b6b" : "#4caf50", color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {submitting ? <><Spinner /> Saving…</> : "Save"}
          </button>
        </div>
      </form>
    </div>
  </div>,
  document.body
);

// ── Action buttons ─────────────────────────────────────────────────────────

const Btn = ({ icon: Icon, label, onClick, color = "#6b6b6b", disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display: "inline-flex", alignItems: "center", gap: "0.35rem",
    padding: "0.4rem 0.8rem", borderRadius: "6px", border: "none",
    background: `${color}22`, color: color, cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.8rem", fontWeight: 600, transition: "background 0.15s",
    opacity: disabled ? 0.5 : 1,
  }}
    onMouseEnter={e => !disabled && (e.currentTarget.style.background = `${color}44`)}
    onMouseLeave={e => !disabled && (e.currentTarget.style.background = `${color}22`)}
  >
    <Icon />{label}
  </button>
);

// ── Tab bar ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "networks",       label: "Interfaces",    icon: FaNetworkWired, color: "#00bcd4" },
  { id: "vrfs",           label: "VRFs",          icon: FaLayerGroup,   color: "#9c27b0" },
  { id: "vlans",          label: "VLANs",         icon: FaTag,          color: "#ff9800" },
  { id: "policies",       label: "Firewall",      icon: FaShieldAlt,    color: "#f44336" },
  { id: "address_groups", label: "Address Groups", icon: FaObjectGroup, color: "#4caf50" },
  { id: "nat",            label: "NAT",           icon: FaExchangeAlt,  color: "#ff5722" },
];

const TabBar = ({ active, onChange }) => (
  <div style={{
    display: "flex", gap: "0.25rem", overflowX: "auto",
    borderBottom: "1px solid var(--border-subtle, #333)",
    marginBottom: "1.5rem",
  }}>
    {TABS.map(({ id, label, icon: Icon, color }) => {
      const isActive = active === id;
      return (
        <button key={id} onClick={() => onChange(id)} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          padding: "0.6rem 1.25rem",
          border: "none",
          borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
          background: "none",
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          cursor: "pointer", fontWeight: isActive ? 600 : 400,
          fontSize: "0.95rem", whiteSpace: "nowrap",
          transition: "color 0.15s, border-color 0.15s",
          marginBottom: "-1px",
        }}>
          <Icon style={{ color }} />{label}
        </button>
      );
    })}
  </div>
);

// ── Section toolbar ────────────────────────────────────────────────────────

const SectionToolbar = ({ onAdd, onRefresh, refreshing, viewMode, onToggleView, addLabel = "Create New" }) => (
  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
    <button onClick={onAdd} style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      padding: "0.55rem 1rem", borderRadius: "8px", border: "none",
      background: "#4caf50", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem",
    }}>
      <FaPlus />{addLabel}
    </button>
    <button onClick={onToggleView} style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      padding: "0.55rem 0.9rem", borderRadius: "8px", border: "1px solid #6b6b6b",
      background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
    }}>
      {viewMode === "card" ? <><FaTable /> Table</> : <><FaTh /> Cards</>}
    </button>
    <button onClick={onRefresh} disabled={refreshing} style={{
      display: "flex", alignItems: "center", gap: "0.4rem",
      padding: "0.55rem 0.9rem", borderRadius: "8px", border: "none",
      background: refreshing ? "#6b6b6b" : VYOS_TEAL, color: "#fff",
      cursor: refreshing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem",
      opacity: refreshing ? 0.6 : 1,
    }}>
      <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  </div>
);

// ── Status messages ────────────────────────────────────────────────────────

const Loading = () => (
  <div className="page-card" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
    <Spinner /><span>Loading…</span>
  </div>
);

const ErrorMsg = ({ msg }) => (
  <div className="page-card" style={{ background: "#f4433622", borderColor: "#f44336" }}>
    <p style={{ color: "#f44336", margin: 0, fontWeight: 600 }}>{msg}</p>
  </div>
);

const Empty = ({ label }) => (
  <div className="page-card">
    <p style={{ color: "var(--text-secondary)", margin: 0 }}>No {label} found. Create one to get started.</p>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
// INTERFACES TAB
// ══════════════════════════════════════════════════════════════════════════

const IF_TYPES = ["ethernet", "bonding", "bridge", "loopback", "tunnel", "wireguard"];

const emptyNetForm = () => ({ interface: "", type: "ethernet", address: "", description: "" });

const NetworksTab = ({ deviceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [modal, setModal] = useState(null); // null | "create" | {item}
  const [form, setForm] = useState(emptyNetForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchNetworks(deviceId, force);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyNetForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => { setForm({ interface: item.interface, type: item.type, address: (item.addresses || [])[0] || "", description: item.description || "" }); setFormError(""); setModal(item); };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.address && modal === "create") { setFormError("Address is required"); return; }
    setSubmitting(true);
    try {
      if (modal === "create") {
        if (!form.interface || !form.type) { setFormError("Interface and type are required"); setSubmitting(false); return; }
        await createNetwork(deviceId, { interface: form.interface, type: form.type, address: form.address, description: form.description });
      } else {
        await updateNetwork(deviceId, modal.interface, { type: form.type, address: form.address, description: form.description });
      }
      setModal(null);
      load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete interface ${item.interface}?`)) return;
    try { await deleteNetwork(deviceId, item.interface, item.type); load(true); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <SectionToolbar onAdd={openCreate} onRefresh={() => load(true)} refreshing={refreshing} viewMode={viewMode} onToggleView={() => setViewMode(v => v === "card" ? "table" : "card")} />
      {items.length === 0 ? <Empty label="interfaces" /> : viewMode === "card" ? (
        items.map(item => (
          <div key={item.interface} className="page-card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ margin: 0, fontFamily: "monospace", fontSize: "1rem" }}>{item.interface}</h2>
                  <Badge label={item.type} color={VYOS_TEAL} />
                </div>
                {item.description && <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.description}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}
                  {(!item.addresses || item.addresses.length === 0) && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>No addresses</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} />
                <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="page-table-container">
          <table className="page-table">
            <thead><tr><th>Interface</th><th>Type</th><th>Addresses</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.interface}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{item.interface}</td>
                  <td><Badge label={item.type} color={VYOS_TEAL} /></td>
                  <td>{(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                  <td><div style={{ display: "flex", gap: "0.4rem" }}><Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} /><Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal === "create" ? "Create Interface" : `Edit ${modal.interface}`} onClose={() => setModal(null)} onSubmit={handleSubmit} submitting={submitting}>
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <FormField label="Interface Name *">
              <input style={inputStyle} value={form.interface} onChange={e => setForm(f => ({ ...f, interface: e.target.value }))} placeholder="e.g. eth0" required />
            </FormField>
          )}
          <FormField label="Type *">
            <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {IF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Address/CIDR *">
            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 192.168.1.1/24" />
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// VRFs TAB
// ══════════════════════════════════════════════════════════════════════════

const emptyVRFForm = () => ({ name: "", table: "", description: "" });

const VRFsTab = ({ deviceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyVRFForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchVRFs(deviceId, force);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyVRFForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => { setForm({ name: item.name, table: item.table || "", description: item.description || "" }); setFormError(""); setModal(item); };

  const handleSubmit = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      if (modal === "create") {
        if (!form.name || !form.table) { setFormError("Name and table are required"); setSubmitting(false); return; }
        await createVRF(deviceId, { name: form.name, table: form.table, description: form.description });
      } else {
        await updateVRF(deviceId, modal.name, { table: form.table, description: form.description });
      }
      setModal(null); load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete VRF ${item.name}?`)) return;
    try { await deleteVRF(deviceId, item.name); load(true); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <SectionToolbar onAdd={openCreate} onRefresh={() => load(true)} refreshing={refreshing} viewMode={viewMode} onToggleView={() => setViewMode(v => v === "card" ? "table" : "card")} />
      {items.length === 0 ? <Empty label="VRFs" /> : viewMode === "card" ? (
        items.map(item => (
          <div key={item.name} className="page-card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ margin: 0 }}>{item.name}</h2>
                  <Badge label={`Table ${item.table}`} color="#9c27b0" />
                </div>
                {item.description && <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.description}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} />
                <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="page-table-container">
          <table className="page-table">
            <thead><tr><th>Name</th><th>Route Table</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td><Badge label={`Table ${item.table}`} color="#9c27b0" /></td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                  <td><div style={{ display: "flex", gap: "0.4rem" }}><Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} /><Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal === "create" ? "Create VRF" : `Edit VRF ${modal.name}`} onClose={() => setModal(null)} onSubmit={handleSubmit} submitting={submitting}>
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <FormField label="VRF Name *">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BLUE" required />
            </FormField>
          )}
          <FormField label="Route Table ID *">
            <input style={inputStyle} type="number" value={form.table} onChange={e => setForm(f => ({ ...f, table: e.target.value }))} placeholder="e.g. 100" required />
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// VLANs TAB
// ══════════════════════════════════════════════════════════════════════════

const VLAN_IF_TYPES = ["ethernet", "bonding", "bridge"];
const emptyVLANForm = () => ({ interface: "", type: "ethernet", vlan_id: "", address: "", description: "" });

const VLANsTab = ({ deviceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyVLANForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchVLANs(deviceId, force);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyVLANForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => { setForm({ interface: item.interface, type: item.type, vlan_id: String(item.vlan_id), address: (item.addresses || [])[0] || "", description: item.description || "" }); setFormError(""); setModal(item); };

  const handleSubmit = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      if (modal === "create") {
        if (!form.interface || !form.vlan_id) { setFormError("Interface and VLAN ID are required"); setSubmitting(false); return; }
        await createVLAN(deviceId, { interface: form.interface, type: form.type, vlan_id: parseInt(form.vlan_id, 10), address: form.address, description: form.description });
      } else {
        await updateVLAN(deviceId, modal.interface, modal.vlan_id, { type: form.type, address: form.address, description: form.description });
      }
      setModal(null); load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete VLAN ${item.interface}.${item.vlan_id}?`)) return;
    try { await deleteVLAN(deviceId, item.interface, item.vlan_id, item.type); load(true); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <SectionToolbar onAdd={openCreate} onRefresh={() => load(true)} refreshing={refreshing} viewMode={viewMode} onToggleView={() => setViewMode(v => v === "card" ? "table" : "card")} />
      {items.length === 0 ? <Empty label="VLANs" /> : viewMode === "card" ? (
        items.map(item => (
          <div key={`${item.interface}.${item.vlan_id}`} className="page-card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ margin: 0, fontFamily: "monospace" }}>{item.interface}.{item.vlan_id}</h2>
                  <Badge label={`VLAN ${item.vlan_id}`} color="#ff9800" />
                  <Badge label={item.type} color={VYOS_TEAL} />
                </div>
                {item.description && <p style={{ margin: "0.2rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.description}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} />
                <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="page-table-container">
          <table className="page-table">
            <thead><tr><th>VLAN</th><th>Interface</th><th>Type</th><th>Addresses</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={`${item.interface}.${item.vlan_id}`}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{item.interface}.{item.vlan_id}</td>
                  <td>{item.interface}</td>
                  <td><Badge label={item.type} color={VYOS_TEAL} /></td>
                  <td>{(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                  <td><div style={{ display: "flex", gap: "0.4rem" }}><Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} /><Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal === "create" ? "Create VLAN" : `Edit ${modal.interface}.${modal.vlan_id}`} onClose={() => setModal(null)} onSubmit={handleSubmit} submitting={submitting}>
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <>
              <FormField label="Parent Interface *">
                <input style={inputStyle} value={form.interface} onChange={e => setForm(f => ({ ...f, interface: e.target.value }))} placeholder="e.g. eth0" required />
              </FormField>
              <FormField label="VLAN ID * (1–4094)">
                <input style={inputStyle} type="number" min="1" max="4094" value={form.vlan_id} onChange={e => setForm(f => ({ ...f, vlan_id: e.target.value }))} placeholder="e.g. 100" required />
              </FormField>
            </>
          )}
          <FormField label="Interface Type">
            <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {VLAN_IF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Address/CIDR">
            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 10.0.100.1/24 (optional)" />
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// FIREWALL POLICIES TAB
// ══════════════════════════════════════════════════════════════════════════

const FW_ACTIONS = ["accept", "drop", "reject"];
const emptyPolicyForm = () => ({ name: "", default_action: "drop", description: "" });
const emptyRuleForm = () => ({
  rule_id: "", action: "accept",
  source_type: "address", source: "", source_group: "",
  destination_type: "address", destination: "", destination_group: "",
  description: "",
});

const PolicyCard = ({ item, deviceId, addressGroups, onEdit, onDelete, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  // ruleModal: null | "add" | { ruleId, rule } for edit
  const [ruleModal, setRuleModal] = useState(null);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm());
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleError, setRuleError] = useState("");
  const [togglingPolicy, setTogglingPolicy] = useState(false);
  const [togglingRule, setTogglingRule] = useState(null); // ruleId string or null

  const rules = item.rules || {};
  const ruleCount = Object.keys(rules).length;
  const { color, bg } = actionBadgeColor(item.default_action);
  const isDisabled = !!item.disabled;

  const openAddRule = (e) => {
    e.stopPropagation();
    setRuleForm(emptyRuleForm());
    setRuleError("");
    setRuleModal("add");
  };

  const openEditRule = (e, ruleId, rule) => {
    e.stopPropagation();
    setRuleForm({
      rule_id: ruleId,
      action: rule.action || "accept",
      source_type: rule.source_group ? "group" : "address",
      source: rule.source || "",
      source_group: rule.source_group || "",
      destination_type: rule.destination_group ? "group" : "address",
      destination: rule.destination || "",
      destination_group: rule.destination_group || "",
      description: rule.description || "",
    });
    setRuleError("");
    setRuleModal({ ruleId, rule });
  };

  const handleRuleSubmit = async () => {
    setRuleError("");
    if (!ruleForm.rule_id || !ruleForm.action) { setRuleError("Rule ID and action are required"); return; }
    setRuleSubmitting(true);
    try {
      // Edit = delete the old rule first, then add with updated values
      if (ruleModal !== "add") {
        await deleteRule(deviceId, item.name, ruleModal.ruleId);
      }
      await addRule(deviceId, item.name, {
        rule_id: parseInt(ruleForm.rule_id, 10),
        action: ruleForm.action,
        source: ruleForm.source_type === "address" ? ruleForm.source : "",
        source_group: ruleForm.source_type === "group" ? ruleForm.source_group : "",
        destination: ruleForm.destination_type === "address" ? ruleForm.destination : "",
        destination_group: ruleForm.destination_type === "group" ? ruleForm.destination_group : "",
        description: ruleForm.description,
      });
      setRuleModal(null);
      onRefresh();
    } catch (e) { setRuleError(e.message); } finally { setRuleSubmitting(false); }
  };

  const handleDeleteRule = (e, ruleId) => {
    e.stopPropagation();
    if (!window.confirm(`Delete rule ${ruleId} from ${item.name}?`)) return;
    deleteRule(deviceId, item.name, ruleId).then(onRefresh).catch(err => alert(err.message));
  };

  const handleTogglePolicy = async (e) => {
    e.stopPropagation();
    setTogglingPolicy(true);
    try {
      if (isDisabled) await enablePolicy(deviceId, item.name);
      else await disablePolicy(deviceId, item.name);
      onRefresh();
    } catch (err) { alert(err.message); } finally { setTogglingPolicy(false); }
  };

  const handleToggleRule = async (e, ruleId, ruleDisabled) => {
    e.stopPropagation();
    setTogglingRule(ruleId);
    try {
      if (ruleDisabled) await enableRule(deviceId, item.name, ruleId);
      else await disableRule(deviceId, item.name, ruleId);
      onRefresh();
    } catch (err) { alert(err.message); } finally { setTogglingRule(null); }
  };

  return (
    <div
      className="page-card"
      onClick={() => setExpanded(v => !v)}
      style={{ cursor: "pointer", opacity: isDisabled ? 0.65 : 1, transition: "opacity 0.2s" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, textDecoration: isDisabled ? "line-through" : "none", color: isDisabled ? "var(--text-secondary)" : "var(--text-primary)" }}>
              {item.name}
            </h2>
            {isDisabled && (
              <span style={{ padding: "0.2rem 0.55rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", backgroundColor: "#88888833", color: "#888", border: "1px solid #88888855" }}>
                DISABLED
              </span>
            )}
            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", backgroundColor: bg, color, border: `1px solid ${color}55` }}>
              Default: {item.default_action || "—"}
            </span>
            <Badge label={`${ruleCount} rule${ruleCount !== 1 ? "s" : ""}`} color="#888" />
            {ruleCount > 0 && (
              <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center" }}>
                {expanded ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            )}
          </div>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {item.description || <em style={{ opacity: 0.5 }}>No description</em>}
          </p>
        </div>
        {/* stopPropagation so button clicks don't toggle the card */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
          <Btn
            icon={isDisabled ? FaToggleOff : FaToggleOn}
            label={togglingPolicy ? "…" : isDisabled ? "Enable" : "Disable"}
            color={isDisabled ? "#4caf50" : "#ff9800"}
            disabled={togglingPolicy}
            onClick={handleTogglePolicy}
          />
          <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => onEdit(item)} />
          <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => onDelete(item)} />
          <Btn icon={FaPlus} label="Add Rule" color="#4caf50" onClick={openAddRule} />
        </div>
      </div>

      {expanded && ruleCount > 0 && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }} onClick={e => e.stopPropagation()}>
          <div className="page-table-container">
            <table className="page-table" style={{ fontSize: "0.8rem" }}>
              <thead><tr><th>Rule ID</th><th>Action</th><th>Source</th><th>Destination</th><th>Description</th><th></th></tr></thead>
              <tbody>
                {Object.entries(rules).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([ruleId, rule]) => {
                  const rc = actionBadgeColor(rule.action);
                  const ruleDisabled = !!rule.disabled;
                  const isToggling = togglingRule === ruleId;
                  const srcDisplay = rule.source_group
                    ? <span style={{ padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: "#4caf5022", color: "#4caf50", border: "1px solid #4caf5044" }}>group:{rule.source_group}</span>
                    : <span style={{ fontFamily: "monospace" }}>{rule.source || "—"}</span>;
                  const dstDisplay = rule.destination_group
                    ? <span style={{ padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem", fontWeight: 700, background: "#4caf5022", color: "#4caf50", border: "1px solid #4caf5044" }}>group:{rule.destination_group}</span>
                    : <span style={{ fontFamily: "monospace" }}>{rule.destination || "—"}</span>;
                  return (
                    <tr key={ruleId} style={{ opacity: ruleDisabled ? 0.5 : 1, transition: "opacity 0.2s" }}>
                      <td style={{ fontFamily: "monospace", fontWeight: 700, textDecoration: ruleDisabled ? "line-through" : "none" }}>{ruleId}</td>
                      <td>
                        <span style={{ padding: "0.15rem 0.45rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", backgroundColor: ruleDisabled ? "#88888822" : rc.bg, color: ruleDisabled ? "#888" : rc.color }}>
                          {ruleDisabled ? "disabled" : rule.action}
                        </span>
                      </td>
                      <td>{srcDisplay}</td>
                      <td>{dstDisplay}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{rule.description || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <Btn
                            icon={ruleDisabled ? FaToggleOff : FaToggleOn}
                            label={isToggling ? "…" : ruleDisabled ? "Enable" : "Disable"}
                            color={ruleDisabled ? "#4caf50" : "#ff9800"}
                            disabled={isToggling}
                            onClick={(e) => handleToggleRule(e, ruleId, ruleDisabled)}
                          />
                          <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={(e) => openEditRule(e, ruleId, rule)} />
                          <Btn icon={FaTrash} label="Del" color="#f44336" onClick={(e) => handleDeleteRule(e, ruleId)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ruleModal && (
        <Modal
          title={ruleModal === "add" ? `Add Rule to ${item.name}` : `Edit Rule ${ruleModal.ruleId} — ${item.name}`}
          onClose={() => setRuleModal(null)}
          onSubmit={handleRuleSubmit}
          submitting={ruleSubmitting}
        >
          {ruleError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{ruleError}</p>}
          <FormField label="Rule ID *">
            <input
              style={{ ...inputStyle, ...(ruleModal !== "add" ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
              type="number" min="1"
              value={ruleForm.rule_id}
              onChange={e => setRuleForm(f => ({ ...f, rule_id: e.target.value }))}
              placeholder="e.g. 10"
              readOnly={ruleModal !== "add"}
              required
            />
          </FormField>
          <FormField label="Action *">
            <select style={inputStyle} value={ruleForm.action} onChange={e => setRuleForm(f => ({ ...f, action: e.target.value }))}>
              {FW_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </FormField>
          {/* Source */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
              <label style={labelStyle}>Source</label>
              <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid #6b6b6b", fontSize: "0.78rem" }}>
                {["address", "group"].map(t => (
                  <button key={t} type="button" onClick={() => setRuleForm(f => ({ ...f, source_type: t }))} style={{
                    padding: "0.2rem 0.6rem", border: "none", cursor: "pointer", fontWeight: 600,
                    background: ruleForm.source_type === t ? "#4caf50" : "transparent",
                    color: ruleForm.source_type === t ? "#fff" : "var(--text-secondary)",
                    transition: "background 0.15s",
                  }}>{t === "address" ? "IP/CIDR" : "Address Group"}</button>
                ))}
              </div>
            </div>
            {ruleForm.source_type === "address" ? (
              <input style={inputStyle} value={ruleForm.source} onChange={e => setRuleForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. 10.0.0.0/8 (optional)" />
            ) : (
              <select style={inputStyle} value={ruleForm.source_group} onChange={e => setRuleForm(f => ({ ...f, source_group: e.target.value }))}>
                <option value="">— select address group —</option>
                {(addressGroups || []).map(g => <option key={g.name} value={g.name}>{g.name}{g.description ? ` — ${g.description}` : ""}</option>)}
              </select>
            )}
          </div>
          {/* Destination */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
              <label style={labelStyle}>Destination</label>
              <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid #6b6b6b", fontSize: "0.78rem" }}>
                {["address", "group"].map(t => (
                  <button key={t} type="button" onClick={() => setRuleForm(f => ({ ...f, destination_type: t }))} style={{
                    padding: "0.2rem 0.6rem", border: "none", cursor: "pointer", fontWeight: 600,
                    background: ruleForm.destination_type === t ? "#4caf50" : "transparent",
                    color: ruleForm.destination_type === t ? "#fff" : "var(--text-secondary)",
                    transition: "background 0.15s",
                  }}>{t === "address" ? "IP/CIDR" : "Address Group"}</button>
                ))}
              </div>
            </div>
            {ruleForm.destination_type === "address" ? (
              <input style={inputStyle} value={ruleForm.destination} onChange={e => setRuleForm(f => ({ ...f, destination: e.target.value }))} placeholder="e.g. 0.0.0.0/0 (optional)" />
            ) : (
              <select style={inputStyle} value={ruleForm.destination_group} onChange={e => setRuleForm(f => ({ ...f, destination_group: e.target.value }))}>
                <option value="">— select address group —</option>
                {(addressGroups || []).map(g => <option key={g.name} value={g.name}>{g.name}{g.description ? ` — ${g.description}` : ""}</option>)}
              </select>
            )}
          </div>
          <FormField label="Description">
            <input style={inputStyle} value={ruleForm.description} onChange={e => setRuleForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </div>
  );
};

const PoliciesTab = ({ deviceId }) => {
  const [items, setItems] = useState([]);
  const [addressGroups, setAddressGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyPolicyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const [policies, groups] = await Promise.all([
        fetchPolicies(deviceId, force),
        fetchAddressGroups(deviceId, force),
      ]);
      setItems(Array.isArray(policies) ? policies : []);
      setAddressGroups(Array.isArray(groups) ? groups : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyPolicyForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => { setForm({ name: item.name, default_action: item.default_action || "drop", description: item.description || "" }); setFormError(""); setModal(item); };

  const handleSubmit = async () => {
    setFormError("");
    setSubmitting(true);
    try {
      if (modal === "create") {
        if (!form.name) { setFormError("Name is required"); setSubmitting(false); return; }
        await createPolicy(deviceId, { name: form.name, default_action: form.default_action, description: form.description });
      } else {
        await updatePolicy(deviceId, modal.name, { default_action: form.default_action, description: form.description });
      }
      setModal(null); load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete policy ${item.name}? This will remove all its rules.`)) return;
    try { await deletePolicy(deviceId, item.name); load(true); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem", borderRadius: "8px", border: "none", background: "#4caf50", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
          <FaPlus />Create Policy
        </button>
        <button onClick={() => load(true)} disabled={refreshing} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", borderRadius: "8px", border: "none", background: refreshing ? "#6b6b6b" : VYOS_TEAL, color: "#fff", cursor: refreshing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: refreshing ? 0.6 : 1 }}>
          <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />{refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {items.length === 0 ? <Empty label="firewall policies" /> : (
        items.map(item => <PolicyCard key={item.name} item={item} deviceId={deviceId} addressGroups={addressGroups} onEdit={openEdit} onDelete={handleDelete} onRefresh={() => load(true)} />)
      )}
      {modal && (
        <Modal title={modal === "create" ? "Create Firewall Policy" : `Edit Policy ${modal.name}`} onClose={() => setModal(null)} onSubmit={handleSubmit} submitting={submitting}>
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <FormField label="Policy Name *">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. WAN-IN" required />
            </FormField>
          )}
          <FormField label="Default Action *">
            <select style={inputStyle} value={form.default_action} onChange={e => setForm(f => ({ ...f, default_action: e.target.value }))}>
              {FW_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// ADDRESS GROUPS TAB
// ══════════════════════════════════════════════════════════════════════════

const emptyAGForm = () => ({ name: "", addresses: "", description: "" });

const AddressGroupsTab = ({ deviceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("card");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyAGForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchAddressGroups(deviceId, force);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(emptyAGForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => { setForm({ name: item.name, addresses: (item.addresses || []).join("\n"), description: item.description || "" }); setFormError(""); setModal(item); };

  const handleSubmit = async () => {
    setFormError("");
    setSubmitting(true);
    const addrs = parseAddresses(form.addresses);
    try {
      if (modal === "create") {
        if (!form.name) { setFormError("Name is required"); setSubmitting(false); return; }
        await createAddressGroup(deviceId, { name: form.name, addresses: addrs, description: form.description });
      } else {
        await updateAddressGroup(deviceId, modal.name, { addresses: addrs, description: form.description });
      }
      setModal(null); load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete address group ${item.name}?`)) return;
    try { await deleteAddressGroup(deviceId, item.name); load(true); } catch (e) { alert(e.message); }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <>
      <SectionToolbar onAdd={openCreate} onRefresh={() => load(true)} refreshing={refreshing} viewMode={viewMode} onToggleView={() => setViewMode(v => v === "card" ? "table" : "card")} />
      {items.length === 0 ? <Empty label="address groups" /> : viewMode === "card" ? (
        items.map(item => (
          <div key={item.name} className="page-card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  <h2 style={{ margin: 0 }}>{item.name}</h2>
                  <Badge label={`${(item.addresses || []).length} addr`} color="#ff9800" />
                </div>
                {item.description && <p style={{ margin: "0.2rem 0 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{item.description}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.4rem" }}>
                  {(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}
                  {(!item.addresses || item.addresses.length === 0) && <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>No addresses</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} />
                <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} />
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="page-table-container">
          <table className="page-table">
            <thead><tr><th>Name</th><th>Addresses</th><th>Description</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.name}>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{(item.addresses || []).map(a => <AddrTag key={a} addr={a} />)}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                  <td><div style={{ display: "flex", gap: "0.4rem" }}><Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} /><Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal === "create" ? "Create Address Group" : `Edit ${modal.name}`} onClose={() => setModal(null)} onSubmit={handleSubmit} submitting={submitting}>
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <FormField label="Group Name *">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. TRUSTED-NETS" required />
            </FormField>
          )}
          <FormField label="Addresses (one per line or comma-separated)">
            <textarea
              style={{ ...inputStyle, height: "120px", resize: "vertical", fontFamily: "monospace" }}
              value={form.addresses}
              onChange={e => setForm(f => ({ ...f, addresses: e.target.value }))}
              placeholder={"192.168.1.0/24\n10.0.0.1\n172.16.0.0/12"}
            />
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// NAT TAB
// ══════════════════════════════════════════════════════════════════════════

const NAT_COLOR = "#ff5722";
const NAT_PROTOCOLS = ["", "tcp", "udp", "tcp_udp", "icmp", "all"];

const emptyNATForm = () => ({
  rule_id: "",
  description: "",
  protocol: "",
  outbound_interface: "",
  inbound_interface: "",
  source_address: "",
  source_port: "",
  destination_address: "",
  destination_port: "",
  translation_address: "",
  translation_port: "",
});

const NATTab = ({ deviceId }) => {
  const [natType, setNatType] = useState("source");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyNATForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await fetchNATRules(deviceId, natType, force);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); setRefreshing(false); }
  }, [deviceId, natType]);

  useEffect(() => { load(); }, [load]);

  const switchNatType = (type) => {
    setNatType(type);
    setItems([]);
    setLoading(true);
    setError(null);
  };

  const openCreate = () => { setForm(emptyNATForm()); setFormError(""); setModal("create"); };
  const openEdit = (item) => {
    setForm({
      rule_id: String(item.rule_id),
      description: item.description || "",
      protocol: item.protocol || "",
      outbound_interface: item.outbound_interface || "",
      inbound_interface: item.inbound_interface || "",
      source_address: item.source_address || "",
      source_port: item.source_port || "",
      destination_address: item.destination_address || "",
      destination_port: item.destination_port || "",
      translation_address: item.translation_address || "",
      translation_port: item.translation_port || "",
    });
    setFormError("");
    setModal(item);
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!form.rule_id) { setFormError("Rule ID is required"); return; }
    if (!form.translation_address) { setFormError("Translation address is required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        description: form.description,
        protocol: form.protocol,
        outbound_interface: form.outbound_interface,
        inbound_interface: form.inbound_interface,
        source_address: form.source_address,
        source_port: form.source_port,
        destination_address: form.destination_address,
        destination_port: form.destination_port,
        translation_address: form.translation_address,
        translation_port: form.translation_port,
      };
      if (modal === "create") {
        await createNATRule(deviceId, natType, { rule_id: parseInt(form.rule_id, 10), ...payload });
      } else {
        await updateNATRule(deviceId, natType, modal.rule_id, payload);
      }
      setModal(null);
      load(true);
    } catch (e) { setFormError(e.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${natType} NAT rule ${item.rule_id}?`)) return;
    try { await deleteNATRule(deviceId, natType, item.rule_id); load(true); } catch (e) { alert(e.message); }
  };

  const ifaceLabel = natType === "source" ? "Outbound Interface" : "Inbound Interface";
  const ifaceKey = natType === "source" ? "outbound_interface" : "inbound_interface";

  return (
    <>
      {/* Sub-type switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {[
          { key: "source", label: "Source NAT (SNAT / Masquerade)" },
          { key: "destination", label: "Destination NAT (DNAT / Port Forward)" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => switchNatType(key)} style={{
            padding: "0.45rem 1.1rem", borderRadius: "8px", cursor: "pointer",
            fontWeight: 700, fontSize: "0.875rem",
            background: natType === key ? NAT_COLOR : "transparent",
            color: natType === key ? "#fff" : "var(--text-secondary)",
            border: `1px solid ${natType === key ? NAT_COLOR : "#6b6b6b"}`,
            transition: "all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem", borderRadius: "8px", border: "none", background: "#4caf50", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}>
          <FaPlus />Add Rule
        </button>
        <button onClick={() => load(true)} disabled={refreshing} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem", borderRadius: "8px", border: "none", background: refreshing ? "#6b6b6b" : VYOS_TEAL, color: "#fff", cursor: refreshing ? "not-allowed" : "pointer", fontWeight: 600, fontSize: "0.875rem", opacity: refreshing ? 0.6 : 1 }}>
          <FaSyncAlt style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />{refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading ? <Loading /> : error ? <ErrorMsg msg={error} /> : items.length === 0 ? (
        <Empty label={`${natType} NAT rules`} />
      ) : (
        <div className="page-table-container">
          <table className="page-table">
            <thead>
              <tr>
                <th>Rule</th>
                <th>{natType === "source" ? "Outbound Iface" : "Inbound Iface"}</th>
                <th>Protocol</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Translation</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...items].sort((a, b) => a.rule_id - b.rule_id).map(item => (
                <tr key={item.rule_id} style={{ opacity: item.disabled ? 0.5 : 1 }}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{item.rule_id}</td>
                  <td style={{ fontFamily: "monospace" }}>
                    {(natType === "source" ? item.outbound_interface : item.inbound_interface) || <span style={{ color: "var(--text-secondary)" }}>—</span>}
                  </td>
                  <td>{item.protocol ? <Badge label={item.protocol} color="#9c27b0" /> : <span style={{ color: "var(--text-secondary)" }}>—</span>}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {item.source_address && <AddrTag addr={item.source_address} />}
                      {item.source_port && <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>port {item.source_port}</span>}
                      {!item.source_address && !item.source_port && <span style={{ color: "var(--text-secondary)" }}>any</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {item.destination_address && <AddrTag addr={item.destination_address} />}
                      {item.destination_port && <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>port {item.destination_port}</span>}
                      {!item.destination_address && !item.destination_port && <span style={{ color: "var(--text-secondary)" }}>any</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {item.translation_address && (
                        item.translation_address === "masquerade"
                          ? <Badge label="masquerade" color={NAT_COLOR} />
                          : <AddrTag addr={item.translation_address} />
                      )}
                      {item.translation_port && <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-secondary)" }}>port {item.translation_port}</span>}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{item.description || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Btn icon={FaEdit} label="Edit" color={VYOS_TEAL} onClick={() => openEdit(item)} />
                      <Btn icon={FaTrash} label="Delete" color="#f44336" onClick={() => handleDelete(item)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === "create"
            ? `Add ${natType === "source" ? "Source" : "Destination"} NAT Rule`
            : `Edit ${natType === "source" ? "SNAT" : "DNAT"} Rule ${modal.rule_id}`}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          {formError && <p style={{ color: "#f44336", marginBottom: "0.75rem", fontWeight: 600 }}>{formError}</p>}
          {modal === "create" && (
            <FormField label="Rule ID *">
              <input style={inputStyle} type="number" min="1" value={form.rule_id} onChange={e => setForm(f => ({ ...f, rule_id: e.target.value }))} placeholder="e.g. 10" required />
            </FormField>
          )}
          <FormField label="Protocol">
            <select style={inputStyle} value={form.protocol} onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))}>
              {NAT_PROTOCOLS.map(p => <option key={p} value={p}>{p || "— any —"}</option>)}
            </select>
          </FormField>
          <FormField label={ifaceLabel}>
            <input style={inputStyle} value={form[ifaceKey]} onChange={e => setForm(f => ({ ...f, [ifaceKey]: e.target.value }))} placeholder="e.g. eth0 (optional)" />
          </FormField>
          <FormField label="Source Address">
            <input style={inputStyle} value={form.source_address} onChange={e => setForm(f => ({ ...f, source_address: e.target.value }))} placeholder="e.g. 192.168.1.0/24 (optional)" />
          </FormField>
          <FormField label="Source Port">
            <input style={inputStyle} value={form.source_port} onChange={e => setForm(f => ({ ...f, source_port: e.target.value }))} placeholder="e.g. 1024-65535 (optional)" />
          </FormField>
          <FormField label="Destination Address">
            <input style={inputStyle} value={form.destination_address} onChange={e => setForm(f => ({ ...f, destination_address: e.target.value }))} placeholder="e.g. 203.0.113.1 (optional)" />
          </FormField>
          <FormField label="Destination Port">
            <input style={inputStyle} value={form.destination_port} onChange={e => setForm(f => ({ ...f, destination_port: e.target.value }))} placeholder="e.g. 80 (optional)" />
          </FormField>
          <FormField label={`Translation Address *${natType === "source" ? " (use 'masquerade' for dynamic SNAT)" : ""}`}>
            <input style={inputStyle} value={form.translation_address} onChange={e => setForm(f => ({ ...f, translation_address: e.target.value }))} placeholder={natType === "source" ? "masquerade  or  203.0.113.1" : "e.g. 192.168.1.100"} required />
          </FormField>
          <FormField label="Translation Port">
            <input style={inputStyle} value={form.translation_port} onChange={e => setForm(f => ({ ...f, translation_port: e.target.value }))} placeholder="e.g. 8080 (optional)" />
          </FormField>
          <FormField label="Description">
            <input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
          </FormField>
        </Modal>
      )}
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN VyOS PAGE
// ══════════════════════════════════════════════════════════════════════════

const VyOS = () => {
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [activeTab, setActiveTab] = useState("networks");

  useEffect(() => {
    setDevicesLoading(true);
    fetchDevices()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.devices || []);
        setDevices(list);
        if (list.length > 0) setSelectedDevice(list[0].id || list[0]);
      })
      .catch(e => setDevicesError(e.message))
      .finally(() => setDevicesLoading(false));
  }, []);

  const renderTabContent = () => {
    if (!selectedDevice) return null;
    switch (activeTab) {
      case "networks": return <NetworksTab key={`${selectedDevice}-networks`} deviceId={selectedDevice} />;
      case "vrfs": return <VRFsTab key={`${selectedDevice}-vrfs`} deviceId={selectedDevice} />;
      case "vlans": return <VLANsTab key={`${selectedDevice}-vlans`} deviceId={selectedDevice} />;
      case "policies": return <PoliciesTab key={`${selectedDevice}-policies`} deviceId={selectedDevice} />;
      case "address_groups": return <AddressGroupsTab key={`${selectedDevice}-ag`} deviceId={selectedDevice} />;
      case "nat": return <NATTab key={`${selectedDevice}-nat`} deviceId={selectedDevice} />;
      default: return null;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <FaSitemap style={{ fontSize: "1.5rem", color: VYOS_TEAL }} />
        <h1 className="page-title" style={{ margin: 0 }}>VyOS Router Management</h1>
      </div>
      <p className="page-description">
        Manage VyOS router resources — interfaces, VRFs, VLANs, firewall policies, address groups, and NAT rules.
      </p>

      {/* Device Selector */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.9rem" }}>Device:</label>
        {devicesLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)" }}>
            <Spinner /> Loading devices…
          </div>
        ) : devicesError ? (
          <span style={{ color: "#f44336", fontWeight: 600 }}>Error: {devicesError}</span>
        ) : devices.length === 0 ? (
          <div className="page-card" style={{ margin: 0, padding: "0.75rem 1rem", display: "inline-block" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              No VyOS devices configured. Set <code style={{ background: VYOS_TEAL_DIM, color: VYOS_TEAL, padding: "0.1rem 0.3rem", borderRadius: "4px" }}>VYOS_HOSTS</code> environment variable on the vyos-api service.
            </span>
          </div>
        ) : (
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            style={{
              ...inputStyle,
              width: "auto",
              minWidth: "200px",
              borderColor: VYOS_TEAL,
            }}
            onFocus={e => e.target.style.borderColor = VYOS_TEAL}
            onBlur={e => e.target.style.borderColor = VYOS_TEAL}
          >
            {devices.map(d => {
              const id = d.id || d;
              const url = d.url || "";
              return (
                <option key={id} value={id}>
                  {id}{url ? ` — ${url}` : ""}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Tab content */}
      {selectedDevice && (
        <div className="page-content">
          <TabBar active={activeTab} onChange={setActiveTab} />
          {renderTabContent()}
        </div>
      )}
    </div>
  );
};

export default VyOS;
