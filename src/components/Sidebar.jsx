import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaMoneyBillWave, FaCalculator, FaSignInAlt, FaSignOutAlt, FaUserCog } from 'react-icons/fa';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        window.location.reload();
    };

    React.useEffect(() => {
        if (isOpen && window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    const handleTabClick = () => {
        if (window.innerWidth <= 768) {
            onClose();
        }
    };

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="/logo.jpg" alt="Logo" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                    <h2 style={{ fontSize: '1.25rem', margin: 0, textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '1px' }}>CHALLENGERZ</h2>
                </div>

                <nav style={{ flex: 1 }}>
                    <NavLink to="/" onClick={handleTabClick} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
                        <FaHome /> Home
                    </NavLink>
                    <NavLink to="/collection" onClick={handleTabClick} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
                        <FaMoneyBillWave /> Collection
                    </NavLink>
                    <NavLink to="/deduction" onClick={handleTabClick} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
                        <FaCalculator /> Deduction Plan
                    </NavLink>
                    {token && role === 'superadmin' && (
                        <NavLink to="/superadmin" onClick={handleTabClick} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
                            <FaUserCog /> Super Admin
                        </NavLink>
                    )}
                </nav>

                <div>
                    {token ? (
                        <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'flex-start' }}>
                            <FaSignOutAlt /> Logout
                        </button>
                    ) : (
                        <button onClick={() => { navigate('/login'); handleTabClick(); }} className="btn btn-primary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                            <FaSignInAlt /> Login
                        </button>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
