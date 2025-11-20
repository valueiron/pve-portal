import React, { useState, useEffect } from "react";
import { 
  FaServer, 
  FaHdd, 
  FaNetworkWired, 
  FaShieldAlt, 
  FaCog,
  FaBars,
  FaTimes
} from "react-icons/fa";
import "./Nav.css";

let Nav = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleMobile = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    // Handle body scroll lock on mobile
    useEffect(() => {
        if (isMobileOpen) {
            document.body.classList.add('nav-mobile-open');
        } else {
            document.body.classList.remove('nav-mobile-open');
        }
        
        return () => {
            document.body.classList.remove('nav-mobile-open');
        };
    }, [isMobileOpen]);

    const navItems = [
        { name: "Virtual Machines", icon: FaServer },
        { name: "Storage", icon: FaHdd },
        { name: "Networking", icon: FaNetworkWired },
        { name: "Firewall", icon: FaShieldAlt },
        { name: "Services", icon: FaCog },
    ];

    return (
        <>
            {/* Mobile hamburger button */}
            <button 
                className="nav-mobile-toggle" 
                onClick={toggleMobile}
                aria-label="Toggle navigation"
            >
                {isMobileOpen ? <FaTimes /> : <FaBars />}
            </button>

            {/* Mobile overlay backdrop */}
            {isMobileOpen && (
                <div 
                    className="nav-mobile-backdrop" 
                    onClick={toggleMobile}
                />
            )}

            {/* Navigation sidebar */}
            <nav className={`nav-sidebar ${isCollapsed ? 'nav-collapsed' : ''} ${isMobileOpen ? 'nav-mobile-open' : ''}`}>
                {/* Desktop collapse toggle */}
                <button 
                    className="nav-toggle" 
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                >
                    {isCollapsed ? <FaBars /> : <FaTimes />}
                </button>

                <ul className="nav-list">
                    {navItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <li key={index} className="nav-item">
                                <a href="#" className="nav-link" onClick={(e) => {
                                    e.preventDefault();
                                    setIsMobileOpen(false);
                                }}>
                                    <Icon className="nav-icon" />
                                    {!isCollapsed && <span className="nav-text">{item.name}</span>}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}

export default Nav;
