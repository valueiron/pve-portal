import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import "./Header.css";

const Header = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

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
                            // Hide image if it doesn't exist, showing placeholder instead
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <div className="header-logo-placeholder" style={{ display: 'none' }}>
                        Logo
                    </div>
                </Link>

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
                            <button 
                                className="header-dropdown-item"
                                onClick={() => {
                                    // Logout functionality will be implemented later
                                    setIsDropdownOpen(false);
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;

