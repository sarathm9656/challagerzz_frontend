import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import Login from './pages/Login';
import Home from './pages/Home';
import Collection from './pages/Collection';
import DeductionPlanning from './pages/DeductionPlanning';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

import { Toaster } from 'react-hot-toast';


// Simple layout wrapper
const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="app-container">
            <Toaster position="top-right" reverseOrder={false} />
            <MobileHeader onOpenSidebar={() => setIsSidebarOpen(true)} />
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Role not authorized
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('token'));
    const location = useLocation();

    return (
        <Routes>
            <Route path="/login" element={<Login setIsAdmin={setIsAdmin} />} />

            <Route path="/" element={
                <Layout>
                    <Home />
                </Layout>
            } />

            <Route path="/collection" element={
                <Layout>
                    <Collection isAdmin={isAdmin} />
                </Layout>
            } />

            <Route path="/deduction" element={
                <Layout>
                    <DeductionPlanning isAdmin={isAdmin} />
                </Layout>
            } />

            <Route path="/superadmin" element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                    <Layout>
                        <SuperAdminDashboard />
                    </Layout>
                </ProtectedRoute>
            } />

        </Routes>
    );
}

export default App;
