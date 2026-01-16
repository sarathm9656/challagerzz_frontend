import React from 'react';
import { FaBars } from 'react-icons/fa';

const MobileHeader = ({ onOpenSidebar }) => {
    return (
        <header className="mobile-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/chanllangers.png" alt="Logo" style={{ width: 35, height: 35, borderRadius: '50%' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>CHALLENGERZ</span>
            </div>
            <button
                onClick={onOpenSidebar}
                style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <FaBars />
            </button>
        </header>
    );
};

export default MobileHeader;
