import React, { useState, useEffect, useCallback } from "react";
import {
    FaSyncAlt, FaSearch, FaServer, FaCube, FaNetworkWired,
    FaLayerGroup, FaDatabase, FaInfoCircle, FaTrash,
    FaRedo, FaTerminal, FaChartBar, FaArrowsAltV
} from "react-icons/fa";
import "./Page.css";
import {
    fetchPods, fetchDeployments, fetchServices, fetchNamespaces,
    fetchNodes, fetchClusterInfo,
    fetchPodLogs, fetchPodMetrics,
    deletePod, restartPod,
    deleteDeployment, restartDeployment, scaleDeployment,
    deleteService, deleteNamespace,
} from "../services/k8sService";

const TABS = ["Pods", "Deployments", "Services", "Namespaces", "Nodes", "System"];

// ── Age helper ─────────────────────────────────────────────────────────────────

const ageFrom = (isoString) => {
    if (!isoString) return "—";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const s = Math.floor(diffMs / 1000);
    if (s < 60)   return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)   return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24)   return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
};

// ── Status colors ──────────────────────────────────────────────────────────────

const getPodStatusColor = (phase) => {
    switch ((phase || "").toLowerCase()) {
        case "running":   return "#4caf50";
        case "pending":   return "#ff9800";
        case "succeeded": return "#2196f3";
        case "failed":    return "#f44336";
        default:          return "#9e9e9e";
    }
};

const getNodeStatusColor = (status) =>
    (status || "").toLowerCase() === "ready" ? "#4caf50" : "#f44336";

const getNsStatusColor = (status) =>
    (status || "").toLowerCase() === "active" ? "#4caf50" : "#9e9e9e";

// ── Shared primitives ──────────────────────────────────────────────────────────

const badge = (text, color) => (
    <span style={{
        padding: "0.18rem 0.5rem", borderRadius: "4px",
        backgroundColor: color, color: "#fff",
        fontWeight: "600", fontSize: "0.68rem", textTransform: "uppercase",
        letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{text}</span>
);

const KV = ({ label, value, mono }) => {
    if (value == null || value === "") return null;
    return (
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr",
            gap: "0.3rem 0.75rem", marginBottom: "0.4rem", alignItems: "start" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: "600", textTransform: "uppercase",
                letterSpacing: "0.05em", color: "var(--text-secondary)", paddingTop: "0.1rem" }}>
                {label}
            </span>
            <span style={{ fontSize: "0.875rem", color: "var(--text-primary)",
                fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>
                {String(value)}
            </span>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--text-secondary)",
            marginBottom: "0.6rem", paddingBottom: "0.35rem",
            borderBottom: "1px solid var(--border-subtle)" }}>
            {title}
        </div>
        {children}
    </div>
);

const MetricBar = ({ label, value, max, unit }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barColor = pct > 85 ? "#f44336" : pct > 60 ? "#ff9800" : "#4caf50";
    return (
        <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "baseline", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: "600",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "700",
                    color: "var(--text-primary)" }}>
                    {value}{unit}
                    {max > 0 && <span style={{ fontWeight: "400",
                        color: "var(--text-secondary)", fontSize: "0.78rem" }}>
                        {" / "}{max}{unit} ({pct.toFixed(1)}%)
                    </span>}
                </span>
            </div>
            <div style={{ height: "8px", borderRadius: "4px",
                background: "var(--border-subtle)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px",
                    background: barColor, transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
};

// ── Modal wrapper ──────────────────────────────────────────────────────────────

const Modal = ({ title, subtitle, icon, onClose, children, maxWidth = "620px" }) => {
    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    return (
        <div onClick={onClose} style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
            zIndex: 1100, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "1rem"
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: "var(--bg-surface-1)", border: "1px solid var(--border-default)",
                borderRadius: "12px", width: "100%", maxWidth,
                maxHeight: "90vh", display: "flex", flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center",
                        gap: "0.6rem", minWidth: 0 }}>
                        {icon && <span style={{ color: "var(--text-secondary)" }}>{icon}</span>}
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: "700", color: "var(--text-primary)",
                                fontSize: "1rem", overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {title}
                            </div>
                            {subtitle && <div style={{ fontSize: "0.75rem",
                                color: "var(--text-secondary)" }}>{subtitle}</div>}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none",
                        color: "var(--text-secondary)", cursor: "pointer",
                        fontSize: "1.2rem", lineHeight: 1, padding: "0.2rem", flexShrink: 0 }}>
                        ✕
                    </button>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// ── Confirm Modal ──────────────────────────────────────────────────────────────

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
    <div onClick={onCancel} style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
        zIndex: 1200, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "1rem"
    }}>
        <div onClick={e => e.stopPropagation()} style={{
            background: "var(--bg-surface-1)", border: "1px solid var(--border-default)",
            borderRadius: "12px", padding: "1.5rem", maxWidth: "400px", width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
        }}>
            <p style={{ color: "var(--text-primary)", marginBottom: "1.25rem",
                fontSize: "0.9rem", lineHeight: 1.5 }}>{message}</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button onClick={onCancel} style={{
                    padding: "0.4rem 1rem", border: "1px solid var(--border-default)",
                    borderRadius: "6px", background: "transparent",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.85rem"
                }}>Cancel</button>
                <button onClick={onConfirm} style={{
                    padding: "0.4rem 1rem", border: "none",
                    borderRadius: "6px", background: "#f44336",
                    color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
                }}>Confirm</button>
            </div>
        </div>
    </div>
);

