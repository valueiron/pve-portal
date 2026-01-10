import React, { useState, useEffect, useMemo } from "react";
import { FaPowerOff, FaPlay, FaSearch, FaSyncAlt, FaTh, FaTable } from "react-icons/fa";
import "./Page.css";
import { fetchVMs, startVM, shutdownVM } from "../services/vmService";

const VirtualMachines = () => {
    const [vms, setVms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all", "proxmox", "azure", "aws"
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"

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
        if (!tags || tags.length === 0) return <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>—</span>;
        
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
                                color: "rgba(255, 255, 255, 0.87)", 
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
                                color: "rgba(255, 255, 255, 0.87)", 
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
                                color: "rgba(255, 255, 255, 0.87)", 
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
                                color: "rgba(255, 255, 255, 0.87)", 
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
                            color: "rgba(255, 255, 255, 0.7)", 
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
                                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                                <strong>VM ID:</strong> {vm.vmid}
                                            </p>
                                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                                <strong>{nodeLabel}:</strong> {vm.node}
                                            </p>
                                            {vm.tags && vm.tags.length > 0 && (
                                                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                                                    <strong style={{ color: "rgba(255, 255, 255, 0.87)", marginRight: "0.25rem" }}>Tags:</strong>
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
                                        <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                            <strong>CPU:</strong> {(vm.cpu * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                            <strong>Memory:</strong> {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                            <strong>Disk:</strong> {formatBytes(vm.disk)} / {formatBytes(vm.maxdisk)}
                                        </p>
                                    </div>
                                    {vm.uptime > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                                <strong>Uptime:</strong> {formatUptime(vm.uptime)}
                                            </p>
                                        </div>
                                    )}
                                    {isProxmox && vm.ip_addresses && vm.ip_addresses.length > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
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
        </div>
    );
};

export default VirtualMachines;

