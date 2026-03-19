import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaServer,
  FaHdd,
  FaNetworkWired,
  FaFlask,
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaSitemap,
  FaRobot
} from "react-icons/fa";
import { SiKubernetes, SiDocker } from "react-icons/si";
import "./Nav.css";

const NAV_ITEMS = [
    { name: "Virtual Machines", icon: FaServer, path: "/virtual-machines" },
    { name: "Storage", icon: FaHdd, path: "/storage" },
    { name: "Networking", icon: FaNetworkWired, path: "/networking" },
    { name: "Kubernetes", icon: SiKubernetes, path: "/kubernetes" },
    { name: "Docker", icon: SiDocker, path: "/docker" },
    { name: "Labs", icon: FaFlask, path: "/labs" },
    { name: "VyOS", icon: FaSitemap, path: "/vyos" },
    { name: "AI", icon: FaRobot, path: "/ai" },
];

const Nav = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const location = useLocation();

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

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

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
                    {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
                </button>

                <ul className="nav-list">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <li key={item.path} className="nav-item">
                                <Link
                                    to={item.path}
                                    className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                                    data-tooltip={item.name}
                                >
                                    <Icon className="nav-icon" />
                                    {!isCollapsed && <span className="nav-text">{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </>
    );
}

export default Nav;