// ── Action button ──────────────────────────────────────────────────────────────

const Btn = ({ icon, title, onClick, color, disabled }) => (
    <button
        title={title}
        onClick={onClick}
        disabled={disabled}
        style={{
            background: "none", border: "1px solid var(--border-subtle)",
            borderRadius: "5px", padding: "0.3rem 0.5rem",
            color: disabled ? "var(--text-secondary)" : (color || "var(--text-secondary)"),
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem",
            opacity: disabled ? 0.5 : 1,
        }}
    >
        {icon}
    </button>
);

// ── Table ──────────────────────────────────────────────────────────────────────

const Table = ({ headers, rows, emptyMessage }) => (
    <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse",
            fontSize: "0.83rem", color: "var(--text-primary)" }}>
            <thead>
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} style={{
                            textAlign: "left", padding: "0.5rem 0.75rem",
                            fontSize: "0.7rem", fontWeight: "700",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            color: "var(--text-secondary)",
                            borderBottom: "1px solid var(--border-subtle)",
                            whiteSpace: "nowrap",
                        }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length === 0 ? (
                    <tr>
                        <td colSpan={headers.length} style={{
                            padding: "2rem", textAlign: "center",
                            color: "var(--text-secondary)"
                        }}>{emptyMessage || "No items found."}</td>
                    </tr>
                ) : rows.map((row, i) => (
                    <tr key={i}
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface-2)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >{row}</tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TD = ({ children, mono, muted }) => (
    <td style={{
        padding: "0.55rem 0.75rem", verticalAlign: "middle",
        fontFamily: mono ? "monospace" : "inherit",
        color: muted ? "var(--text-secondary)" : "var(--text-primary)",
        whiteSpace: "nowrap", maxWidth: "220px",
        overflow: "hidden", textOverflow: "ellipsis",
    }}>{children}</td>
);

// ── Search + toolbar ───────────────────────────────────────────────────────────

const SearchBar = ({ value, onChange }) => (
    <div style={{ position: "relative", flexShrink: 0 }}>
        <FaSearch style={{
            position: "absolute", left: "0.65rem", top: "50%",
            transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "0.75rem",
        }} />
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Filter…"
            style={{
                paddingLeft: "2rem", paddingRight: "0.75rem",
                paddingTop: "0.4rem", paddingBottom: "0.4rem",
                border: "1px solid var(--border-default)",
                borderRadius: "6px", background: "var(--bg-surface-1)",
                color: "var(--text-primary)", fontSize: "0.83rem",
                outline: "none", width: "220px",
            }}
        />
    </div>
);

const TabHeader = ({ icon, title, count, search, onSearch, onRefresh, loading }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem",
        marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
            color: "var(--text-primary)", fontWeight: "600", fontSize: "0.95rem" }}>
            {icon}{title}
            {count != null && <span style={{ fontSize: "0.75rem",
                color: "var(--text-secondary)", fontWeight: "400" }}>({count})</span>}
        </div>
        <div style={{ flex: 1 }} />
        <SearchBar value={search} onChange={onSearch} />
        <button onClick={onRefresh} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.4rem 0.8rem", border: "1px solid var(--border-default)",
            borderRadius: "6px", background: "transparent",
            color: "var(--text-secondary)", cursor: loading ? "not-allowed" : "pointer",
            fontSize: "0.8rem", opacity: loading ? 0.5 : 1,
        }}>
            <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
        </button>
    </div>
);

