import React from "react";
import { Link } from "react-router-dom";
import {
  FaServer,
  FaHdd,
  FaNetworkWired,
  FaFlask
} from "react-icons/fa";
import { SiKubernetes, SiDocker } from "react-icons/si";
import "./Page.css";
import "./Home.css";

const sections = [
    {
        title: "Virtual Machines",
        description: "Manage and monitor your virtual machines across Proxmox, Azure, and AWS",
        icon: FaServer,
        path: "/virtual-machines",
        accent: "var(--accent)",
    },
    {
        title: "Storage",
        description: "Configure and manage storage resources and volumes",
        icon: FaHdd,
        path: "/storage",
        accent: "var(--green)",
    },
    {
        title: "Networking",
        description: "Network configuration, VNets, subnets, and security groups",
        icon: FaNetworkWired,
        path: "/networking",
        accent: "var(--amber)",
    },
    {
        title: "Kubernetes",
        description: "Manage Kubernetes clusters and workloads",
        icon: SiKubernetes,
        path: "/kubernetes",
        accent: "var(--red)",
    },
    {
        title: "Docker",
        description: "Manage Docker containers and images",
        icon: SiDocker,
        path: "/docker",
        accent: "var(--text-tertiary)",
    },
    {
        title: "Labs",
        description: "Experimental features and sandbox environments",
        icon: FaFlask,
        path: "/labs",
        accent: "var(--orange)",
    },
];

const Home = () => {
    return (
        <div className="page-container">
            <div className="home-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-description">
                    Manage your infrastructure across Proxmox, Azure, and AWS from a single portal.
                </p>
            </div>
            <div className="home-grid">
                {sections.map((section, index) => {
                    const Icon = section.icon;
                    return (
                        <Link
                            key={index}
                            to={section.path}
                            className="home-card"
                            style={{ '--card-accent': section.accent }}
                        >
                            <div className="home-card-icon">
                                <Icon />
                            </div>
                            <div className="home-card-body">
                                <h2>{section.title}</h2>
                                <p>{section.description}</p>
                            </div>
                            <div className="home-card-arrow">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default Home;
