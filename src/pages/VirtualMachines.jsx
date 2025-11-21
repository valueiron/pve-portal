import React, { useState, useEffect, useMemo } from "react";
import { FaPowerOff, FaPlay, FaSearch } from "react-icons/fa";
import "./Page.css";
import { fetchVMs, startVM, shutdownVM } from "../services/vmService";

const VirtualMachines = () => {
    const [vms, setVms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadVMs = async () => {
            try {
                setLoading(true);
                setError(null);
                const vmData = await fetchVMs();
                setVms(vmData);
            } catch (err) {
                setError(err.message || "Failed to load virtual machines");
                console.error("Error loading VMs:", err);
            } finally {
                setLoading(false);
            }
        };

        loadVMs();
    }, []);

    const handleStartVM = async (vmid) => {
        try {
            setActionLoading(prev => ({ ...prev, [vmid]: true }));
            await startVM(vmid);
            // Reload VMs to get updated status
            const vmData = await fetchVMs();
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
            // Reload VMs to get updated status
            const vmData = await fetchVMs();
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

    // Filter VMs based on search query
    const filteredVMs = useMemo(() => {
        if (!searchQuery.trim()) {
            return vms;
        }

        const query = searchQuery.toLowerCase().trim();
        return vms.filter((vm) => {
            const name = (vm.name || `VM ${vm.vmid}`).toLowerCase();
            const vmid = vm.vmid.toString().toLowerCase();
            const node = (vm.node || "").toLowerCase();
            const status = (vm.status || "").toLowerCase();

            return (
                name.includes(query) ||
                vmid.includes(query) ||
                node.includes(query) ||
                status.includes(query)
            );
        });
    }, [vms, searchQuery]);

    return (
        <div className="page-container">
            <h1 className="page-title">Virtual Machines</h1>
            <p className="page-description">
                Manage and monitor your virtual machines here.
            </p>
            
            {/* Search Bar */}
            {!loading && !error && vms.length > 0 && (
                <div style={{ 
                    marginBottom: "1.5rem",
                    maxWidth: "500px"
                }}>
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
                    {searchQuery && (
                        <p style={{ 
                            marginTop: "0.5rem", 
                            color: "#666", 
                            fontSize: "0.9rem" 
                        }}>
                            Showing {filteredVMs.length} of {vms.length} virtual machine{filteredVMs.length !== 1 ? 's' : ''}
                        </p>
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

                {!loading && !error && filteredVMs.length > 0 && (
                    <>
                        {filteredVMs.map((vm) => (
                            <div key={`${vm.node}-${vm.vmid}`} className="page-card">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                    <div>
                                        <h2 style={{ marginBottom: "0.5rem" }}>
                                            {vm.name || `VM ${vm.vmid}`}
                                        </h2>
                                        <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                            <strong>VM ID:</strong> {vm.vmid}
                                        </p>
                                        <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                            <strong>Node:</strong> {vm.node}
                                        </p>
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
                                        <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                            <strong>CPU:</strong> {(vm.cpu * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                            <strong>Memory:</strong> {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                            <strong>Disk:</strong> {formatBytes(vm.disk)} / {formatBytes(vm.maxdisk)}
                                        </p>
                                    </div>
                                    {vm.uptime > 0 && (
                                        <div>
                                            <p style={{ margin: "0.25rem 0", color: "#333" }}>
                                                <strong>Uptime:</strong> {formatUptime(vm.uptime)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default VirtualMachines;

