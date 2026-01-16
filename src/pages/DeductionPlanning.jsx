import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { FaPlus, FaTrash, FaCalculator, FaMoneyBillWave, FaChartPie, FaFilePdf } from 'react-icons/fa';

const DeductionPlanning = ({ isAdmin }) => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [deductions, setDeductions] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);
    const [collectionTotal, setCollectionTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', amount: '', category: '', description: '', date: new Date().toISOString().slice(0, 10) });

    useEffect(() => {
        const storedEventId = localStorage.getItem('eventId');
        if (storedEventId && storedEventId !== 'undefined' && storedEventId !== 'null') {
            setSelectedEventId(storedEventId);
        }
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            fetchData(selectedEventId);
        } else {
            setDeductions([]);
            setCollectionTotal(0);
        }
    }, [selectedEventId]);

    const fetchEvents = async () => {
        try {
            const res = await axios.get('/api/auth/events');
            setEvents(res.data);
        } catch (err) {
            console.error("Error fetching events", err);
        }
    };

    const fetchData = async (evtId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: token } };

            // Fetch Deductions
            const dedRes = await axios.get(`/api/deductions?eventId=${evtId}`, config);
            setDeductions(dedRes.data);

            // Fetch Categories
            try {
                const catRes = await axios.get(`/api/events/${evtId}/categories`);
                setAvailableCategories(catRes.data);
                if (catRes.data.length > 0) {
                    setForm(prev => ({ ...prev, category: catRes.data[0].name }));
                } else {
                    setForm(prev => ({ ...prev, category: 'Other' }));
                }
            } catch (err) {
                console.error("Error fetching categories", err);
                setAvailableCategories([]);
            }

            // Fetch Collection Stats
            const pplRes = await axios.get(`/api/people?eventId=${evtId}`, config);
            const total = pplRes.data
                .filter(p => !p.credit && p.status === 'Paid')
                .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
            setCollectionTotal(total);

        } catch (err) {
            console.error("Error fetching data", err);
            if (err.response?.status === 403) {
                toast.error(err.response.data.message || "This event is not assigned to you. Please contact Super Admin.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: token } };
            await axios.post('/api/deductions', { ...form, eventId: selectedEventId }, config);
            setShowModal(false);
            setForm({ name: '', amount: '', category: 'Other', description: '', date: new Date().toISOString().slice(0, 10) });
            fetchData(selectedEventId);
            toast.success("Expense added successfully");
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error(err.response.data.message || "This event is not assigned to you. Please contact Super Admin.");
            } else {
                toast.error("Error adding deduction");
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/deductions/${id}`, { headers: { Authorization: token } });
            fetchData(selectedEventId);
            toast.success("Expense deleted successfully");
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error(err.response.data.message || "This event is not assigned to you. Please contact Super Admin.");
            } else {
                toast.error("Error deleting");
            }
        }
    };

    // Stats
    const totalDeductions = deductions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = collectionTotal - totalDeductions;

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // 1. Header Section - Logo on Left
        const img = new Image();
        img.src = '/chanllangers.png';
        try {
            doc.addImage(img, 'PNG', 14, 10, 22, 22);
        } catch (e) {
            doc.setFillColor(79, 70, 229);
            doc.rect(14, 10, 22, 22, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text("C", 22, 24);
        }

        // 2. Title & Subtitle - Aligned next to Logo
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("CHALLENGERZ", 42, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text("Expense & Deduction Report", 42, 26);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 42, 31);

        // 3. Stats Summary - Top Right
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("FINANCIAL SUMMARY", pageWidth - 14, 15, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Total Collection:   ${collectionTotal.toLocaleString()}`, pageWidth - 14, 21, { align: 'right' });
        doc.text(`Total Expenses:     ${totalDeductions.toLocaleString()}`, pageWidth - 14, 26, { align: 'right' });
        doc.text(`Net Balance:        ${balance.toLocaleString()}`, pageWidth - 14, 31, { align: 'right' });

        // 4. Data Table
        const tableColumn = ["#", "Date", "Expense Name", "Category", "Amount"];
        const tableRows = deductions.map((d, index) => [
            index + 1,
            new Date(d.date).toLocaleDateString(),
            d.name,
            d.category,
            d.amount.toLocaleString()
        ]);

        doc.autoTable({
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [79, 70, 229],
                fontSize: 10,
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            styles: {
                fontSize: 9,
                cellPadding: 4
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        doc.save("CHALLENGERZ_Deductions.pdf");
    };

    return (
        <div>
            <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ marginBottom: '0.5rem' }}>
                        <select
                            className="input-field"
                            style={{ maxWidth: '100%', width: '300px', fontWeight: 'bold', fontSize: '1.1rem' }}
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            <option value="">Select Event</option>
                            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}
                        </select>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>Track expenses and manage event budget</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '10px', background: '#d1fae5', borderRadius: '50%', color: '#059669' }}><FaMoneyBillWave size={24} /></div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Collected</p>
                        <h2 style={{ margin: 0, color: '#059669' }}>₹ {collectionTotal.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '10px', background: '#fee2e2', borderRadius: '50%', color: '#dc2626' }}><FaChartPie size={24} /></div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Expenses</p>
                        <h2 style={{ margin: 0, color: '#dc2626' }}>₹ {totalDeductions.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ padding: '10px', background: '#dbeafe', borderRadius: '50%', color: '#2563eb' }}><FaCalculator size={24} /></div>
                    <div>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Remaining Balance</p>
                        <h2 style={{ margin: 0, color: '#2563eb' }}>₹ {balance.toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="card">
                <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                    <h3>Expense List</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleDownloadPDF} className="btn btn-secondary">
                            <FaFilePdf /> Download PDF
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    if (!selectedEventId) return alert("Please select an event first.");
                                    setShowModal(true);
                                }}
                                className="btn btn-primary"
                            >
                                <FaPlus /> Add Expense
                            </button>
                        )}
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Amount</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {deductions.map(d => (
                                <tr key={d._id}>
                                    <td>{new Date(d.date).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{d.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{d.description}</div>
                                    </td>
                                    <td><span className="badge">{d.category}</span></td>
                                    <td style={{ color: '#dc2626', fontWeight: 'bold' }}>- ₹ {d.amount.toLocaleString()}</td>
                                    {isAdmin && (
                                        <td>
                                            <button onClick={() => handleDelete(d._id)} className="btn btn-danger" style={{ padding: '0.4rem' }}><FaTrash /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {deductions.length === 0 && <tr><td colSpan={isAdmin ? "5" : "4"} style={{ textAlign: 'center', padding: '2rem' }}>No expenses recorded</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Expense</h3>
                        <form onSubmit={handleAdd}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Expense Name</label>
                                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Catering Advance" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Amount</label>
                                <input className="input-field" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Category</label>
                                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    {availableCategories.map(cat => (
                                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                                    ))}
                                    {availableCategories.length === 0 && <option value="Other">Other</option>}
                                </select>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Description (Optional)</label>
                                <textarea className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="2" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Date</label>
                                <input className="input-field" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeductionPlanning;
