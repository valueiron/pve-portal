import React, { useState, useEffect, useMemo } from "react";
import { FaSearch, FaSyncAlt } from "react-icons/fa";
import "./Page.css";
import { fetchStorage } from "../services/storageService";

const Storage = () => {
    const [storage, setStorage] = useState({
        storage_accounts: [],
        containers: [],
        buckets: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all", "azure", "aws"
    const [resourceTypeFilter, setResourceTypeFilter] = useState("all"); // "all", "storage_account", "blob_container", "s3_bucket"
    const [refreshing, setRefreshing] = useState(false);

    const loadStorage = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const storageData = await fetchStorage(forceRefresh);
            setStorage(storageData);
        } catch (err) {
            setError(err.message || "Failed to load storage resources");
            console.error("Error loading storage:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadStorage(false);
    }, []);

    // Flatten all resources into a single array for easier filtering
    const allResources = useMemo(() => {
        const resources = [];
        
        // Azure resources
        storage.storage_accounts.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        storage.containers.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        
        // AWS resources
        storage.buckets.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        
        return resources;
    }, [storage]);

    // Filter resources based on search query, type filter, and resource type filter
    const filteredResources = useMemo(() => {
        let filtered = allResources;

        // Filter by type (Azure/AWS)
        if (typeFilter !== "all") {
            filtered = filtered.filter((resource) => resource.type === typeFilter);
        }

        // Filter by resource type
        if (resourceTypeFilter !== "all") {
            filtered = filtered.filter((resource) => resource.resource_type === resourceTypeFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter((resource) => {
                const name = (resource.displayName || resource.id || "").toLowerCase();
                const id = (resource.id || "").toLowerCase();
                const location = (resource.location || resource.region || resource.resource_group || "").toLowerCase();
                
                return (
                    name.includes(query) ||
                    id.includes(query) ||
                    location.includes(query)
                );
            });
        }

        return filtered;
    }, [allResources, searchQuery, typeFilter, resourceTypeFilter]);

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const getResourceTypeLabel = (resourceType) => {
        const labels = {
            'storage_account': 'Storage Account',
            'blob_container': 'Blob Container',
            's3_bucket': 'S3 Bucket'
        };
        return labels[resourceType] || resourceType;
    };

    const renderResourceCard = (resource) => {
        const isAzure = resource.type === 'azure';
        const isAWS = resource.type === 'aws';
        
        // Determine icon source
        let iconSrc = "/Azure.png";
        if (isAWS) iconSrc = "/AWS.png";

        return (
            <div key={`${resource.type}-${resource.resource_type}-${resource.id}`} className="page-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                            <h2 style={{ margin: 0, color: "rgba(255, 255, 255, 0.87)" }}>
                                {resource.displayName || resource.id}
                            </h2>
                            <img 
                                src={iconSrc}
                                alt={resource.type}
                                style={{
                                    height: "24px",
                                    width: "auto",
                                    objectFit: "contain"
                                }}
                            />
                        </div>
                        <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                            <strong>Type:</strong> {getResourceTypeLabel(resource.resource_type)}
                        </p>
                        <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                            <strong>ID:</strong> {resource.id}
                        </p>
                        {resource.location && (
                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                <strong>Location:</strong> {resource.location}
                            </p>
                        )}
                        {resource.region && (
                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                <strong>Region:</strong> {resource.region}
                            </p>
                        )}
                        {resource.resource_group && (
                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                <strong>Resource Group:</strong> {resource.resource_group}
                            </p>
                        )}
                    </div>
                </div>

                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "1rem",
                    marginTop: "1rem"
                }}>
                    {/* Storage Account specific fields */}
                    {resource.resource_type === 'storage_account' && (
                        <>
                            {resource.kind && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Kind:</strong> {resource.kind}
                                    </p>
                                </div>
                            )}
                            {resource.sku && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>SKU:</strong> {resource.sku}
                                    </p>
                                </div>
                            )}
                            {resource.primary_blob_endpoint && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Blob Endpoint:</strong> {resource.primary_blob_endpoint}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Blob Container specific fields */}
                    {resource.resource_type === 'blob_container' && (
                        <>
                            {resource.storage_account && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Storage Account:</strong> {resource.storage_account}
                                    </p>
                                </div>
                            )}
                            {resource.public_access && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Public Access:</strong> {resource.public_access}
                                    </p>
                                </div>
                            )}
                            {resource.last_modified && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Last Modified:</strong> {new Date(resource.last_modified).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* S3 Bucket specific fields */}
                    {resource.resource_type === 's3_bucket' && (
                        <>
                            {resource.creation_date && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Created:</strong> {new Date(resource.creation_date).toLocaleString()}
                                    </p>
                                </div>
                            )}
                            {resource.size_bytes !== undefined && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Size:</strong> {formatBytes(resource.size_bytes)}
                                    </p>
                                </div>
                            )}
                            {resource.object_count !== undefined && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Objects:</strong> {resource.object_count.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <h1 className="page-title">Storage</h1>
            <p className="page-description">
                View and manage your storage resources from Azure and AWS.
            </p>
            
            {/* Filters and Search Bar */}
            {!loading && !error && allResources.length > 0 && (
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
                                Filter by Provider:
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
                                <option value="all">All Providers</option>
                                <option value="azure">Azure</option>
                                <option value="aws">AWS</option>
                            </select>
                        </div>

                        {/* Resource Type Filter */}
                        <div style={{ minWidth: "200px" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "0.5rem", 
                                color: "rgba(255, 255, 255, 0.87)", 
                                fontSize: "0.9rem",
                                fontWeight: "500"
                            }}>
                                Filter by Resource Type:
                            </label>
                            <select
                                value={resourceTypeFilter}
                                onChange={(e) => setResourceTypeFilter(e.target.value)}
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
                                <option value="all">All Resources</option>
                                <option value="storage_account">Storage Accounts (Azure)</option>
                                <option value="blob_container">Blob Containers (Azure)</option>
                                <option value="s3_bucket">S3 Buckets (AWS)</option>
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
                                    placeholder="Search by name, ID, location..."
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
                                onClick={() => loadStorage(true)}
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
                    
                    {(searchQuery || typeFilter !== "all" || resourceTypeFilter !== "all") && (
                        <div style={{ 
                            color: "rgba(255, 255, 255, 0.7)", 
                            fontSize: "0.9rem",
                            marginTop: "0.5rem"
                        }}>
                            Showing {filteredResources.length} of {allResources.length} storage resource{filteredResources.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}

            <div className="page-content">
                {loading && (
                    <div className="page-card">
                        <p>Loading storage resources...</p>
                    </div>
                )}
                
                {error && (
                    <div className="page-card" style={{ backgroundColor: "#f44336", color: "#fff" }}>
                        <h2>Error</h2>
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && allResources.length === 0 && (
                    <div className="page-card">
                        <p>No storage resources found.</p>
                    </div>
                )}

                {!loading && !error && allResources.length > 0 && filteredResources.length === 0 && (searchQuery || typeFilter !== "all" || resourceTypeFilter !== "all") && (
                    <div className="page-card">
                        <p>No storage resources match your filters.</p>
                    </div>
                )}

                {!loading && !error && filteredResources.length > 0 && (
                    <>
                        {filteredResources.map((resource) => renderResourceCard(resource))}
                    </>
                )}
            </div>
        </div>
    );
};

export default Storage;