// ── Error banner ───────────────────────────────────────────────────────────────

const ErrBanner = ({ msg }) => msg ? (
    <div style={{ color: "#f44336", marginBottom: "1rem", fontSize: "0.85rem",
        padding: "0.6rem 0.9rem", background: "rgba(244,67,54,0.08)",
        borderRadius: "6px", border: "1px solid rgba(244,67,54,0.3)" }}>
        {msg}
    </div>
) : null;

// ── Pod Logs Modal ─────────────────────────────────────────────────────────────

const LogsModal = ({ pod, onClose }) => {
    const [logs, setLogs] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tail, setTail] = useState(100);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setLogs(await fetchPodLogs(pod.namespace, pod.name, tail)); }
        catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [pod, tail]);

    useEffect(() => { load(); }, [load]);

    return (
        <Modal title={pod.name} subtitle={`${pod.namespace} · logs`}
            icon={<FaTerminal />} onClose={onClose} maxWidth="780px">
            <div style={{ display: "flex", gap: "0.5rem",
                alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Lines:</span>
                {[50, 100, 500, 1000].map(n => (
                    <button key={n} onClick={() => setTail(n)} style={{
                        padding: "0.2rem 0.6rem", border: "1px solid",
                        borderColor: tail === n ? "var(--accent, #2196f3)" : "var(--border-default)",
                        borderRadius: "4px",
                        background: tail === n ? "var(--accent, #2196f3)" : "transparent",
                        color: tail === n ? "#fff" : "var(--text-secondary)",
                        cursor: "pointer", fontSize: "0.75rem",
                    }}>{n}</button>
                ))}
                <button onClick={load} style={{
                    marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem",
                    padding: "0.2rem 0.6rem", border: "1px solid var(--border-default)",
                    borderRadius: "4px", background: "transparent",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.75rem",
                }}><FaSyncAlt size={11} /> Refresh</button>
            </div>
            {loading && <p style={{ color: "var(--text-secondary)", textAlign: "center",
                padding: "2rem" }}>Loading logs…</p>}
            {error && <ErrBanner msg={error} />}
            {!loading && !error && (
                <pre style={{
                    margin: 0, padding: "0.75rem 1rem",
                    background: "var(--bg-surface-2)", borderRadius: "8px",
                    fontFamily: "monospace", fontSize: "0.75rem",
                    color: "var(--text-primary)", whiteSpace: "pre-wrap",
                    wordBreak: "break-all", maxHeight: "60vh", overflowY: "auto",
                    lineHeight: 1.55,
                }}>{logs || "(no output)"}</pre>
            )}
        </Modal>
    );
};

// ── Pod Metrics Modal ──────────────────────────────────────────────────────────

const PodMetricsModal = ({ pod, onClose }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPodMetrics(pod.namespace, pod.name)
            .then(setMetrics)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [pod]);

    return (
        <Modal title={pod.name} subtitle={`${pod.namespace} · metrics`}
            icon={<FaChartBar />} onClose={onClose} maxWidth="520px">
            {loading && <p style={{ color: "var(--text-secondary)", textAlign: "center",
                padding: "2rem" }}>Loading metrics…</p>}
            {error && <ErrBanner msg={error} />}
            {!loading && !error && metrics && (
                <>
                    <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem",
                        color: "var(--text-secondary)" }}>
                        Total:{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                            {metrics.total_cpu_millicores}m CPU
                        </strong>{" / "}
                        <strong style={{ color: "var(--text-primary)" }}>
                            {metrics.total_memory_mib} MiB RAM
                        </strong>
                    </div>
                    {(metrics.containers || []).map((c, i) => (
                        <div key={i} style={{ marginBottom: "1.25rem", padding: "0.75rem",
                            background: "var(--bg-surface-2)", borderRadius: "8px" }}>
                            <div style={{ fontWeight: "600", fontSize: "0.85rem",
                                color: "var(--text-primary)", marginBottom: "0.6rem" }}>
                                {c.name}
                            </div>
                            <MetricBar label="CPU" value={c.cpu_millicores} max={0} unit="m" />
                            <MetricBar label="Memory" value={c.memory_mib} max={0} unit=" MiB" />
                        </div>
                    ))}
                </>
            )}
        </Modal>
    );
};

