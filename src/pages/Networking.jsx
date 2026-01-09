import React, { useState, useEffect, useMemo } from "react";
import { FaSearch } from "react-icons/fa";
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

    useEffect(() => {
        const loadNetworking = async () => {
            try {
                setLoading(true);
                setError(null);
                const networkingData = await fetchNetworking();
                setNetworking(networkingData);
            } catch (err) {
                setError(err.message || "Failed to load networking resources");
                console.error("Error loading networking:", err);
            } finally {
                setLoading(false);
            }
        };

        loadNetworking();
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
                
                return (
                    name.includes(query) ||
                    id.includes(query) ||
                    location.includes(query)
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
                    {/* Azure VNet specific fields */}
                    {resource.resource_type === 'vnet' && resource.address_space && (
                        <div>
                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                <strong>Address Space:</strong> {resource.address_space.join(', ')}
                            </p>
                        </div>
                    )}
                    
                    {/* Subnet specific fields */}
                    {resource.resource_type === 'subnet' && (
                        <>
                            {resource.address_prefix && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>CIDR:</strong> {resource.address_prefix}
                                    </p>
                                </div>
                            )}
                            {resource.cidr_block && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>CIDR:</strong> {resource.cidr_block}
                                    </p>
                                </div>
                            )}
                            {resource.vnet_name && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>VNet:</strong> {resource.vnet_name}
                                    </p>
                                </div>
                            )}
                            {resource.vpc_id && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>VPC:</strong> {resource.vpc_id}
                                    </p>
                                </div>
                            )}
                            {resource.availability_zone && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>AZ:</strong> {resource.availability_zone}
                                    </p>
                                </div>
                            )}
                            {resource.state && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>State:</strong> {resource.state}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* NSG specific fields */}
                    {resource.resource_type === 'nsg' && resource.location && (
                        <div>
                            <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                <strong>Location:</strong> {resource.location}
                            </p>
                        </div>
                    )}
                    
                    {/* Public IP specific fields */}
                    {resource.resource_type === 'public_ip' && (
                        <>
                            {resource.ip_address && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>IP Address:</strong> {resource.ip_address}
                                    </p>
                                </div>
                            )}
                            {resource.allocation_method && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
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
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>CIDR:</strong> {resource.cidr_block}
                                    </p>
                                </div>
                            )}
                            {resource.state && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
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
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>VPC:</strong> {resource.vpc_id}
                                    </p>
                                </div>
                            )}
                            {resource.description && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
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
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Public IP:</strong> {resource.public_ip}
                                    </p>
                                </div>
                            )}
                            {resource.private_ip && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Private IP:</strong> {resource.private_ip}
                                    </p>
                                </div>
                            )}
                            {resource.instance_id && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
                                        <strong>Instance:</strong> {resource.instance_id}
                                    </p>
                                </div>
                            )}
                            {resource.domain && (
                                <div>
                                    <p style={{ margin: "0.25rem 0", color: "rgba(255, 255, 255, 0.87)" }}>
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
                    </div>
                    
                    {(searchQuery || typeFilter !== "all" || resourceTypeFilter !== "all") && (
                        <div style={{ 
                            color: "rgba(255, 255, 255, 0.7)", 
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

                {!loading && !error && filteredResources.length > 0 && (
                    <>
                        {filteredResources.map((resource) => renderResourceCard(resource))}
                    </>
                )}
            </div>
        </div>
    );
};

export default Networking;
