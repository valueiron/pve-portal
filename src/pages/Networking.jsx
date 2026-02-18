import React, { useState, useEffect, useMemo } from "react";
import { FaSearch, FaSyncAlt, FaTh, FaTable } from "react-icons/fa";
import "./Page.css";
import { fetchNetworking } from "../services/networkingService";

const Networking = () => {
    const [networking, setNetworking] = useState({
        vnets: [],
        subnets: [],
        nsgs: [],
        public_ips: [],
        vpcs: [],
        security_groups: [],
        elastic_ips: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // "all", "azure", "aws"
    const [resourceTypeFilter, setResourceTypeFilter] = useState("all"); // "all", "vnet", "subnet", "nsg", "public_ip", "vpc", "security_group", "elastic_ip"
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"

    const loadNetworking = async (forceRefresh = false) => {
        try {
            if (forceRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const networkingData = await fetchNetworking(forceRefresh);
            setNetworking(networkingData);
        } catch (err) {
            setError(err.message || "Failed to load networking resources");
            console.error("Error loading networking:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadNetworking(false);
    }, []);

    // Flatten all resources into a single array for easier filtering
    const allResources = useMemo(() => {
        const resources = [];
        
        // Azure resources
        networking.vnets.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        // Azure subnets
        networking.subnets.forEach(r => {
            if (r.type === 'azure') {
                resources.push({ ...r, displayName: r.name || r.id });
            }
        });
        networking.nsgs.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        networking.public_ips.forEach(r => resources.push({ ...r, displayName: r.name || r.ip_address || r.id }));
        
        // AWS resources
        networking.vpcs.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        // AWS subnets
        networking.subnets.forEach(r => {
            if (r.type === 'aws') {
                resources.push({ ...r, displayName: r.name || r.id });
            }
        });
        networking.security_groups.forEach(r => resources.push({ ...r, displayName: r.name || r.id }));
        networking.elastic_ips.forEach(r => resources.push({ ...r, displayName: r.public_ip || r.id }));
        
        return resources;
    }, [networking]);

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
                
                // Handle different tag formats for search
                let tags = '';
                if (resource.tags && resource.tags.length > 0) {
                    const tagStrings = resource.tags.map(tag => {
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
                    id.includes(query) ||
                    location.includes(query) ||
                    tags.includes(query)
                );
            });
        }

        return filtered;
    }, [allResources, searchQuery, typeFilter, resourceTypeFilter]);

    const getResourceTypeLabel = (resourceType) => {
        const labels = {
            'vnet': 'Virtual Network',
            'subnet': 'Subnet',
            'nsg': 'Network Security Group',
            'public_ip': 'Public IP',
            'vpc': 'VPC',
            'security_group': 'Security Group',
            'elastic_ip': 'Elastic IP'
        };
        return labels[resourceType] || resourceType;
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
                            <h2 style={{ margin: 0, color: "var(--text-primary)" }}>
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
                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                            <strong>Type:</strong> {getResourceTypeLabel(resource.resource_type)}
                        </p>
                        <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                            <strong>ID:</strong> {resource.id}
                        </p>
                        {resource.location && (
                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                <strong>Location:</strong> {resource.location}
                            </p>
                        )}
                        {resource.region && (
                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                <strong>Region:</strong> {resource.region}
                            </p>
                        )}
                        {resource.resource_group && (
                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                <strong>Resource Group:</strong> {resource.resource_group}
                            </p>
                        )}
                        {resource.tags && resource.tags.length > 0 && (
                            <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                                <strong style={{ color: "var(--text-primary)", marginRight: "0.25rem" }}>Tags:</strong>
                                {resource.tags.map((tag, index) => {
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
                </div>

                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                    gap: "1rem",
                    marginTop: "1rem"
                }}>
                    {/* Azure VNet specific fields */}
                    {resource.resource_type === 'vnet' && resource.address_space && (
                        <div>
                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                <strong>Address Space:</strong> {resource.address_space.join(', ')}
                            </p>
                        </div>
                    )}
                    
                    {/* Subnet specific fields */}
                    {resource.resource_type === 'subnet' && (
                        <>
                            {resource.address_prefix && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>CIDR:</strong> {resource.address_prefix}
                                    </p>
                                </div>
                            )}
                            {resource.cidr_block && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>CIDR:</strong> {resource.cidr_block}
                                    </p>
                                </div>
                            )}
                            {resource.vnet_name && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>VNet:</strong> {resource.vnet_name}
                                    </p>
                                </div>
                            )}
                            {resource.vpc_id && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>VPC:</strong> {resource.vpc_id}
                                    </p>
                                </div>
                            )}
                            {resource.availability_zone && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>AZ:</strong> {resource.availability_zone}
                                    </p>
                                </div>
                            )}
                            {resource.state && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>State:</strong> {resource.state}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* NSG specific fields */}
                    {resource.resource_type === 'nsg' && resource.location && (
                        <div>
                            <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                <strong>Location:</strong> {resource.location}
                            </p>
                        </div>
                    )}
                    
                    {/* Public IP specific fields */}
                    {resource.resource_type === 'public_ip' && (
                        <>
                            {resource.ip_address && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>IP Address:</strong> {resource.ip_address}
                                    </p>
                                </div>
                            )}
                            {resource.allocation_method && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Allocation:</strong> {resource.allocation_method}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* VPC specific fields */}
                    {resource.resource_type === 'vpc' && (
                        <>
                            {resource.cidr_block && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>CIDR:</strong> {resource.cidr_block}
                                    </p>
                                </div>
                            )}
                            {resource.state && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>State:</strong> {resource.state}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Security Group specific fields */}
                    {resource.resource_type === 'security_group' && (
                        <>
                            {resource.vpc_id && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>VPC:</strong> {resource.vpc_id}
                                    </p>
                                </div>
                            )}
                            {resource.description && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Description:</strong> {resource.description}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Elastic IP specific fields */}
                    {resource.resource_type === 'elastic_ip' && (
                        <>
                            {resource.public_ip && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Public IP:</strong> {resource.public_ip}
                                    </p>
                                </div>
                            )}
                            {resource.private_ip && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Private IP:</strong> {resource.private_ip}
                                    </p>
                                </div>
                            )}
                            {resource.instance_id && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Instance:</strong> {resource.instance_id}
                                    </p>
                                </div>
                            )}
                            {resource.domain && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "var(--text-primary)" }}>
                                        <strong>Domain:</strong> {resource.domain}
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
            <h1 className="page-title">Networking</h1>
            <p className="page-description">
                View and manage your networking resources from Azure and AWS.
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
                                color: "var(--text-primary)", 
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
                                color: "var(--text-primary)", 
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
                                <option value="vnet">Virtual Networks (Azure)</option>
                                <option value="vpc">VPCs (AWS)</option>
                                <option value="subnet">Subnets</option>
                                <option value="nsg">Network Security Groups (Azure)</option>
                                <option value="security_group">Security Groups (AWS)</option>
                                <option value="public_ip">Public IPs (Azure)</option>
                                <option value="elastic_ip">Elastic IPs (AWS)</option>
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
                                onClick={() => loadNetworking(true)}
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
                            color: "var(--text-secondary)", 
                            fontSize: "0.9rem",
                            marginTop: "0.5rem"
                        }}>
                            Showing {filteredResources.length} of {allResources.length} networking resource{filteredResources.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}

            <div className="page-content">
                {loading && (
                    <div className="page-card">
                        <p>Loading networking resources...</p>
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
                        <p>No networking resources found.</p>
                    </div>
                )}

                {!loading && !error && allResources.length > 0 && filteredResources.length === 0 && (searchQuery || typeFilter !== "all" || resourceTypeFilter !== "all") && (
                    <div className="page-card">
                        <p>No networking resources match your filters.</p>
                    </div>
                )}

                {!loading && !error && filteredResources.length > 0 && viewMode === "card" && (
                    <>
                        {filteredResources.map((resource) => renderResourceCard(resource))}
                    </>
                )}

                {!loading && !error && filteredResources.length > 0 && viewMode === "table" && (
                    <div className="page-table-container">
                        <table className="page-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>ID</th>
                                    <th>Location/Region</th>
                                    <th>Details</th>
                                    <th>Tags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResources.map((resource) => {
                                    const isAzure = resource.type === 'azure';
                                    const isAWS = resource.type === 'aws';
                                    
                                    // Determine icon source
                                    let iconSrc = "/Azure.png";
                                    if (isAWS) iconSrc = "/AWS.png";

                                    // Build details column based on resource type
                                    let details = [];
                                    if (resource.resource_type === 'vnet' && resource.address_space) {
                                        details.push(`Address Space: ${resource.address_space.join(', ')}`);
                                    } else if (resource.resource_type === 'subnet') {
                                        if (resource.address_prefix) details.push(`CIDR: ${resource.address_prefix}`);
                                        if (resource.cidr_block) details.push(`CIDR: ${resource.cidr_block}`);
                                        if (resource.vnet_name) details.push(`VNet: ${resource.vnet_name}`);
                                        if (resource.vpc_id) details.push(`VPC: ${resource.vpc_id}`);
                                        if (resource.availability_zone) details.push(`AZ: ${resource.availability_zone}`);
                                        if (resource.state) details.push(`State: ${resource.state}`);
                                    } else if (resource.resource_type === 'nsg' && resource.location) {
                                        details.push(`Location: ${resource.location}`);
                                    } else if (resource.resource_type === 'public_ip') {
                                        if (resource.ip_address) details.push(`IP: ${resource.ip_address}`);
                                        if (resource.allocation_method) details.push(`Allocation: ${resource.allocation_method}`);
                                    } else if (resource.resource_type === 'vpc') {
                                        if (resource.cidr_block) details.push(`CIDR: ${resource.cidr_block}`);
                                        if (resource.state) details.push(`State: ${resource.state}`);
                                    } else if (resource.resource_type === 'security_group') {
                                        if (resource.vpc_id) details.push(`VPC: ${resource.vpc_id}`);
                                        if (resource.description) details.push(`Description: ${resource.description}`);
                                    } else if (resource.resource_type === 'elastic_ip') {
                                        if (resource.public_ip) details.push(`Public IP: ${resource.public_ip}`);
                                        if (resource.private_ip) details.push(`Private IP: ${resource.private_ip}`);
                                        if (resource.instance_id) details.push(`Instance: ${resource.instance_id}`);
                                        if (resource.domain) details.push(`Domain: ${resource.domain}`);
                                    }
                                    const detailsText = details.length > 0 ? details.join(' | ') : '—';

                                    const location = resource.location || resource.region || resource.resource_group || '—';
                                    
                                    return (
                                        <tr key={`${resource.type}-${resource.resource_type}-${resource.id}`}>
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <span>{resource.displayName || resource.id}</span>
                                                    <img 
                                                        src={iconSrc}
                                                        alt={resource.type}
                                                        style={{
                                                            height: "20px",
                                                            width: "auto",
                                                            objectFit: "contain"
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td>{getResourceTypeLabel(resource.resource_type)}</td>
                                            <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={resource.id}>{resource.id}</td>
                                            <td>{location}</td>
                                            <td style={{ fontSize: "0.85rem", maxWidth: "300px" }}>{detailsText}</td>
                                            <td>{renderTags(resource.tags)}</td>
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

export default Networking;
