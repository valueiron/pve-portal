import React, { useState, useEffect, useMemo } from "react";
import { FaPowerOff, FaPlay, FaSearch, FaSyncAlt, FaTh, FaTable, FaTerminal, FaPlus, FaTimes } from "react-icons/fa";
import "./Page.css";
import { fetchVMs, startVM, shutdownVM, createVNCProxy, createVM, getNextVmId, fetchTemplates, cloneVM } from "../services/vmService";
import { API_ENDPOINTS } from "../config/api";

import { FaEye, FaEyeSlash, FaChevronDown, FaChevronRight } from "react-icons/fa";

const inputStyle = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    border: "1px solid var(--border-strong)",
    borderRadius: "6px",
    fontSize: "0.9rem",
    backgroundColor: "var(--bg-surface-2)",
    color: "var(--text-primary)",
    outline: "none",
    boxSizing: "border-box",
};

const labelStyle = {
    display: "block",
    marginBottom: "0.35rem",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: "500",
};

const SectionDivider = ({ title }) => (
    <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        margin: "1.25rem 0 1rem",
    }}>
        <span style={{
            fontSize: "0.7rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap",
        }}>
            {title}
        </span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
    </div>
);

const TagsNotesFields = ({ form, setForm }) => (
    <>
        <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Tags</label>
            <input
                type="text"
                placeholder="e.g. web, prod, nginx (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm(prev => ({ ...prev, tags: e.target.value }))}
                style={inputStyle}
            />
        </div>
        <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Notes / Description</label>
            <textarea
                placeholder="Optional notes about this VM..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }}
            />
        </div>
    </>
);