// ── Scale Modal ────────────────────────────────────────────────────────────────

const ScaleModal = ({ deployment, onClose, onScaled }) => {
    // API field: deployment.replicas = desired count
    const [replicas, setReplicas] = useState(deployment.replicas ?? 1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = async () => {
        setLoading(true); setError(null);
        try {
            await scaleDeployment(deployment.namespace, deployment.name, Number(replicas));
            onScaled(); onClose();
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <Modal title={deployment.name} subtitle={`${deployment.namespace} · scale`}
            icon={<FaArrowsAltV />} onClose={onClose} maxWidth="380px">
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem",
                    color: "var(--text-secondary)", marginBottom: "0.4rem",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    fontWeight: "600" }}>Replicas</label>
                <input type="number" min={0} max={50} value={replicas}
                    onChange={e => setReplicas(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem",
                        border: "1px solid var(--border-default)", borderRadius: "6px",
                        background: "var(--bg-surface-1)", color: "var(--text-primary)",
                        fontSize: "1rem" }} />
            </div>
            {error && <ErrBanner msg={error} />}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button onClick={onClose} style={{
                    padding: "0.4rem 1rem", border: "1px solid var(--border-default)",
                    borderRadius: "6px", background: "transparent",
                    color: "var(--text-secondary)", cursor: "pointer" }}>Cancel</button>
                <button onClick={submit} disabled={loading} style={{
                    padding: "0.4rem 1rem", border: "none", borderRadius: "6px",
                    background: "var(--accent, #2196f3)", color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: "600", opacity: loading ? 0.7 : 1,
                }}>{loading ? "Scaling…" : "Apply"}</button>
            </div>
        </Modal>
    );
};

// ── Pods Tab ───────────────────────────────────────────────────────────────────
// API fields: name, namespace, phase, node_name, pod_ip, start_time, containers[]
// containers[]: name, image, ready(bool), restarts, state

