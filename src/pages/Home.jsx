import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaChartPie, FaCalculator, FaWallet, FaExclamationCircle } from 'react-icons/fa';

const Home = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [activeEventName, setActiveEventName] = useState('');

    // Data
    const [stats, setStats] = useState({
        totalCollectionsCount: 0,
        totalPaid: 0,
        totalDue: 0,
        totalDeductionsCount: 0,
        totalDeductions: 0,
        balance: 0
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Init event from local storage or fetch
        const storedEventId = localStorage.getItem('eventId');
        if (storedEventId && storedEventId !== 'undefined' && storedEventId !== 'null') {
            setSelectedEventId(storedEventId);
        }
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            const ev = events.find(e => e._id === selectedEventId);
            if (ev) setActiveEventName(ev.name);
            fetchDashboardData(selectedEventId);
        } else {
            setStats({
                totalCollectionsCount: 0, totalPaid: 0, totalDue: 0,
                totalDeductionsCount: 0, totalDeductions: 0, balance: 0
            });
            setActiveEventName('');
        }
    }, [selectedEventId, events]);

    const fetchEvents = async () => {
        try {
            const res = await axios.get('/api/auth/events');
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching events", err);
        }
    };

    const fetchDashboardData = async (evtId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: token ? { Authorization: token } : {} };

            // Parallel fetch
            const [pplRes, dedRes] = await Promise.all([
                axios.get(`/api/people?eventId=${evtId}`, config),
                axios.get(`/api/deductions?eventId=${evtId}`, config)
            ]);

            const people = pplRes.data;
            const deductions = dedRes.data;

            // Calc Collections
            let paid = 0;
            let due = 0;
            let pending = 0;

            people.forEach(p => {
                const amt = Number(p.amount) || 0;
                if (p.credit || p.status === 'Credit' || p.status === 'Unpaid') {
                    due += amt;
                } else if (p.status === 'Pending') {
                    pending += amt;
                } else if (p.status === 'Paid') {
                    paid += amt;
                }
            });

            // Calc Deductions
            const totalDed = deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

            setStats({
                totalCollectionsCount: people.length,
                totalPaid: paid,
                totalDue: due,
                totalPending: pending,
                totalDeductionsCount: deductions.length,
                totalDeductions: totalDed,
                balance: paid - totalDed
            });

        } catch (err) {
            console.error("Error fetching dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Header & Event Selector */}
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Welcome to CHALLENGERZ</h1>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
                            {activeEventName ? `Dashboard for ${activeEventName}` : 'Select an event to view summary'}
                        </p>
                    </div>
                    <div>
                        <select
                            className="input-field"
                            style={{ minWidth: '200px', fontWeight: 'bold' }}
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            <option value="">Select Event</option>
                            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {selectedEventId ? (
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                    {/* Collection Card */}
                    <div className="card" style={{ borderTop: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '12px', background: '#d1fae5', borderRadius: '50%', color: '#059669' }}>
                                <FaMoneyBillWave size={24} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Collections</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>Total Cash (Paid)</span>
                                <span style={{ fontWeight: 'bold', color: '#059669' }}>₹ {stats.totalPaid.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>Due / Unpaid</span>
                                <span style={{ fontWeight: 'bold', color: '#d97706' }}>₹ {stats.totalDue.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>Pending</span>
                                <span style={{ fontWeight: 'bold', color: '#6366f1' }}>₹ {(stats.totalPending || 0).toLocaleString()}</span>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                <button onClick={() => navigate('/collection')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Deduction Card */}
                    <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '50%', color: '#dc2626' }}>
                                <FaChartPie size={24} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Deductions</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>Total Expenses</span>
                                <span style={{ fontWeight: 'bold', color: '#dc2626' }}>₹ {stats.totalDeductions.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                                <span style={{ color: '#666' }}>Transaction Count</span>
                                <span style={{ fontWeight: 'bold' }}>{stats.totalDeductionsCount}</span>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                <button onClick={() => navigate('/deduction')} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                                    Manage Expenses
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="card" style={{ borderTop: '4px solid #3b82f6', background: '#eff6ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '12px', background: '#fff', borderRadius: '50%', color: '#2563eb' }}>
                                <FaWallet size={24} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Remaining Balance</h2>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem 0' }}>
                            <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>Net Cash in Hand</p>
                            <h1 style={{ margin: '0.5rem 0', fontSize: '2.5rem', color: '#2563eb' }}>
                                ₹ {stats.balance.toLocaleString()}
                            </h1>
                            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                                (Collected - Expenses)
                            </p>
                        </div>
                    </div>

                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#999' }}>
                    <FaExclamationCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>No Event Selected</h3>
                    <p>Please select an event from the dropdown above to view the dashboard.</p>
                </div>
            )}
        </div>
    );
};

export default Home;
