import { useState, useEffect, useMemo, useCallback } from "react";
import { FaPowerOff, FaPlay, FaSearch, FaSyncAlt, FaTh, FaTable, FaTerminal, FaMicrochip, FaMemory, FaHdd, FaTimes, FaClock, FaNetworkWired, FaServer, FaTag } from "react-icons/fa";
import "./Page.css";
import { fetchVMs, startVM, shutdownVM, createVNCProxy, fetchVMDetails, fetchVMMetrics } from "../services/vmService";
import proxmoxIcon from "../assets/Proxmox.png";
import azureIcon from "../assets/Azure.png";
import awsIcon from "../assets/AWS.png";

// ── Shared primitives ──────────────────────────────────────────────────────────

const _fmt = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const MetricBar = ({ label, value, max, unit, color }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barColor = color || (pct > 85 ? "#f44336" : pct > 60 ? "#ff9800" : "#4caf50");
    return (
        <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    {typeof value === "number" ? value.toFixed(2) : value}{unit}
                    {max > 0 && <span style={{ fontWeight: "400", color: "var(--text-secondary)", fontSize: "0.78rem" }}> / {typeof max === "number" ? max.toFixed(2) : max}{unit} ({pct.toFixed(1)}%)</span>}
                </span>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: "4px", background: barColor, transition: "width 0.4s ease" }} />
            </div>
        </div>
    );
};

const MetricStat = ({ label, value, icon }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "0.75rem 0.5rem", gap: "0.2rem", minWidth: 0 }}>
        <div style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>{icon}</div>
        <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", textAlign: "center" }}>{value}</div>
        <div style={{ fontSize: "0.65rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)", textAlign: "center" }}>{label}</div>
    </div>
);

// ── VM Metrics Modal ───────────────────────────────────────────────────────────

const getStatusColor = (status) => {
    switch (status) {
        case "running": return "#4caf50";
        case "stopped": return "#f44336";
        case "paused":  return "#ff9800";
        default:        return "#9e9e9e";
    }
};

