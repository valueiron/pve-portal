import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle, FaSun, FaMoon } from "react-icons/fa";
import { API_ENDPOINTS } from "./config/api";
import "./Header.css";

const Header = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [username, setUsername] = useState(null);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('pve-theme') || 'dark';
    });
    const dropdownRef = useRef(null);

    // Build Keycloak end-session URL from injected runtime config.
    // /oauth2/sign_out clears the proxy cookie; rd= terminates the Keycloak SSO session.
    const oidcIssuerUrl = window.__OIDC_ISSUER_URL__;
    const logoutUrl = oidcIssuerUrl
        ? `/oauth2/sign_out?rd=${encodeURIComponent(`${oidcIssuerUrl}/protocol/openid-connect/logout`)}`
        : '/oauth2/sign_out';

    useEffect(() => {
        fetch(API_ENDPOINTS.AUTH_ME, { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) setUsername(data.username || data.email || null);
            })
            .catch(() => {});
    }, []);

    // Apply theme attribute to <html> and persist to localStorage
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pve-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    return (
        <header className="header">
            <div className="header-content">
                {/* Logo area */}
                <Link to="/" className="header-logo">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="header-logo-img"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <div className="header-logo-placeholder" style={{ display: 'none' }}>
                        Logo
                    </div>
                </Link>

                {/* Right-side controls */}
                <div className="header-controls">
                    {/* Theme toggle */}
                    <button
                        className="header-theme-toggle"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                        <span className="theme-toggle-track">
                            <span className="theme-toggle-thumb">
                                {theme === 'dark'
                                    ? <FaMoon className="theme-toggle-icon" />
                                    : <FaSun className="theme-toggle-icon" />
                                }
                            </span>
                        </span>
                    </button>

                    {/* Account dropdown */}
                    <div className="header-account" ref={dropdownRef}>
                        <button
                            className="header-account-button"
                            onClick={toggleDropdown}
                            aria-label="Account menu"
                            aria-expanded={isDropdownOpen}
                        >
                            <FaUserCircle className="header-account-icon" />
                        </button>

                        {isDropdownOpen && (
                            <div className="header-dropdown">
                                {username && (
                                    <div className="header-dropdown-username">
                                        {username}
                                    </div>
                                )}
                                <button
                                    className="header-dropdown-item header-dropdown-logout"
                                    onClick={() => {
                                        window.location.href = logoutUrl;
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