const PodsTab = () => {
    const [pods, setPods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [logsTarget, setLogsTarget] = useState(null);
    const [metricsTarget, setMetricsTarget] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState({});

    const load = useCallback(async (force = false) => {
        setLoading(true); setError(null);
        try {
            // API returns a plain array
            const data = await fetchPods(force);
            setPods(Array.isArray(data) ? data : (data.pods || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Compute ready string and total restarts from containers array
    const podReady = (pod) => {
        const ctrs = pod.containers || [];
        const readyCount = ctrs.filter(c => c.ready).length;
        return `${readyCount}/${ctrs.length}`;
    };

    const podRestarts = (pod) =>
        (pod.containers || []).reduce((sum, c) => sum + (c.restarts || 0), 0);

    const handleDelete = (pod) => setConfirm({
        message: `Delete pod "${pod.name}" in namespace "${pod.namespace}"? The controller will recreate it.`,
        onConfirm: async () => {
            setConfirm(null);
            setBusy(b => ({ ...b, [pod.name]: true }));
            try { await deletePod(pod.namespace, pod.name); await load(true); }
            catch {} finally { setBusy(b => ({ ...b, [pod.name]: false })); }
        }
    });

    const handleRestart = async (pod) => {
        setBusy(b => ({ ...b, [pod.name]: true }));
        try { await restartPod(pod.namespace, pod.name); await load(true); }
        catch {} finally { setBusy(b => ({ ...b, [pod.name]: false })); }
    };

    const filtered = pods.filter(p =>
        [p.name, p.namespace, p.phase, p.node_name]
            .join(" ").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <TabHeader icon={<FaCube />} title="Pods" count={filtered.length}
                search={search} onSearch={setSearch}
                onRefresh={() => load(true)} loading={loading} />
            <ErrBanner msg={error} />
            <Table
                headers={["Name", "Namespace", "Status", "Ready", "Restarts", "Node", "Age", "Actions"]}
                emptyMessage={loading ? "Loading pods…" : "No pods found."}
                rows={filtered.map(pod => [
                    <TD key="n" mono>{pod.name}</TD>,
                    <TD key="ns" muted>{pod.namespace}</TD>,
                    <TD key="s">{badge(pod.phase || "unknown", getPodStatusColor(pod.phase))}</TD>,
                    <TD key="r" mono>{podReady(pod)}</TD>,
                    <TD key="rs" mono>{podRestarts(pod)}</TD>,
                    <TD key="nd" muted>{pod.node_name || "—"}</TD>,
                    <TD key="a" muted>{ageFrom(pod.start_time)}</TD>,
                    <TD key="act">
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                            <Btn icon={<FaTerminal size={11} />} title="Logs"
                                onClick={() => setLogsTarget(pod)} />
                            <Btn icon={<FaChartBar size={11} />} title="Metrics"
                                onClick={() => setMetricsTarget(pod)} />
                            <Btn icon={<FaRedo size={11} />} title="Restart"
                                disabled={busy[pod.name]}
                                onClick={() => handleRestart(pod)} />
                            <Btn icon={<FaTrash size={11} />} title="Delete"
                                color="#f44336" disabled={busy[pod.name]}
                                onClick={() => handleDelete(pod)} />
                        </div>
                    </TD>,
                ])}
            />
            {logsTarget && <LogsModal pod={logsTarget} onClose={() => setLogsTarget(null)} />}
            {metricsTarget && <PodMetricsModal pod={metricsTarget} onClose={() => setMetricsTarget(null)} />}
            {confirm && <ConfirmModal message={confirm.message}
                onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
        </div>
    );
};

// ── Deployments Tab ────────────────────────────────────────────────────────────
// API fields: name, namespace, replicas, ready_replicas, available_replicas,
//             updated_replicas, image(string), labels, created_at, conditions[]

const DeploymentsTab = () => {
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [scaleTarget, setScaleTarget] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState({});

    const load = useCallback(async (force = false) => {
        setLoading(true); setError(null);
        try {
            const data = await fetchDeployments(force);
            setDeployments(Array.isArray(data) ? data : (data.deployments || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const key = (d) => `${d.namespace}/${d.name}`;

    const handleDelete = (d) => setConfirm({
        message: `Delete deployment "${d.name}" in "${d.namespace}"? All its pods will be removed.`,
        onConfirm: async () => {
            setConfirm(null);
            setBusy(b => ({ ...b, [key(d)]: true }));
            try { await deleteDeployment(d.namespace, d.name); await load(true); }
            catch {} finally { setBusy(b => ({ ...b, [key(d)]: false })); }
        }
    });

    const handleRestart = async (d) => {
        setBusy(b => ({ ...b, [key(d)]: true }));
        try { await restartDeployment(d.namespace, d.name); await load(true); }
        catch {} finally { setBusy(b => ({ ...b, [key(d)]: false })); }
    };

    const filtered = deployments.filter(d =>
        [d.name, d.namespace, d.image]
            .join(" ").toLowerCase().includes(search.toLowerCase())
    );

    // ready_replicas / replicas — colour green if equal
    const readyColor = (d) =>
        (d.ready_replicas ?? 0) === (d.replicas ?? 0) ? "#4caf50" : "#ff9800";

    return (
        <div>
            <TabHeader icon={<FaLayerGroup />} title="Deployments" count={filtered.length}
                search={search} onSearch={setSearch}
                onRefresh={() => load(true)} loading={loading} />
            <ErrBanner msg={error} />
            <Table
                headers={["Name", "Namespace", "Ready", "Image", "Age", "Actions"]}
                emptyMessage={loading ? "Loading deployments…" : "No deployments found."}
                rows={filtered.map(d => [
                    <TD key="n" mono>{d.name}</TD>,
                    <TD key="ns" muted>{d.namespace}</TD>,
                    <TD key="r">
                        <span style={{ fontWeight: "700", fontFamily: "monospace",
                            color: readyColor(d) }}>
                            {d.ready_replicas ?? 0}/{d.replicas ?? 0}
                        </span>
                    </TD>,
                    <TD key="img" mono muted>{d.image || "—"}</TD>,
                    <TD key="a" muted>{ageFrom(d.created_at)}</TD>,
                    <TD key="act">
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                            <Btn icon={<FaArrowsAltV size={11} />} title="Scale"
                                onClick={() => setScaleTarget(d)} />
                            <Btn icon={<FaRedo size={11} />} title="Rolling restart"
                                disabled={busy[key(d)]}
                                onClick={() => handleRestart(d)} />
                            <Btn icon={<FaTrash size={11} />} title="Delete"
                                color="#f44336" disabled={busy[key(d)]}
                                onClick={() => handleDelete(d)} />
                        </div>
                    </TD>,
                ])}
            />
            {scaleTarget && (
                <ScaleModal deployment={scaleTarget}
                    onClose={() => setScaleTarget(null)}
                    onScaled={() => load(true)} />
            )}
            {confirm && <ConfirmModal message={confirm.message}
                onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
        </div>
    );
};

// ── Services Tab ───────────────────────────────────────────────────────────────
// API fields: name, namespace, type, cluster_ip, ports[], labels, created_at
// ports[]: name, protocol, port, target_port(string), node_port(int, optional)

const ServicesTab = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState({});

    const load = useCallback(async (force = false) => {
        setLoading(true); setError(null);
        try {
            const data = await fetchServices(force);
            setServices(Array.isArray(data) ? data : (data.services || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const key = (s) => `${s.namespace}/${s.name}`;

    const handleDelete = (svc) => setConfirm({
        message: `Delete service "${svc.name}" in "${svc.namespace}"?`,
        onConfirm: async () => {
            setConfirm(null);
            setBusy(b => ({ ...b, [key(svc)]: true }));
            try { await deleteService(svc.namespace, svc.name); await load(true); }
            catch {} finally { setBusy(b => ({ ...b, [key(svc)]: false })); }
        }
    });

    const svcTypeColor = (t) => {
        switch ((t || "").toLowerCase()) {
            case "loadbalancer": return "#9c27b0";
            case "nodeport":     return "#ff9800";
            case "clusterip":    return "#2196f3";
            default:             return "#9e9e9e";
        }
    };

    const formatPorts = (ports) => {
        if (!ports || ports.length === 0) return "—";
        return ports.map(p =>
            p.node_port
                ? `${p.port}:${p.node_port}/${p.protocol}`
                : `${p.port}/${p.protocol}`
        ).join(", ");
    };

    const filtered = services.filter(s =>
        [s.name, s.namespace, s.type, s.cluster_ip]
            .join(" ").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <TabHeader icon={<FaNetworkWired />} title="Services" count={filtered.length}
                search={search} onSearch={setSearch}
                onRefresh={() => load(true)} loading={loading} />
            <ErrBanner msg={error} />
            <Table
                headers={["Name", "Namespace", "Type", "Cluster IP", "Ports", "Age", "Actions"]}
                emptyMessage={loading ? "Loading services…" : "No services found."}
                rows={filtered.map(svc => [
                    <TD key="n" mono>{svc.name}</TD>,
                    <TD key="ns" muted>{svc.namespace}</TD>,
                    <TD key="t">{badge(svc.type, svcTypeColor(svc.type))}</TD>,
                    <TD key="ci" mono muted>{svc.cluster_ip || "—"}</TD>,
                    <TD key="p" mono muted>{formatPorts(svc.ports)}</TD>,
                    <TD key="a" muted>{ageFrom(svc.created_at)}</TD>,
                    <TD key="act">
                        <Btn icon={<FaTrash size={11} />} title="Delete"
                            color="#f44336" disabled={busy[key(svc)]}
                            onClick={() => handleDelete(svc)} />
                    </TD>,
                ])}
            />
            {confirm && <ConfirmModal message={confirm.message}
                onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
        </div>
    );
};

// ── Namespaces Tab ─────────────────────────────────────────────────────────────
// API fields: name, status, labels, created_at

const NamespacesTab = () => {
    const [namespaces, setNamespaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState({});

    const PROTECTED = new Set(["default", "kube-system", "kube-public", "kube-node-lease"]);

    const load = useCallback(async (force = false) => {
        setLoading(true); setError(null);
        try {
            const data = await fetchNamespaces(force);
            setNamespaces(Array.isArray(data) ? data : (data.namespaces || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = (ns) => setConfirm({
        message: `Delete namespace "${ns.name}"? This will delete ALL resources inside it.`,
        onConfirm: async () => {
            setConfirm(null);
            setBusy(b => ({ ...b, [ns.name]: true }));
            try { await deleteNamespace(ns.name); await load(true); }
            catch {} finally { setBusy(b => ({ ...b, [ns.name]: false })); }
        }
    });

    const filtered = namespaces.filter(ns =>
        [ns.name, ns.status].join(" ").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <TabHeader icon={<FaDatabase />} title="Namespaces" count={filtered.length}
                search={search} onSearch={setSearch}
                onRefresh={() => load(true)} loading={loading} />
            <ErrBanner msg={error} />
            <Table
                headers={["Name", "Status", "Age", "Actions"]}
                emptyMessage={loading ? "Loading namespaces…" : "No namespaces found."}
                rows={filtered.map(ns => [
                    <TD key="n" mono>{ns.name}</TD>,
                    <TD key="s">{badge(ns.status, getNsStatusColor(ns.status))}</TD>,
                    <TD key="a" muted>{ageFrom(ns.created_at)}</TD>,
                    <TD key="act">
                        {!PROTECTED.has(ns.name) && (
                            <Btn icon={<FaTrash size={11} />} title="Delete"
                                color="#f44336" disabled={busy[ns.name]}
                                onClick={() => handleDelete(ns)} />
                        )}
                    </TD>,
                ])}
            />
            {confirm && <ConfirmModal message={confirm.message}
                onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
        </div>
    );
};

// ── Nodes Tab ──────────────────────────────────────────────────────────────────
// API fields: name, status, roles[], kubelet_version, os_image, container_runtime,
//             architecture, cpu_capacity, memory_capacity, cpu_allocatable,
//             memory_allocatable, labels, conditions[]

const NodesTab = () => {
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [detail, setDetail] = useState(null);

    const load = useCallback(async (force = false) => {
        setLoading(true); setError(null);
        try {
            const data = await fetchNodes(force);
            setNodes(Array.isArray(data) ? data : (data.nodes || []));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = nodes.filter(n =>
        [n.name, n.status, n.kubelet_version, (n.roles || []).join(" ")]
            .join(" ").toLowerCase().includes(search.toLowerCase())
    );

    // Format memory from Ki to GiB
    const fmtMem = (val) => {
        if (!val) return "—";
        const ki = parseInt(val);
        if (isNaN(ki)) return val;
        return `${(ki / 1024 / 1024).toFixed(1)} GiB`;
    };

    return (
        <div>
            <TabHeader icon={<FaServer />} title="Nodes" count={filtered.length}
                search={search} onSearch={setSearch}
                onRefresh={() => load(true)} loading={loading} />
            <ErrBanner msg={error} />
            <Table
                headers={["Name", "Status", "Roles", "Version", "CPU", "Memory", "Actions"]}
                emptyMessage={loading ? "Loading nodes…" : "No nodes found."}
                rows={filtered.map(node => [
                    <TD key="n" mono>{node.name}</TD>,
                    <TD key="s">{badge(node.status, getNodeStatusColor(node.status))}</TD>,
                    <TD key="r" muted>{(node.roles || []).join(", ") || "—"}</TD>,
                    <TD key="v" mono muted>{node.kubelet_version || "—"}</TD>,
                    <TD key="c" mono>{node.cpu_allocatable || node.cpu_capacity || "—"}</TD>,
                    <TD key="m" mono>{fmtMem(node.memory_allocatable || node.memory_capacity)}</TD>,
                    <TD key="act">
                        <Btn icon={<FaInfoCircle size={11} />} title="Details"
                            onClick={() => setDetail(node)} />
                    </TD>,
                ])}
            />

            {detail && (
                <Modal title={detail.name} subtitle="node details"
                    icon={<FaServer />} onClose={() => setDetail(null)}>
                    <Section title="Identity">
                        <KV label="Status" value={detail.status} />
                        <KV label="Roles"  value={(detail.roles || []).join(", ") || "none"} />
                    </Section>
                    <Section title="System">
                        <KV label="OS Image"           value={detail.os_image} />
                        <KV label="Architecture"       value={detail.architecture} />
                        <KV label="Container Runtime"  value={detail.container_runtime} mono />
                        <KV label="Kubelet Version"    value={detail.kubelet_version} mono />
                    </Section>
                    <Section title="Capacity">
                        <KV label="CPU (capacity)"    value={detail.cpu_capacity} />
                        <KV label="CPU (allocatable)" value={detail.cpu_allocatable} />
                        <KV label="Mem (capacity)"    value={fmtMem(detail.memory_capacity)} />
                        <KV label="Mem (allocatable)" value={fmtMem(detail.memory_allocatable)} />
                    </Section>
                    {detail.conditions && detail.conditions.length > 0 && (
                        <Section title="Conditions">
                            {detail.conditions.map((c, i) => (
                                <KV key={i} label={c.type}
                                    value={`${c.status} — ${c.reason || c.message || ""}`} />
                            ))}
                        </Section>
                    )}
                </Modal>
            )}
        </div>
    );
};

// ── System Tab ─────────────────────────────────────────────────────────────────
// API fields: server_version, git_commit, platform, go_version,
//             node_count, namespace_count, pod_count

const SystemTab = () => {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setInfo(await fetchClusterInfo()); }
        catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const statBox = (label, value) => (
        <div style={{ background: "var(--bg-surface-2)", borderRadius: "8px",
            padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: "700",
                color: "var(--text-primary)", fontFamily: "monospace" }}>
                {value ?? "—"}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: "600",
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                {label}
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem",
                marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                    color: "var(--text-primary)", fontWeight: "600", fontSize: "0.95rem" }}>
                    <FaInfoCircle /> Cluster Info
                </div>
                <div style={{ flex: 1 }} />
                <button onClick={load} disabled={loading} style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.4rem 0.8rem", border: "1px solid var(--border-default)",
                    borderRadius: "6px", background: "transparent",
                    color: "var(--text-secondary)", cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.8rem", opacity: loading ? 0.5 : 1,
                }}>
                    <FaSyncAlt style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                    Refresh
                </button>
            </div>

            <ErrBanner msg={error} />

            {loading && <p style={{ color: "var(--text-secondary)", padding: "2rem",
                textAlign: "center" }}>Loading cluster info…</p>}

            {!loading && !error && info && (
                <>
                    <div style={{ display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                        gap: "0.75rem", marginBottom: "1.5rem" }}>
                        {statBox("Nodes",      info.node_count)}
                        {statBox("Pods",       info.pod_count)}
                        {statBox("Namespaces", info.namespace_count)}
                    </div>
                    <div style={{ background: "var(--bg-surface-2)", borderRadius: "8px",
                        padding: "1.25rem" }}>
                        <KV label="Kubernetes Version" value={info.server_version} mono />
                        <KV label="Platform"           value={info.platform} mono />
                        <KV label="Go Version"         value={info.go_version} mono />
                        <KV label="Git Commit"         value={info.git_commit} mono />
                    </div>
                </>
            )}
        </div>
    );
};

// ── Main page ──────────────────────────────────────────────────────────────────

const tabColors = {
    Pods:        "#326ce5",
    Deployments: "#ff9800",
    Services:    "#9c27b0",
    Namespaces:  "#00bcd4",
    Nodes:       "#4caf50",
    System:      "#607d8b",
};

const tabIcons = {
    Pods:        <FaCube        style={{ color: tabColors.Pods }} />,
    Deployments: <FaLayerGroup  style={{ color: tabColors.Deployments }} />,
    Services:    <FaNetworkWired style={{ color: tabColors.Services }} />,
    Namespaces:  <FaDatabase    style={{ color: tabColors.Namespaces }} />,
    Nodes:       <FaServer      style={{ color: tabColors.Nodes }} />,
    System:      <FaInfoCircle  style={{ color: tabColors.System }} />,
};

const Kubernetes = () => {
    const [tab, setTab] = useState("Pods");

    const renderTab = () => {
        switch (tab) {
            case "Pods":        return <PodsTab />;
            case "Deployments": return <DeploymentsTab />;
            case "Services":    return <ServicesTab />;
            case "Namespaces":  return <NamespacesTab />;
            case "Nodes":       return <NodesTab />;
            case "System":      return <SystemTab />;
            default:            return null;
        }
    };

    return (
        <div className="page-container">
            <h1 className="page-title">Kubernetes</h1>

            <div style={{
                display: "flex", gap: "0.25rem", marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-subtle)",
                overflowX: "auto",
            }}>
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        display: "flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.6rem 1.25rem", border: "none", background: "none",
                        cursor: "pointer", fontSize: "0.95rem",
                        fontWeight: tab === t ? "600" : "400",
                        color: tab === t ? "var(--text-primary)" : "var(--text-secondary)",
                        borderBottom: tab === t
                            ? `2px solid ${tabColors[t]}`
                            : "2px solid transparent",
                        marginBottom: "-1px",
                        transition: "color 0.15s, border-color 0.15s",
                        whiteSpace: "nowrap",
                    }}>
                        {tabIcons[t]} {t}
                    </button>
                ))}
            </div>

            <div className="page-content">
                {renderTab()}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Kubernetes;