const VMMetricsModal = ({ vm, onClose }) => {
    const [metrics, setMetrics] = useState(null);
    const [details, setDetails] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState(null);
    const [live, setLive] = useState(true);

    const isRunning = vm.status === "running";

    const loadMetrics = useCallback(async () => {
        try {
            setMetricsError(null);
            const data = await fetchVMMetrics(vm.vmid);
            setMetrics(data);
        } catch (err) {
            setMetricsError(err.message);
        } finally {
            setMetricsLoading(false);
        }
    }, [vm.vmid]);

    // Fetch static config details once
    useEffect(() => {
        fetchVMDetails(vm.vmid).then(setDetails).catch(() => {});
        if (!isRunning) setMetricsLoading(false);
    }, [vm.vmid, isRunning]);

    // Initial metrics load
    useEffect(() => {
        if (!isRunning) return;
        loadMetrics();
    }, [isRunning, loadMetrics]);

    // Live polling every 3 s
    useEffect(() => {
        if (!isRunning || !live) return;
        const id = setInterval(loadMetrics, 3000);
        return () => clearInterval(id);
    }, [live, isRunning, loadMetrics]);

    // Escape key
    useEffect(() => {
        const h = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    const mem = metrics ? metrics.mem_bytes / (1024 ** 3) : vm.mem / (1024 ** 3);
    const maxmem = metrics ? metrics.maxmem_bytes / (1024 ** 3) : vm.maxmem / (1024 ** 3);

    const getTagColor = (tagName) => {
        const colors = [
            { bg: 'rgba(76,175,80,0.3)', border: '#4caf50', text: '#4caf50' },
            { bg: 'rgba(33,150,243,0.3)', border: '#2196f3', text: '#2196f3' },
            { bg: 'rgba(255,152,0,0.3)', border: '#ff9800', text: '#ff9800' },
            { bg: 'rgba(156,39,176,0.3)', border: '#9c27b0', text: '#9c27b0' },
            { bg: 'rgba(0,188,212,0.3)', border: '#00bcd4', text: '#00bcd4' },
        ];
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card-bg, #1e1e2e)", border: "1px solid var(--border-color, #333)", borderRadius: "12px", width: "100%", maxWidth: "580px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color, #333)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                        <FaServer style={{ color: "#e57000", flexShrink: 0 }} />
                        <span style={{ fontWeight: "700", fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {vm.name || `VM ${vm.vmid}`}
                        </span>
                        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "4px", flexShrink: 0, backgroundColor: getStatusColor(vm.status), color: "#fff", fontWeight: "600", textTransform: "uppercase", fontSize: "0.68rem" }}>
                            {vm.status}
                        </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        {isRunning && (
                            <button onClick={() => setLive(l => !l)} style={{ padding: "0.3rem 0.7rem", border: "1px solid", borderColor: live ? "#4caf50" : "var(--border-color, #555)", borderRadius: "6px", background: live ? "rgba(76,175,80,0.12)" : "transparent", color: live ? "#4caf50" : "var(--text-secondary)", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: live ? "#4caf50" : "var(--text-secondary)", display: "inline-block", animation: live ? "vmPulse 1.5s ease-in-out infinite" : "none" }} />
                                {live ? "Live" : "Paused"}
                            </button>
                        )}
                        {isRunning && !live && (
                            <button onClick={loadMetrics} style={{ padding: "0.3rem 0.7rem", border: "1px solid var(--border-color, #555)", borderRadius: "6px", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <FaSyncAlt size={11} /> Refresh
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: "0.2rem" }}>✕</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>

                    {/* Stopped state */}
                    {!isRunning && (
                        <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            <FaPowerOff style={{ fontSize: "2rem", marginBottom: "0.75rem", color: "#f44336", display: "block", margin: "0 auto 0.75rem" }} />
                            Live metrics are only available for running VMs.
                        </div>
                    )}

                    {/* Loading */}
                    {isRunning && metricsLoading && !metrics && (
                        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem" }}>Loading metrics…</p>
                    )}

                    {/* Error */}
                    {isRunning && metricsError && (
                        <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid #f44336", borderRadius: "8px", padding: "1rem", color: "#f44336", fontSize: "0.85rem", marginBottom: "1rem" }}>
                            {metricsError}
                        </div>
                    )}

                    {/* Live metrics */}
                    {isRunning && (metrics || !metricsLoading) && (
                        <>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.75rem", paddingBottom: "0.35rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                Resource Usage
                            </div>

                            <MetricBar
                                label="CPU"
                                value={metrics ? metrics.cpu_percent : vm.cpu * 100}
                                max={100}
                                unit="%"
                            />
                            <MetricBar
                                label="Memory"
                                value={parseFloat(mem.toFixed(2))}
                                max={parseFloat(maxmem.toFixed(2))}
                                unit=" GiB"
                                color={maxmem > 0 && (mem / maxmem) > 0.85 ? "#f44336" : maxmem > 0 && (mem / maxmem) > 0.6 ? "#ff9800" : "#2196f3"}
                            />
                            <MetricBar
                                label="Disk Space"
                                value={parseFloat((vm.disk / (1024 ** 3)).toFixed(2))}
                                max={parseFloat((vm.maxdisk / (1024 ** 3)).toFixed(2))}
                                unit=" GiB"
                                color={vm.maxdisk > 0 && (vm.disk / vm.maxdisk) > 0.85 ? "#f44336" : vm.maxdisk > 0 && (vm.disk / vm.maxdisk) > 0.6 ? "#ff9800" : "#9c27b0"}
                            />

                            {/* I/O Stats */}
                            {metrics && (
                                <>
                                    <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", margin: "1.25rem 0 0.75rem", paddingBottom: "0.35rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                        I/O Stats
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
                                        <MetricStat label="Net RX" icon="↓" value={_fmt(metrics.netin_bytes)} />
                                        <MetricStat label="Net TX" icon="↑" value={_fmt(metrics.netout_bytes)} />
                                        <MetricStat label="Disk Read" icon="📥" value={_fmt(metrics.diskread_bytes)} />
                                        <MetricStat label="Disk Write" icon="📤" value={_fmt(metrics.diskwrite_bytes)} />
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* VM Info (always shown) */}
                    <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", margin: "1.25rem 0 0.75rem", paddingBottom: "0.35rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        VM Info
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                        {[
                            { icon: <FaServer size={11} />, label: "VM ID", value: vm.vmid },
                            { icon: <FaServer size={11} />, label: "Node", value: vm.node || "—" },
                            { icon: <FaClock size={11} />, label: "Uptime", value: metrics ? (() => { const s = metrics.uptime; if (!s) return "—"; const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60); return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`; })() : vm.uptime > 0 ? (() => { const s = vm.uptime; const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60); return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`; })() : "—" },
                            ...(details?.cores ? [{ icon: <FaMicrochip size={11} />, label: "Cores", value: `${details.cores} core${details.cores !== 1 ? "s" : ""}${details.sockets > 1 ? ` × ${details.sockets} sockets` : ""}` }] : []),
                            ...(vm.ip_addresses?.length > 0 ? [{ icon: <FaNetworkWired size={11} />, label: "IP Address", value: vm.ip_addresses.join(", ") }] : []),
                        ].map(({ icon, label, value }) => (
                            <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.6rem 0.75rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-secondary)", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                                    {icon} {label}
                                </div>
                                <div style={{ fontWeight: "600", fontSize: "0.9rem", wordBreak: "break-all" }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tags */}
                    {vm.tags?.length > 0 && (
                        <div style={{ marginTop: "1rem" }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <FaTag size={10} /> Tags
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                                {vm.tags.map((tag, i) => {
                                    const key = typeof tag === "string" ? tag : (tag.key || "");
                                    const display = typeof tag === "string" ? tag : (tag.value ? `${tag.key}:${tag.value}` : tag.key);
                                    const c = getTagColor(key);
                                    return <span key={i} style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>{display}</span>;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes vmPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
};

// ── VirtualMachines page ───────────────────────────────────────────────────────

const VirtualMachines = () => {
    const [vms, setVms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all", "proxmox", "azure", "aws"
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"
    const [selectedVM, setSelectedVM] = useState(null);

    const loadVMs = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const vmData = await fetchVMs(forceRefresh);
            setVms(vmData);
        } catch (err) {
            setError(err.message || "Failed to load virtual machines");
            console.error("Error loading VMs:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadVMs(false);
    }, []);

    const handleStartVM = async (vmid) => {
        try {
            setActionLoading(prev => ({ ...prev, [vmid]: true }));
            await startVM(vmid);
            // Reload VMs to get updated status (force refresh to get latest data)
            const vmData = await fetchVMs(true);
            setVms(vmData);
        } catch (err) {
            alert(`Failed to start VM: ${err.message}`);
            console.error("Error starting VM:", err);
        } finally {
            setActionLoading(prev => ({ ...prev, [vmid]: false }));
        }
    };

    const handleShutdownVM = async (vmid) => {
        if (!window.confirm(`Are you sure you want to shutdown VM ${vmid}?`)) {
            return;
        }
        try {
            setActionLoading(prev => ({ ...prev, [vmid]: true }));
            await shutdownVM(vmid);
            // Reload VMs to get updated status (force refresh to get latest data)
            const vmData = await fetchVMs(true);
            setVms(vmData);
        } catch (err) {
            alert(`Failed to shutdown VM: ${err.message}`);
            console.error("Error shutting down VM:", err);
        } finally {
            setActionLoading(prev => ({ ...prev, [vmid]: false }));
        }
    };


    const handleOpenConsole = async (vm) => {
        try {
            setActionLoading(prev => ({ ...prev, [`console-${vm.vmid}`]: true }));
            const proxyData = await createVNCProxy(vm.vmid);
            const params = new URLSearchParams({
                vmid: vm.vmid.toString(),
                port: proxyData.port.toString(),
                vncticket: proxyData.ticket,
                node: proxyData.node,
                name: vm.name || `VM ${vm.vmid}`,
            });
            window.open(
                `/console?${params.toString()}`,
                `vnc-${vm.vmid}`,
                'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no'
            );
        } catch (err) {
            alert(`Failed to open console: ${err.message}`);
            console.error("Error opening console:", err);
        } finally {
            setActionLoading(prev => ({ ...prev, [`console-${vm.vmid}`]: false }));
        }
    };

    const handleCardClick = (vm, e) => {
        if (e.target.closest("button")) return;
        const vmType = vm.type || (typeof vm.vmid === "string" && vm.vmid.startsWith("azure-") ? "azure" : (typeof vm.vmid === "string" && vm.vmid.startsWith("aws-") ? "aws" : "proxmox"));
        if (vmType !== "proxmox") return;
        setSelectedVM(vm);
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const formatUptime = (seconds) => {
        if (!seconds || seconds === 0) return "N/A";
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    };

    // Generate a consistent color for a tag based on its name
    const getTagColor = (tagName) => {
        // Predefined color palette for tags - brighter and bolder colors
        const colors = [
            { bg: 'rgba(76, 175, 80, 0.4)', border: '#4caf50', text: '#4caf50', borderWidth: '2px' },      // Green
            { bg: 'rgba(33, 150, 243, 0.4)', border: '#2196f3', text: '#2196f3', borderWidth: '2px' },      // Blue
            { bg: 'rgba(255, 152, 0, 0.4)', border: '#ff9800', text: '#ff9800', borderWidth: '2px' },      // Orange
            { bg: 'rgba(156, 39, 176, 0.4)', border: '#9c27b0', text: '#9c27b0', borderWidth: '2px' },     // Purple
            { bg: 'rgba(244, 67, 54, 0.4)', border: '#f44336', text: '#f44336', borderWidth: '2px' },      // Red
            { bg: 'rgba(0, 188, 212, 0.4)', border: '#00bcd4', text: '#00bcd4', borderWidth: '2px' },      // Cyan
            { bg: 'rgba(255, 235, 59, 0.4)', border: '#ffc107', text: '#ffc107', borderWidth: '2px' },     // Yellow/Amber
            { bg: 'rgba(103, 58, 183, 0.4)', border: '#673ab7', text: '#673ab7', borderWidth: '2px' },     // Deep Purple
            { bg: 'rgba(255, 87, 34, 0.4)', border: '#ff5722', text: '#ff5722', borderWidth: '2px' },      // Deep Orange
            { bg: 'rgba(0, 150, 136, 0.4)', border: '#009688', text: '#009688', borderWidth: '2px' },      // Teal
            { bg: 'rgba(233, 30, 99, 0.4)', border: '#e91e63', text: '#e91e63', borderWidth: '2px' },      // Pink
            { bg: 'rgba(3, 169, 244, 0.4)', border: '#03a9f4', text: '#03a9f4', borderWidth: '2px' },     // Light Blue
            { bg: 'rgba(139, 195, 74, 0.4)', border: '#8bc34a', text: '#8bc34a', borderWidth: '2px' },     // Light Green
            { bg: 'rgba(255, 193, 7, 0.4)', border: '#ffc107', text: '#ffc107', borderWidth: '2px' },     // Amber
        ];
        
        // Hash the tag name to get a consistent index
        let hash = 0;
        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Use absolute value and modulo to get index
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    };

    const renderTags = (tags) => {
        if (!tags || tags.length === 0) return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
        
        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                {tags.map((tag, index) => {
                    let tagDisplay = '';
                    let tagKey = '';
                    
                    if (typeof tag === 'string') {
                        tagDisplay = tag;
                        tagKey = tag;
                    } else if (typeof tag === 'object' && tag !== null) {
                        tagKey = tag.key || '';
                        const tagValue = tag.value || '';
                        tagDisplay = tagValue ? `${tagKey}:${tagValue}` : tagKey;
                    } else {
                        tagDisplay = String(tag);
                        tagKey = String(tag);
                    }
                    
                    const tagColor = getTagColor(tagKey);
                    return (
                        <span
                            key={index}
                            style={{
                                padding: "0.25rem 0.5rem",
                                borderRadius: "4px",
                                backgroundColor: tagColor.bg,
                                color: tagColor.text,
                                border: `${tagColor.borderWidth || '2px'} solid ${tagColor.border}`,
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                lineHeight: "1.2",
                                textTransform: "uppercase",
                                letterSpacing: "0.3px",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {tagDisplay}
                        </span>
                    );
                })}
            </div>
        );
    };

    // Filter VMs based on search query and type filter
    const filteredVMs = useMemo(() => {
        let filtered = vms;

        // Filter by type
        if (typeFilter !== "all") {
            filtered = filtered.filter((vm) => {
                const vmType = vm.type || (typeof vm.vmid === 'string' && vm.vmid.startsWith('azure-') ? 'azure' : (typeof vm.vmid === 'string' && vm.vmid.startsWith('aws-') ? 'aws' : 'proxmox'));
                return vmType === typeFilter;
            });
        }

                // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((vm) => {
                const name = (vm.name || `VM ${vm.vmid}`).toLowerCase();
                const vmid = vm.vmid.toString().toLowerCase();
                const node = (vm.node || "").toLowerCase();
                const status = (vm.status || "").toLowerCase();
                
                // Handle different tag formats for search
                let tags = '';
                if (vm.tags && vm.tags.length > 0) {
                    const tagStrings = vm.tags.map(tag => {
                        if (typeof tag === 'string') {
                            return tag;
                        } else if (typeof tag === 'object' && tag !== null) {
                            const tagKey = tag.key || '';
                            const tagValue = tag.value || '';
                            return tagValue ? `${tagKey}:${tagValue}` : tagKey;
                        }
                        return String(tag);
                    });
                    tags = tagStrings.join(' ').toLowerCase();
                }

                return (
                    name.includes(query) ||
                    vmid.includes(query) ||
                    node.includes(query) ||
                    status.includes(query) ||
                    tags.includes(query)
                );
            });
        }

        return filtered;
    }, [vms, searchQuery, typeFilter]);

    return (
        <div className="page-container">
            <h1 className="page-title">Virtual Machines</h1>
            <p className="page-description">
                Manage and monitor your virtual machines here.
            </p>
            
            {/* Filters and Search Bar */}
            {!loading && !error && vms.length > 0 && (
                <div style={{ 
                    marginBottom: "1.5rem"
                }}>
                    <div style={{ 
                        display: "flex",
                        gap: "1rem",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                        marginBottom: "0.5rem"
                    }}>
                        {/* Type Filter */}
                        <div style={{ minWidth: "150px" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "0.5rem", 
                                color: "var(--text-primary)", 
                                fontSize: "0.9rem",
                                fontWeight: "500"
                            }}>
                                Filter by Type:
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    border: "1px solid #6b6b6b",
                                    borderRadius: "8px",
                                    fontSize: "1rem",
                                    backgroundColor: "#fff",
                                    color: "#000",
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "border-color 0.2s"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#4caf50"}
                                onBlur={(e) => e.target.style.borderColor = "#6b6b6b"}
                            >
                                <option value="all">All VMs</option>
                                <option value="proxmox">Proxmox</option>
                                <option value="azure">Azure</option>
                                <option value="aws">AWS</option>
                            </select>
                        </div>

                        {/* Search Bar */}
                        <div style={{ 
                            flex: 1,
                            maxWidth: "500px",
                            minWidth: "250px"
                        }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "0.5rem", 
                                color: "var(--text-primary)", 
                                fontSize: "0.9rem",
                                fontWeight: "500"
                            }}>
                                Search:
                            </label>
                            <div style={{
                                position: "relative",
                                display: "flex",
                                alignItems: "center"
                            }}>
                                <FaSearch 
                                    style={{
                                        position: "absolute",
                                        left: "1rem",
                                        color: "#666",
                                        pointerEvents: "none"
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search VMs by name, ID, node, or status..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem 1rem 0.75rem 2.5rem",
                                        border: "1px solid #6b6b6b",
                                        borderRadius: "8px",
                                        fontSize: "1rem",
                                        backgroundColor: "#fff",
                                        color: "#000",
                                        outline: "none",
                                        transition: "border-color 0.2s"
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = "#4caf50"}
                                    onBlur={(e) => e.target.style.borderColor = "#6b6b6b"}
                                />
                            </div>
                        </div>

                        {/* View Toggle Button */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "0.5rem", 
                                color: "var(--text-primary)", 
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                height: "1.5rem"
                            }}>
                                &nbsp;
                            </label>
                            <button
                                onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    border: "1px solid transparent",
                                    borderRadius: "8px",
                                    backgroundColor: "#6b6b6b",
                                    color: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s, opacity 0.2s",
                                    lineHeight: "1",
                                    boxSizing: "border-box",
                                    minHeight: "42px",
                                    maxHeight: "42px"
                                }}
                                title={`Switch to ${viewMode === "card" ? "table" : "card"} view`}
                            >
                                {viewMode === "card" ? <FaTable /> : <FaTh />}
                                {viewMode === "card" ? "Table" : "Cards"}
                            </button>
                        </div>

                        {/* Refresh Button */}
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "0.5rem", 
                                color: "var(--text-primary)", 
                                fontSize: "0.9rem",
                                fontWeight: "500",
                                height: "1.5rem"
                            }}>
                                &nbsp;
                            </label>
                            <button
                                onClick={() => loadVMs(true)}
                                disabled={refreshing || loading}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    border: "1px solid transparent",
                                    borderRadius: "8px",
                                    backgroundColor: refreshing || loading ? "#6b6b6b" : "#4caf50",
                                    color: "#fff",
                                    cursor: refreshing || loading ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s, opacity 0.2s",
                                    opacity: refreshing || loading ? 0.6 : 1,
                                    lineHeight: "1",
                                    boxSizing: "border-box",
                                    minHeight: "42px",
                                    maxHeight: "42px"
                                }}
                                title="Refresh data"
                            >
                                <FaSyncAlt style={{ 
                                    animation: refreshing ? "spin 1s linear infinite" : "none"
                                }} />
                                {refreshing ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>
                    </div>
                    
                    {(searchQuery || typeFilter !== "all") && (
                        <div style={{ 
                            color: "var(--text-secondary)", 
                            fontSize: "0.9rem",
                            marginTop: "0.5rem"
                        }}>
                            Showing {filteredVMs.length} of {vms.length} virtual machine{filteredVMs.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}

            <div className="page-content">
                {loading && (
                    <div className="page-card">
                        <p>Loading virtual machines...</p>
                    </div>
                )}
                
                {error && (
                    <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}>
                        <h2>Error</h2>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && vms.length === 0 && (
                    <div className="page-card">
                        <p>No virtual machines found.</p>
                    </div>
                )}

                {!loading && !error && vms.length > 0 && filteredVMs.length === 0 && searchQuery && (
                    <div className="page-card">
                        <p>No virtual machines match your search query.</p>
                    </div>
                )}

                {!loading && !error && filteredVMs.length > 0 && viewMode === "card" && (
                    <>
                        {filteredVMs.map((vm) => {
                            const vmType = vm.type || (typeof vm.vmid === 'string' && vm.vmid.startsWith('azure-') ? 'azure' : (typeof vm.vmid === 'string' && vm.vmid.startsWith('aws-') ? 'aws' : 'proxmox'));
                            const isProxmox = vmType === 'proxmox';
                            const isAzure = vmType === 'azure';
                            const isAWS = vmType === 'aws';
                            
                            // Determine icon source
                            let iconSrc = proxmoxIcon;
                            if (isAzure) iconSrc = azureIcon;
                            else if (isAWS) iconSrc = awsIcon;
                            
                            // Determine node label
                            let nodeLabel = "Node";
                            if (isAzure) nodeLabel = "Resource Group";
                            else if (isAWS) nodeLabel = "Availability Zone";
                            
                            return (
                                <div
                                    key={`${vmType}-${vm.node}-${vm.vmid}`}
                                    className="page-card"
                                    onClick={(e) => handleCardClick(vm, e)}
                                    style={{ cursor: isProxmox ? "pointer" : "default" }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                                <h2 style={{ margin: 0 }}>
                                                    {vm.name || `VM ${vm.vmid}`}
                                                </h2>
                                                <img 
                                                    src={iconSrc}
                                                    alt={vmType}
                                                    style={{
                                                        height: "24px",
                                                        width: "auto",
                                                        objectFit: "contain"
                                                    }}
                                                />
                                            </div>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                                <strong>VM ID:</strong> {vm.vmid}
                                            </p>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                                <strong>{nodeLabel}:</strong> {vm.node}
                                            </p>
                                            {vm.tags && vm.tags.length > 0 && (
                                                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                                                    <strong style={{ color: "var(--text-primary)", marginRight: "0.25rem" }}>Tags:</strong>
                                                    {vm.tags.map((tag, index) => {
                                                        // Handle different tag formats: Proxmox tags are strings, Azure/AWS tags are objects
                                                        let tagDisplay = '';
                                                        let tagKey = '';
                                                        
                                                        if (typeof tag === 'string') {
                                                            // Proxmox tags are just strings
                                                            tagDisplay = tag;
                                                            tagKey = tag;
                                                        } else if (typeof tag === 'object' && tag !== null) {
                                                            // Azure/AWS tags are objects with key and value
                                                            tagKey = tag.key || '';
                                                            const tagValue = tag.value || '';
                                                            tagDisplay = tagValue ? `${tagKey}:${tagValue}` : tagKey;
                                                        } else {
                                                            tagDisplay = String(tag);
                                                            tagKey = String(tag);
                                                        }
                                                        
                                                        const tagColor = getTagColor(tagKey);
                                                        return (
                                                            <span
                                                                key={index}
                                                                style={{
                                                                    padding: "0.35rem 0.65rem",
                                                                    borderRadius: "6px",
                                                                    backgroundColor: tagColor.bg,
                                                                    color: tagColor.text,
                                                                    border: `${tagColor.borderWidth || '2px'} solid ${tagColor.border}`,
                                                                    fontSize: "0.8rem",
                                                                    fontWeight: "600",
                                                                    lineHeight: "1.2",
                                                                    textTransform: "uppercase",
                                                                    letterSpacing: "0.5px",
                                                                    boxShadow: `0 2px 4px rgba(0, 0, 0, 0.2)`
                                                                }}
                                                            >
                                                                {tagDisplay}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <div style={{ 
                                                padding: "0.5rem 1rem", 
                                                borderRadius: "4px", 
                                                backgroundColor: getStatusColor(vm.status),
                                                color: "#fff",
                                                fontWeight: "bold",
                                                textTransform: "uppercase"
                                            }}>
                                                {vm.status}
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                {vm.status === "stopped" ? (
                                                    <button
                                                        onClick={() => handleStartVM(vm.vmid)}
                                                        disabled={actionLoading[vm.vmid]}
                                                        style={{
                                                            padding: "0.5rem",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            backgroundColor: "#4caf50",
                                                            color: "#fff",
                                                            cursor: actionLoading[vm.vmid] ? "not-allowed" : "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            opacity: actionLoading[vm.vmid] ? 0.6 : 1,
                                                            transition: "opacity 0.2s"
                                                        }}
                                                        title="Start VM"
                                                    >
                                                        <FaPlay size={16} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        {isProxmox && (
                                                            <button
                                                                onClick={() => handleOpenConsole(vm)}
                                                                disabled={actionLoading[`console-${vm.vmid}`]}
                                                                style={{
                                                                    padding: "0.5rem",
                                                                    border: "none",
                                                                    borderRadius: "4px",
                                                                    backgroundColor: "#2196f3",
                                                                    color: "#fff",
                                                                    cursor: actionLoading[`console-${vm.vmid}`] ? "not-allowed" : "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    opacity: actionLoading[`console-${vm.vmid}`] ? 0.6 : 1,
                                                                    transition: "opacity 0.2s"
                                                                }}
                                                                title="Open Console"
                                                            >
                                                                <FaTerminal size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleShutdownVM(vm.vmid)}
                                                            disabled={actionLoading[vm.vmid]}
                                                            style={{
                                                                padding: "0.5rem",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#f44336",
                                                                color: "#fff",
                                                                cursor: actionLoading[vm.vmid] ? "not-allowed" : "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                opacity: actionLoading[vm.vmid] ? 0.6 : 1,
                                                                transition: "opacity 0.2s"
                                                            }}
                                                            title="Shutdown VM"
                                                        >
                                                            <FaPowerOff size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                    gap: "1rem",
                                    marginTop: "1rem"
                                }}>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <FaMicrochip size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                            <strong>CPU:</strong> {(vm.cpu * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <FaMemory size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                            <strong>Memory:</strong> {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <FaHdd size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                            <strong>Disk:</strong> {formatBytes(vm.disk)} / {formatBytes(vm.maxdisk)}
                                        </p>
                                    </div>
                                    {vm.uptime > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <FaClock size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                                <strong>Uptime:</strong> {formatUptime(vm.uptime)}
                                            </p>
                                        </div>
                                    )}
                                    {isProxmox && vm.ip_addresses && vm.ip_addresses.length > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <FaNetworkWired size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                                <strong>IP Address{vm.ip_addresses.length > 1 ? 'es' : ''}:</strong> {vm.ip_addresses.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {isProxmox && (
                                    <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "var(--text-tertiary)", textAlign: "right" }}>
                                        Click for details
                                    </p>
                                )}
                            </div>
                            );
                        })}
                    </>
                )}

                {!loading && !error && filteredVMs.length > 0 && viewMode === "table" && (
                    <div className="page-table-container">
                        <table className="page-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>VM ID</th>
                                    <th>Node/Resource Group/AZ</th>
                                    <th>Status</th>
                                    <th>CPU</th>
                                    <th>Memory</th>
                                    <th>Disk</th>
                                    <th>Uptime</th>
                                    <th>IP Addresses</th>
                                    <th>Tags</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVMs.map((vm) => {
                                    const vmType = vm.type || (typeof vm.vmid === 'string' && vm.vmid.startsWith('azure-') ? 'azure' : (typeof vm.vmid === 'string' && vm.vmid.startsWith('aws-') ? 'aws' : 'proxmox'));
                                    const isProxmox = vmType === 'proxmox';
                                    const isAzure = vmType === 'azure';
                                    const isAWS = vmType === 'aws';
                                    
                                    // Determine icon source
                                    let iconSrc = proxmoxIcon;
                                    if (isAzure) iconSrc = azureIcon;
                                    else if (isAWS) iconSrc = awsIcon;
                                    
                                    return (
                                        <tr key={`${vmType}-${vm.node}-${vm.vmid}`}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <span>{vm.name || `VM ${vm.vmid}`}</span>
                                                    <img 
                                                        src={iconSrc}
                                                        alt={vmType}
                                                        style={{
                                                            height: "20px",
                                                            width: "auto",
                                                            objectFit: "contain"
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td>{vm.vmid}</td>
                                            <td>{vm.node || "—"}</td>
                                            <td>
                                                <span style={{ 
                                                    padding: "0.25rem 0.75rem", 
                                                    borderRadius: "4px", 
                                                    backgroundColor: getStatusColor(vm.status),
                                                    color: "#fff",
                                                    fontWeight: "600",
                                                    textTransform: "uppercase",
                                                    fontSize: "0.75rem"
                                                }}>
                                                    {vm.status}
                                                </span>
                                            </td>
                                            <td>{(vm.cpu * 100).toFixed(1)}%</td>
                                            <td>{formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}</td>
                                            <td>{formatBytes(vm.disk)} / {formatBytes(vm.maxdisk)}</td>
                                            <td>{vm.uptime > 0 ? formatUptime(vm.uptime) : "—"}</td>
                                            <td>{isProxmox && vm.ip_addresses && vm.ip_addresses.length > 0 ? vm.ip_addresses.join(', ') : "—"}</td>
                                            <td>{renderTags(vm.tags)}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                                    {vm.status === "stopped" ? (
                                                        <button
                                                            onClick={() => handleStartVM(vm.vmid)}
                                                            disabled={actionLoading[vm.vmid]}
                                                            style={{
                                                                padding: "0.4rem",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#4caf50",
                                                                color: "#fff",
                                                                cursor: actionLoading[vm.vmid] ? "not-allowed" : "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                opacity: actionLoading[vm.vmid] ? 0.6 : 1,
                                                                transition: "opacity 0.2s"
                                                            }}
                                                            title="Start VM"
                                                        >
                                                            <FaPlay size={14} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                        {isProxmox && (
                                                            <button
                                                                onClick={() => handleOpenConsole(vm)}
                                                                disabled={actionLoading[`console-${vm.vmid}`]}
                                                                style={{
                                                                    padding: "0.4rem",
                                                                    border: "none",
                                                                    borderRadius: "4px",
                                                                    backgroundColor: "#2196f3",
                                                                    color: "#fff",
                                                                    cursor: actionLoading[`console-${vm.vmid}`] ? "not-allowed" : "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    opacity: actionLoading[`console-${vm.vmid}`] ? 0.6 : 1,
                                                                    transition: "opacity 0.2s"
                                                                }}
                                                                title="Open Console"
                                                            >
                                                                <FaTerminal size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleShutdownVM(vm.vmid)}
                                                            disabled={actionLoading[vm.vmid]}
                                                            style={{
                                                                padding: "0.4rem",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                backgroundColor: "#f44336",
                                                                color: "#fff",
                                                                cursor: actionLoading[vm.vmid] ? "not-allowed" : "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                opacity: actionLoading[vm.vmid] ? 0.6 : 1,
                                                                transition: "opacity 0.2s"
                                                            }}
                                                            title="Shutdown VM"
                                                        >
                                                            <FaPowerOff size={14} />
                                                        </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* VM Metrics Modal */}
            {selectedVM && (
                <VMMetricsModal vm={selectedVM} onClose={() => setSelectedVM(null)} />
            )}
        </div>
    );
};

export default VirtualMachines;

