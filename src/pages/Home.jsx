import React from "react";
import "./Page.css";

const Home = () => {
    return (
        <div className="page-container">
            <h1 className="page-title">Welcome to PVE Portal</h1>
            <p className="page-description">
                Manage your Proxmox Virtual Environment from this portal.
                Use the navigation menu to access different management sections.
            </p>
            <div className="page-content">
                <div className="page-card">
                    <h2>Virtual Machines</h2>
                    <p>Manage and monitor your virtual machines</p>
                </div>
                <div className="page-card">
                    <h2>Storage</h2>
                    <p>Configure and manage storage resources</p>
                </div>
                <div className="page-card">
                    <h2>Networking</h2>
                    <p>Network configuration and management</p>
                </div>
                <div className="page-card">
                    <h2>Firewall</h2>
                    <p>Configure firewall rules and security</p>
                </div>
                <div className="page-card">
                    <h2>Services</h2>
                    <p>Manage system services and configurations</p>
                </div>
            </div>
        </div>
    );
};

export default Home;

