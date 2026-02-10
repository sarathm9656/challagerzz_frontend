import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';

import { FaEdit, FaTrash, FaPlus, FaFilePdf, FaCheck, FaTimes } from 'react-icons/fa';

const Collection = ({ isAdmin }) => {
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(false); // Set to true when backend is ready
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [currentPerson, setCurrentPerson] = useState(null);
    const [targetId, setTargetId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        amount: 0,
        status: 'Paid',
        paymentMethod: 'Cash',
        date: new Date().toISOString().slice(0, 10)
    });
    const [minAmountFilter, setMinAmountFilter] = useState(0);

    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState(() => {
        const stored = localStorage.getItem('eventId');
        return (stored && stored !== 'undefined' && stored !== 'null') ? stored : '';
    });

    useEffect(() => {
        // Persist selection to localStorage so it survives refresh
        if (selectedEventId) {
            localStorage.setItem('eventId', selectedEventId);
        } else {
            localStorage.removeItem('eventId');
        }
    }, [selectedEventId]);

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            fetchPeople(selectedEventId);
        } else {
            setPeople([]); // Clear data if no event selected
        }
    }, [selectedEventId]);

    const fetchEvents = async () => {
        try {
            const res = await axios.get('/api/auth/events'); // Use public auth/events endpoint
            setEvents(res.data);
            // Do NOT auto-select. Respect user's choice (or lack thereof).
        } catch (err) {
            console.error("Error fetching events", err);
        }
    }

    const fetchPeople = async (evtId) => {
        if (!evtId) return; // double check
        try {
            setLoading(true);
            const url = `/api/people?eventId=${evtId}`;
            const res = await axios.get(url);
            setPeople(res.data);
        } catch (error) {
            console.error("Error fetching people", error);
            if (error.response && error.response.status === 400) {
                // Likely invalid ID (e.g. "undefined" string), clear it
                setSelectedEventId('');
                setPeople([]);
            } else if (error.response && error.response.status === 403) {
                toast.error(error.response.data.message || "Access Denied: Please contact Super Admin.");
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        // Only count amounts where status is 'Paid' as "Collected Cash"
        const totalCash = people
            .filter(p => !p.credit && p.status === 'Paid')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // Count Credit/Due/Unpaid amounts
        const totalCredit = people
            .filter(p => p.credit || p.status === 'Credit' || p.status === 'Unpaid')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        // Count Pending separately
        const totalPending = people
            .filter(p => p.status === 'Pending')
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const count = people.length;
        return { totalCash, totalCredit, totalPending, count };
    };



    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const stats = calculateStats();

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
        doc.text("Cash Collection Report", 42, 26);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 42, 31);

        // 3. Stats Summary - Top Right
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text("COLLECTION SUMMARY", pageWidth - 14, 15, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Cash Collected:  ${stats.totalCash.toLocaleString()}`, pageWidth - 14, 21, { align: 'right' });
        doc.text(`Total Due:       ${stats.totalCredit.toLocaleString()}`, pageWidth - 14, 26, { align: 'right' });
        doc.text(`Total Pending:   ${stats.totalPending.toLocaleString()}`, pageWidth - 14, 31, { align: 'right' });

        const tableColumn = ["#", "Date", "Name", "Amount", "Method", "Status"];
        const tableRows = filteredPeople.map((person, index) => [
            index + 1,
            person.date ? new Date(person.date).toLocaleDateString() : '-',
            person.name,
            person.amount.toLocaleString(),
            person.paymentMethod || 'Cash',
            person.status || (person.credit ? "Credit" : "Paid")
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
                3: { halign: 'right', fontStyle: 'bold' }
            },
            styles: {
                fontSize: 9,
                cellPadding: 4
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        doc.save("CHALLENGERZ_Collection.pdf");
    };

    const handleEdit = (person) => {
        setCurrentPerson(person);
        setFormData({
            name: person.name,
            amount: person.amount,
            status: person.status || (person.credit ? 'Credit' : 'Paid'), // Fallback
            paymentMethod: person.paymentMethod || 'Cash',
            date: person.date || new Date().toISOString(),
            eventId: person.eventId ? (typeof person.eventId === 'object' ? person.eventId._id : person.eventId) : selectedEventId
        });
        setShowModal(true);
    };

    const handleDeleteClick = (id) => {
        setTargetId(id);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/api/people/${targetId}`, {
                headers: { Authorization: localStorage.getItem('token') }
            });
            fetchPeople();
            setShowConfirm(false);
            toast.success("Record deleted successfully");
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error(err.response.data.message || "Access Denied: Please contact Super Admin.");
            } else {
                toast.error("Failed to delete. Ensure you are logged in.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return toast.error("Unauthorized");

        try {
            if (currentPerson) {
                // Edit
                await axios.put(`/api/people/${currentPerson._id}`, formData, {
                    headers: { Authorization: token }
                });
                toast.success("Record updated successfully");
            } else {
                // Add
                if (!selectedEventId) {
                    return toast.error("Please select an event from the top dropdown before adding a record.");
                }
                await axios.post('/api/people', { ...formData, eventId: selectedEventId }, {
                    headers: { Authorization: token }
                });
                toast.success("Record added successfully");
            }
            setShowModal(false);
            fetchPeople();
            // Reset
            setCurrentPerson(null);
            setFormData({
                name: '',
                amount: 0,
                status: 'Paid',
                paymentMethod: 'Cash',
                date: new Date().toISOString().slice(0, 10)
            });
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error(err.response.data.message || "Access Denied: Please contact Super Admin.");
            } else {
                toast.error("Operation failed");
            }
        }
    };

    // Filter
    const filteredPeople = people.filter(p => Number(p.amount) >= minAmountFilter);
    const stats = calculateStats();

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
                    <p style={{ color: 'var(--text-muted)' }}>Manage cash collections and credits</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                    <div className="flex-responsive" style={{ marginBottom: '5px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>
                            Cash: ₹ {stats.totalCash}
                        </span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#d97706' }}>
                            Due: ₹ {stats.totalCredit}
                        </span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#6366f1' }}>
                            Pending: ₹ {stats.totalPending}
                        </span>
                    </div>
                    <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '4px' }}>
                        Total Records: {stats.count}
                    </span>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="number"
                            placeholder="Min Amount..."
                            className="input-field"
                            style={{ width: '150px', marginBottom: 0 }}
                            value={minAmountFilter}
                            onChange={(e) => setMinAmountFilter(Number(e.target.value))}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleDownloadPDF} className="btn btn-secondary">
                            <FaFilePdf /> Download PDF
                        </button>
                        {isAdmin && (
                            <button onClick={() => {
                                setCurrentPerson(null);
                                setFormData({
                                    name: '',
                                    amount: 0,
                                    status: 'Paid',
                                    paymentMethod: 'Cash',
                                    date: new Date().toISOString().slice(0, 10)
                                });
                                setShowModal(true);
                            }} className="btn btn-primary">
                                <FaPlus /> Add Person
                            </button>
                        )}
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                {isAdmin && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPeople.map((person, index) => (
                                <tr key={person._id}>
                                    <td>{index + 1}</td>
                                    <td>{person.date ? new Date(person.date).toLocaleDateString() : '-'}</td>
                                    <td>{person.name}</td>
                                    <td style={{ fontWeight: 'bold' }}>{person.amount}</td>
                                    <td>{person.paymentMethod || 'Cash'}</td>
                                    <td>
                                        {person.status === 'Credit' || person.status === 'Unpaid' || person.credit ?
                                            <span style={{ color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                {person.status === 'Unpaid' ? 'Unpaid' : 'Credit'}
                                            </span> :
                                            (person.status === 'Pending' ?
                                                <span style={{ color: '#4f46e5', background: '#e0e7ff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Pending</span> :
                                                <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>Paid</span>
                                            )
                                        }
                                    </td>
                                    {isAdmin && (
                                        <td>
                                            <button onClick={() => handleEdit(person)} className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }}>
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDeleteClick(person._id)} className="btn btn-danger" style={{ padding: '0.4rem' }}>
                                                <FaTrash />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredPeople.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: 'center', padding: '2rem' }}>No records found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{currentPerson ? 'Edit Person' : 'Add Person'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Name</label>
                                <input
                                    className="input-field"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Amount</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={formData.date ? formData.date.slice(0, 10) : ''}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label>Status</label>
                                <select
                                    className="input-field"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Credit">Credit</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label>Payment Method</label>
                                <select
                                    className="input-field"
                                    value={formData.paymentMethod}
                                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="GPay">GPay</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">{currentPerson ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h3>Confirm Delete</h3>
                        <p>Are you sure you want to delete this record? This action cannot be undone.</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                            <button onClick={() => setShowConfirm(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={confirmDelete} className="btn btn-danger">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Collection;