const CloudInitFields = ({ form, setForm }) => {
    const [expanded, setExpanded] = React.useState(false);
    const [showPw, setShowPw] = React.useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: expanded ? "1rem" : 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.7rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                }}
            >
                {expanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                Cloud-Init
                <span style={{ fontSize: "0.7rem", fontWeight: "400", color: "var(--text-tertiary)" }}>
                    (optional)
                </span>
            </button>

            {expanded && (
                <div>
                    {/* User & Password */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                        <div>
                            <label style={labelStyle}>User</label>
                            <input
                                type="text"
                                placeholder="e.g. ubuntu"
                                value={form.ciuser}
                                onChange={(e) => setForm(prev => ({ ...prev, ciuser: e.target.value }))}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPw ? "text" : "password"}
                                    placeholder="Cloud-init password"
                                    value={form.cipassword}
                                    onChange={(e) => setForm(prev => ({ ...prev, cipassword: e.target.value }))}
                                    style={{ ...inputStyle, paddingRight: "2.5rem" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    style={{
                                        position: "absolute",
                                        right: "0.6rem",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text-tertiary)",
                                        padding: 0,
                                        display: "flex",
                                    }}
                                    tabIndex={-1}
                                >
                                    {showPw ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SSH Public Key */}
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={labelStyle}>SSH Public Key</label>
                        <textarea
                            placeholder="ssh-rsa AAAA... user@host"
                            value={form.sshkeys}
                            onChange={(e) => setForm(prev => ({ ...prev, sshkeys: e.target.value }))}
                            rows={3}
                            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.78rem", lineHeight: "1.5" }}
                        />
                    </div>

                    {/* IP Configuration */}
                    <div>
                        <label style={labelStyle}>IP Configuration</label>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: form.ip_mode === "static" ? "0.75rem" : 0 }}>
                            {["none", "dhcp", "static"].map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, ip_mode: mode }))}
                                    style={{
                                        padding: "0.35rem 0.85rem",
                                        borderRadius: "6px",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: form.ip_mode === mode ? "var(--accent)" : "var(--bg-surface-2)",
                                        color: form.ip_mode === mode ? "#fff" : "var(--text-secondary)",
                                        cursor: "pointer",
                                        fontSize: "0.8rem",
                                        fontWeight: "500",
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {mode === "none" ? "None" : mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {form.ip_mode === "static" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.75rem" }}>
                                <div>
                                    <label style={labelStyle}>IP Address (CIDR)</label>
                                    <input
                                        type="text"
                                        placeholder="192.168.1.100/24"
                                        value={form.ip_address}
                                        onChange={(e) => setForm(prev => ({ ...prev, ip_address: e.target.value }))}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Gateway</label>
                                    <input
                                        type="text"
                                        placeholder="192.168.1.1"
                                        value={form.ip_gateway}
                                        onChange={(e) => setForm(prev => ({ ...prev, ip_gateway: e.target.value }))}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ErrorBanner = ({ message }) => (
    <div style={{
        marginBottom: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "6px",
        backgroundColor: "var(--red-muted)",
        border: "1px solid var(--red)",
        color: "var(--red)",
        fontSize: "0.875rem",
    }}>
        {message}
    </div>
);

const ModalActions = ({ onCancel, loading, label, disabled = false }) => (
    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
                padding: "0.65rem 1.25rem",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                opacity: loading ? 0.5 : 1,
            }}
        >
            Cancel
        </button>
        <button
            type="submit"
            disabled={loading || disabled}
            style={{
                padding: "0.65rem 1.5rem",
                border: "none",
                borderRadius: "8px",
                backgroundColor: loading || disabled ? "var(--text-tertiary)" : "var(--accent)",
                color: "#fff",
                cursor: loading || disabled ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
            }}
        >
            {loading ? "Working..." : <><FaPlus size={13} /> {label}</>}
        </button>
    </div>
);

const VirtualMachines = () => {
    const [vms, setVms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all", "proxmox", "azure", "aws"
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"

    // Create VM modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [modalMode, setModalMode] = useState("new"); // "new" | "clone"
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState(null);
    const [fetchingModalData, setFetchingModalData] = useState(false);
    const [availableNodes, setAvailableNodes] = useState([]);
    const [availableStorage, setAvailableStorage] = useState([]);
    const [availableTemplates, setAvailableTemplates] = useState([]);
    const [createForm, setCreateForm] = useState({
        node: "", vmid: "", name: "",
        cores: 2, memory: 2048, storage: "", disk_gb: 20, start: false,
        tags: "", description: "",
        ciuser: "", cipassword: "", sshkeys: "",
        ip_mode: "none", ip_address: "", ip_gateway: "",
    });
    const [cloneForm, setCloneForm] = useState({
        templateVmid: "", templateNode: "", newid: "", name: "",
        full: true, storage: "",
        tags: "", description: "",
        ciuser: "", cipassword: "", sshkeys: "",
        ip_mode: "none", ip_address: "", ip_gateway: "",
    });

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

    const openCreateModal = async () => {
        setShowCreateModal(true);
        setModalMode("new");
        setCreateError(null);
        setFetchingModalData(true);
        try {
            const [nodesResp, nextIdResp, storageResp, templates] = await Promise.all([
                fetch(API_ENDPOINTS.NODES).then(r => r.json()),
                getNextVmId(),
                fetch(API_ENDPOINTS.STORAGE).then(r => r.json()),
                fetchTemplates(),
            ]);
            const nodes = nodesResp.nodes || [];
            const storages = (storageResp.storages || []).filter(
                s => s.type === "proxmox" && s.content && s.content.includes("images")
            );
            setAvailableNodes(nodes);
            setAvailableStorage(storages);
            setAvailableTemplates(templates);
            const firstNode = nodes.length > 0 ? nodes[0].node : "";
            const firstStorage = storages.length > 0 ? storages[0].name : "";
            setCreateForm(prev => ({
                ...prev,
                node: firstNode,
                vmid: nextIdResp || "",
                storage: firstStorage,
            }));
            setCloneForm(prev => ({
                ...prev,
                newid: nextIdResp || "",
                templateVmid: templates.length > 0 ? templates[0].vmid : "",
                templateNode: templates.length > 0 ? templates[0].node : "",
                storage: firstStorage,
            }));
        } catch (err) {
            setCreateError("Failed to load form data: " + err.message);
        } finally {
            setFetchingModalData(false);
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateError(null);
        setModalMode("new");
        setCreateForm({
            node: "", vmid: "", name: "",
            cores: 2, memory: 2048, storage: "", disk_gb: 20, start: false,
            tags: "", description: "",
            ciuser: "", cipassword: "", sshkeys: "",
            ip_mode: "none", ip_address: "", ip_gateway: "",
        });
        setCloneForm({
            templateVmid: "", templateNode: "", newid: "", name: "",
            full: true, storage: "",
            tags: "", description: "",
            ciuser: "", cipassword: "", sshkeys: "",
            ip_mode: "none", ip_address: "", ip_gateway: "",
        });
    };

    const buildIpConfig = (form) => {
        if (form.ip_mode === "dhcp") return "ip=dhcp";
        if (form.ip_mode === "static" && form.ip_address) {
            return form.ip_gateway
                ? `ip=${form.ip_address},gw=${form.ip_gateway}`
                : `ip=${form.ip_address}`;
        }
        return undefined;
    };

    const handleCreateVM = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError(null);
        try {
            await createVM({
                node: createForm.node,
                vmid: parseInt(createForm.vmid),
                name: createForm.name || `vm-${createForm.vmid}`,
                cores: parseInt(createForm.cores),
                memory: parseInt(createForm.memory),
                storage: createForm.storage,
                disk_gb: parseInt(createForm.disk_gb),
                start: createForm.start,
                tags: createForm.tags
                    ? createForm.tags.split(",").map(t => t.trim()).filter(Boolean).join(";")
                    : undefined,
                description: createForm.description || undefined,
                ciuser: createForm.ciuser || undefined,
                cipassword: createForm.cipassword || undefined,
                sshkeys: createForm.sshkeys || undefined,
                ipconfig0: buildIpConfig(createForm),
            });
            closeCreateModal();
            await loadVMs(true);
        } catch (err) {
            setCreateError(err.message || "Failed to create VM");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleCloneVM = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError(null);
        try {
            await cloneVM({
                node: cloneForm.templateNode,
                vmid: parseInt(cloneForm.templateVmid),
                newid: parseInt(cloneForm.newid),
                name: cloneForm.name || undefined,
                full: cloneForm.full,
                storage: cloneForm.full && cloneForm.storage ? cloneForm.storage : undefined,
                tags: cloneForm.tags
                    ? cloneForm.tags.split(",").map(t => t.trim()).filter(Boolean).join(";")
                    : undefined,
                description: cloneForm.description || undefined,
                ciuser: cloneForm.ciuser || undefined,
                cipassword: cloneForm.cipassword || undefined,
                sshkeys: cloneForm.sshkeys || undefined,
                ipconfig0: buildIpConfig(cloneForm),
            });
            closeCreateModal();
            await loadVMs(true);
        } catch (err) {
            setCreateError(err.message || "Failed to clone VM");
        } finally {
            setCreateLoading(false);
        }
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

    const getStatusColor = (status) => {
        switch (status) {
            case "running":
                return "#4caf50";
            case "stopped":
                return "#f44336";
            case "paused":
                return "#ff9800";
            default:
                return "#9e9e9e";
        }
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

                        {/* Create VM Button */}
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
                                onClick={openCreateModal}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    border: "1px solid transparent",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--accent)",
                                    color: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    fontSize: "1rem",
                                    fontWeight: "500",
                                    transition: "background-color 0.2s",
                                    lineHeight: "1",
                                    boxSizing: "border-box",
                                    minHeight: "42px",
                                    maxHeight: "42px"
                                }}
                                title="Create new VM"
                            >
                                <FaPlus size={14} />
                                Create VM
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
                    <div className="page-card" style={{ textAlign: "center", padding: "2.5rem" }}>
                        <p style={{ marginBottom: "1rem" }}>No virtual machines found.</p>
                        <button
                            onClick={openCreateModal}
                            style={{
                                padding: "0.65rem 1.25rem",
                                border: "none",
                                borderRadius: "8px",
                                backgroundColor: "var(--accent)",
                                color: "#fff",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.95rem",
                                fontWeight: "500",
                            }}
                        >
                            <FaPlus size={13} />
                            Create VM
                        </button>
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
                            let iconSrc = "/Proxmox.png";
                            if (isAzure) iconSrc = "/Azure.png";
                            else if (isAWS) iconSrc = "/AWS.png";
                            
                            // Determine node label
                            let nodeLabel = "Node";
                            if (isAzure) nodeLabel = "Resource Group";
                            else if (isAWS) nodeLabel = "Availability Zone";
                            
                            return (
                                <div key={`${vmType}-${vm.node}-${vm.vmid}`} className="page-card">
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
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                            <strong>CPU:</strong> {(vm.cpu * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                            <strong>Memory:</strong> {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                            <strong>Disk:</strong> {formatBytes(vm.disk)} / {formatBytes(vm.maxdisk)}
                                        </p>
                                    </div>
                                    {vm.uptime > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                                <strong>Uptime:</strong> {formatUptime(vm.uptime)}
                                            </p>
                                        </div>
                                    )}
                                    {isProxmox && vm.ip_addresses && vm.ip_addresses.length > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                                <strong>IP Address{vm.ip_addresses.length > 1 ? 'es' : ''}:</strong> {vm.ip_addresses.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
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
                                    let iconSrc = "/Proxmox.png";
                                    if (isAzure) iconSrc = "/Azure.png";
                                    else if (isAWS) iconSrc = "/AWS.png";
                                    
                                    // Determine node label
                                    let nodeLabel = "Node";
                                    if (isAzure) nodeLabel = "Resource Group";
                                    else if (isAWS) nodeLabel = "Availability Zone";
                                    
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

            {/* Create / Clone VM Modal */}
            {showCreateModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1rem",
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
                >
                    <div
                        style={{
                            backgroundColor: "var(--bg-surface-1)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-lg)",
                            padding: "2rem",
                            width: "100%",
                            maxWidth: "520px",
                            maxHeight: "90vh",
                            overflowY: "auto",
                            boxShadow: "var(--shadow-lg)",
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>
                                Create Virtual Machine
                            </h2>
                            <button
                                onClick={closeCreateModal}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--text-secondary)",
                                    padding: "0.25rem",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                            >
                                <FaTimes size={18} />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div style={{
                            display: "flex",
                            marginBottom: "1.5rem",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid var(--border-strong)",
                        }}>
                            {["new", "clone"].map(mode => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => { setModalMode(mode); setCreateError(null); }}
                                    style={{
                                        flex: 1,
                                        padding: "0.6rem",
                                        border: "none",
                                        borderRight: mode === "new" ? "1px solid var(--border-strong)" : "none",
                                        backgroundColor: modalMode === mode ? "var(--accent)" : "var(--bg-surface-2)",
                                        color: modalMode === mode ? "#fff" : "var(--text-secondary)",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                        fontWeight: "600",
                                        transition: "background-color 0.15s",
                                    }}
                                >
                                    {mode === "new" ? "New VM" : "Clone from Template"}
                                </button>
                            ))}
                        </div>

                        {fetchingModalData ? (
                            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>
                                Loading configuration...
                            </p>
                        ) : modalMode === "new" ? (
                            /* ── New VM form ── */
                            <form onSubmit={handleCreateVM}>
                                {/* Node */}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={labelStyle}>Node *</label>
                                    <select
                                        value={createForm.node}
                                        onChange={(e) => {
                                            const newNode = e.target.value;
                                            const nodeStorage = availableStorage.filter(s => s.node === newNode);
                                            setCreateForm(prev => ({
                                                ...prev,
                                                node: newNode,
                                                storage: nodeStorage.length > 0 ? nodeStorage[0].name : "",
                                            }));
                                        }}
                                        required
                                        style={inputStyle}
                                    >
                                        {availableNodes.length === 0 && <option value="">No nodes available</option>}
                                        {availableNodes.map(n => (
                                            <option key={n.node} value={n.node}>{n.node}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* VM ID & Name */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1rem" }}>
                                    <div>
                                        <label style={labelStyle}>VM ID *</label>
                                        <input
                                            type="number" min="100" max="999999999"
                                            value={createForm.vmid}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, vmid: e.target.value }))}
                                            required style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Name</label>
                                        <input
                                            type="text"
                                            placeholder={`vm-${createForm.vmid || "100"}`}
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* CPU & Memory */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                                    <div>
                                        <label style={labelStyle}>CPU Cores *</label>
                                        <input
                                            type="number" min="1" max="128"
                                            value={createForm.cores}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, cores: e.target.value }))}
                                            required style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Memory (MB) *</label>
                                        <input
                                            type="number" min="128" step="128"
                                            value={createForm.memory}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, memory: e.target.value }))}
                                            required style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Storage & Disk */}
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                                    <div>
                                        <label style={labelStyle}>Storage *</label>
                                        <select
                                            value={createForm.storage}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, storage: e.target.value }))}
                                            required style={inputStyle}
                                        >
                                            {availableStorage.filter(s => !createForm.node || s.node === createForm.node).length === 0 && (
                                                <option value="">No storage available</option>
                                            )}
                                            {availableStorage
                                                .filter(s => !createForm.node || s.node === createForm.node)
                                                .map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Disk (GB) *</label>
                                        <input
                                            type="number" min="1"
                                            value={createForm.disk_gb}
                                            onChange={(e) => setCreateForm(prev => ({ ...prev, disk_gb: e.target.value }))}
                                            required style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Start after creation */}
                                <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                    <input
                                        type="checkbox" id="start-after-create"
                                        checked={createForm.start}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, start: e.target.checked }))}
                                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                    />
                                    <label htmlFor="start-after-create"
                                        style={{ color: "var(--text-secondary)", fontSize: "0.9rem", cursor: "pointer", userSelect: "none" }}>
                                        Start VM after creation
                                    </label>
                                </div>

                                <SectionDivider title="Tags & Notes" />
                                <TagsNotesFields form={createForm} setForm={setCreateForm} />

                                <SectionDivider title="Cloud-Init" />
                                <CloudInitFields form={createForm} setForm={setCreateForm} />

                                {createError && <ErrorBanner message={createError} />}

                                <ModalActions
                                    onCancel={closeCreateModal}
                                    loading={createLoading}
                                    label="Create VM"
                                />
                            </form>
                        ) : (
                            /* ── Clone from Template form ── */
                            <form onSubmit={handleCloneVM}>
                                {/* Template selector */}
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={labelStyle}>Template *</label>
                                    {availableTemplates.length === 0 ? (
                                        <p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", margin: 0 }}>
                                            No templates found. Mark a VM as a template in Proxmox first.
                                        </p>
                                    ) : (
                                        <select
                                            value={cloneForm.templateVmid}
                                            onChange={(e) => {
                                                const tmpl = availableTemplates.find(t => String(t.vmid) === e.target.value);
                                                setCloneForm(prev => ({
                                                    ...prev,
                                                    templateVmid: e.target.value,
                                                    templateNode: tmpl ? tmpl.node : "",
                                                }));
                                            }}
                                            required
                                            style={inputStyle}
                                        >
                                            {availableTemplates.map(t => (
                                                <option key={t.vmid} value={t.vmid}>
                                                    {t.name} (ID: {t.vmid}, node: {t.node})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* New VM ID & Name */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem", marginBottom: "1rem" }}>
                                    <div>
                                        <label style={labelStyle}>New VM ID *</label>
                                        <input
                                            type="number" min="100" max="999999999"
                                            value={cloneForm.newid}
                                            onChange={(e) => setCloneForm(prev => ({ ...prev, newid: e.target.value }))}
                                            required style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Name</label>
                                        <input
                                            type="text"
                                            placeholder={`clone-${cloneForm.newid || "100"}`}
                                            value={cloneForm.name}
                                            onChange={(e) => setCloneForm(prev => ({ ...prev, name: e.target.value }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                {/* Full clone toggle */}
                                <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                    <input
                                        type="checkbox" id="full-clone"
                                        checked={cloneForm.full}
                                        onChange={(e) => setCloneForm(prev => ({ ...prev, full: e.target.checked }))}
                                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                    />
                                    <label htmlFor="full-clone"
                                        style={{ color: "var(--text-secondary)", fontSize: "0.9rem", cursor: "pointer", userSelect: "none" }}>
                                        Full clone (independent copy)
                                    </label>
                                </div>

                                {/* Storage — only needed for full clones */}
                                {cloneForm.full && (
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label style={labelStyle}>Storage</label>
                                        <select
                                            value={cloneForm.storage}
                                            onChange={(e) => setCloneForm(prev => ({ ...prev, storage: e.target.value }))}
                                            style={inputStyle}
                                        >
                                            <option value="">Same as template</option>
                                            {availableStorage
                                                .filter(s => !cloneForm.templateNode || s.node === cloneForm.templateNode)
                                                .map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)
                                            }
                                        </select>
                                    </div>
                                )}

                                <SectionDivider title="Tags & Notes" />
                                <TagsNotesFields form={cloneForm} setForm={setCloneForm} />

                                <SectionDivider title="Cloud-Init" />
                                <CloudInitFields form={cloneForm} setForm={setCloneForm} />

                                {createError && <ErrorBanner message={createError} />}

                                <ModalActions
                                    onCancel={closeCreateModal}
                                    loading={createLoading}
                                    label="Clone VM"
                                    disabled={availableTemplates.length === 0}
                                />
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualMachines;

