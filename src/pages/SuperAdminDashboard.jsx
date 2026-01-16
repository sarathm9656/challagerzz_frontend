import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { FaUserPlus, FaCalendarPlus, FaExchangeAlt, FaHistory, FaToggleOn, FaToggleOff, FaTags, FaTrash, FaFilePdf, FaEdit } from 'react-icons/fa';

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('admins'); // admins, events, categories, logs
    const [admins, setAdmins] = useState([]);
    const [events, setEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showEditAdminModal, setShowEditAdminModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showManageEventsModal, setShowManageEventsModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [assignedEventsSelection, setAssignedEventsSelection] = useState([]);

    // Forms
    const [adminForm, setAdminForm] = useState({ username: '', password: '', email: '', assignedEvents: [] });
    const [editAdminForm, setEditAdminForm] = useState({ id: '', username: '', password: '', email: '' });
    const [eventForm, setEventForm] = useState({ name: '' });
    const [categoryForm, setCategoryForm] = useState({ name: '', eventId: '' });

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: token } };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'admins') {
                const [admRes, evtRes] = await Promise.all([
                    axios.get('/api/superadmin/admins', config),
                    axios.get('/api/superadmin/events', config)
                ]);
                setAdmins(Array.isArray(admRes.data) ? admRes.data : []);
                setEvents(Array.isArray(evtRes.data) ? evtRes.data : []);
            } else if (activeTab === 'events') {
                const res = await axios.get('/api/superadmin/events', config);
                setEvents(Array.isArray(res.data) ? res.data : []);
            } else if (activeTab === 'categories') {
                const [catRes, evtRes] = await Promise.all([
                    axios.get('/api/superadmin/categories', config),
                    axios.get('/api/superadmin/events', config)
                ]);
                setCategories(Array.isArray(catRes.data) ? catRes.data : []);
                setEvents(Array.isArray(evtRes.data) ? evtRes.data : []);
            } else if (activeTab === 'logs') {
                const res = await axios.get('/api/superadmin/logs', config);
                setLogs(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error(err);
            alert("Error fetching data: " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/superadmin/admins', adminForm, config);
            setShowAdminModal(false);
            setAdminForm({ username: '', password: '', email: '', assignedEvents: [] });
            fetchData();
            toast.success("Admin created successfully");
        } catch (err) {
            toast.error("Error creating admin: " + (err.response?.data?.message || err.message));
        }
    };

    const handleOpenEditAdmin = (admin) => {
        setEditAdminForm({
            id: admin._id,
            username: admin.username,
            email: admin.email || '',
            password: '' // Don't show existing hash, separate update
        });
        setShowEditAdminModal(true);
    };

    const handleUpdateAdmin = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                username: editAdminForm.username,
                email: editAdminForm.email
            };
            if (editAdminForm.password) {
                payload.password = editAdminForm.password;
            }
            await axios.put(`/api/superadmin/admins/${editAdminForm.id}`, payload, config);
            setShowEditAdminModal(false);
            fetchData();
            toast.success("Admin updated successfully");
        } catch (err) {
            toast.error("Error updating admin: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/superadmin/events', eventForm, config);
            setShowEventModal(false);
            setEventForm({ name: '' });
            fetchData();
            toast.success("Event created successfully");
        } catch (err) {
            console.error(err);
            toast.error("Error creating event: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/superadmin/categories', categoryForm, config);
            setShowCategoryModal(false);
            setCategoryForm({ name: '', eventId: '' });
            fetchData();
            toast.success("Category created successfully");
        } catch (err) {
            toast.error("Error creating category: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!confirm("Are you sure? This will not delete existing deductions but might affect future entries.")) return;
        try {
            await axios.delete(`/api/superadmin/categories/${id}`, config);
            fetchData();
            toast.success("Category deleted");
        } catch (err) {
            toast.error("Error deleting category");
        }
    };

    const toggleAdminStatus = async (admin) => {
        try {
            await axios.put(`/api/superadmin/admins/${admin._id}`, { isActive: !admin.isActive }, config);
            fetchData();
            toast.success(`Admin ${admin.isActive ? 'deactivated' : 'activated'}`);
        } catch (err) {
            toast.error("Error updating status: " + (err.response?.data?.message || err.message));
        }
    };

    const openManageEvents = (admin) => {
        setSelectedAdmin(admin);
        const currentIds = admin.assignedEvents ? admin.assignedEvents.map(e => e._id) : [];
        setAssignedEventsSelection(currentIds);
        setShowManageEventsModal(true);
    };

    const handleSaveEvents = async () => {
        if (!selectedAdmin) return;
        try {
            await axios.put(`/api/superadmin/admins/${selectedAdmin._id}`, { assignedEvents: assignedEventsSelection }, config);
            setShowManageEventsModal(false);
            fetchData();
            toast.success("Assigned events updated successfully");
        } catch (err) {
            toast.error("Error updating events: " + (err.response?.data?.message || err.message));
        }
    };

    const toggleEventSelection = (eventId) => {
        if (assignedEventsSelection.includes(eventId)) {
            setAssignedEventsSelection(assignedEventsSelection.filter(id => id !== eventId));
        } else {
            setAssignedEventsSelection([...assignedEventsSelection, eventId]);
        }
    };

    const toggleEventStatus = async (event) => {
        try {
            await axios.put(`/api/superadmin/events/${event._id}`, { isActive: !event.isActive }, config);
            fetchData();
        } catch (err) {
            alert("Error updating event status: " + (err.response?.data?.message || err.message));
        }
    };

    const updateEventName = async (id, name) => {
        try {
            await axios.put(`/api/superadmin/events/${id}`, { name }, config);
            fetchData();
        } catch (err) {
            alert("Error updating event: " + (err.response?.data?.message || err.message));
        }
    };

    const deleteEvent = async (id) => {
        try {
            await axios.delete(`/api/superadmin/events/${id}`, config);
            fetchData();
        } catch (err) {
            alert("Error deleting event: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDownloadLogsPDF = () => {
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
        doc.text("Audit Logs Report", 42, 26);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 42, 31);

        const tableColumn = ["Time", "User", "Action", "Target", "Details"];
        const tableRows = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.performedByName || 'Unknown',
            log.action,
            log.target,
            log.details ? JSON.stringify(log.details) : '-'
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
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 35 },
                4: { cellWidth: 'auto' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        doc.save("CHALLENGERZ_AuditLogs.pdf");
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h1>Super Admin Dashboard</h1>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('admins')} className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}>Admins</button>
                    <button onClick={() => setActiveTab('events')} className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}>Events</button>
                    <button onClick={() => setActiveTab('categories')} className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}>Expense Categories</button>
                    <button onClick={() => setActiveTab('logs')} className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}>Audit Logs</button>
                </div>
            </div>

            {loading && <p>Loading...</p>}

            {/* ADMINS TAB */}
            {activeTab === 'admins' && (
                <div className="card">
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={() => setShowAdminModal(true)} className="btn btn-primary"><FaUserPlus /> Add New Admin</button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Assigned Events</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map(admin => (
                                    <tr key={admin._id}>
                                        <td>{admin.username}</td>
                                        <td>{admin.email || '-'}</td>
                                        <td>
                                            {admin.assignedEvents && admin.assignedEvents.length > 0
                                                ? admin.assignedEvents.map(e => e.name).join(', ')
                                                : 'Unassigned'}
                                        </td>
                                        <td>
                                            {admin.isActive ?
                                                <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '5px' }}><FaToggleOn /> Active</span> :
                                                <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '5px' }}><FaToggleOff /> Inactive</span>
                                            }
                                        </td>
                                        <td style={{ display: 'flex', gap: '5px' }}>
                                            <button onClick={() => handleOpenEditAdmin(admin)} className="btn btn-secondary">
                                                <FaEdit /> Edit
                                            </button>
                                            <button onClick={() => openManageEvents(admin)} className="btn btn-secondary">
                                                <FaExchangeAlt /> Manage
                                            </button>
                                            <button onClick={() => toggleAdminStatus(admin)} className="btn btn-secondary">
                                                {admin.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* EVENTS TAB */}
            {activeTab === 'events' && (
                <div className="card">
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={() => setShowEventModal(true)} className="btn btn-primary"><FaCalendarPlus /> Add New Event</button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Event Name</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(ev => (
                                    <tr key={ev._id}>
                                        <td>{ev.name}</td>
                                        <td>
                                            {ev.isActive ?
                                                <span style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '5px' }}><FaToggleOn /> Active</span> :
                                                <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '5px' }}><FaToggleOff /> Inactive</span>
                                            }
                                        </td>
                                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => toggleEventStatus(ev)} className="btn btn-secondary">
                                                {ev.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => {
                                                const newName = prompt("Edit Event Name:", ev.name);
                                                if (newName) updateEventName(ev._id, newName);
                                            }} className="btn btn-secondary">
                                                Edit
                                            </button>
                                            <button onClick={() => {
                                                if (confirm("Delete this event?")) deleteEvent(ev._id);
                                            }} className="btn btn-danger">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
                <div className="card">
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={() => setShowCategoryModal(true)} className="btn btn-primary"><FaTags /> Add Expense Category</button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Category Name</th>
                                    <th>Assigned Event</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat._id}>
                                        <td><strong>{cat.name}</strong></td>
                                        <td>{cat.eventId?.name || 'Unknown Event'}</td>
                                        <td>
                                            <button onClick={() => handleDeleteCategory(cat._id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No categories found. Start by adding one.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
                <div className="card">
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleDownloadLogsPDF} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaFilePdf /> Download PDF
                        </button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log._id}>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td style={{ fontWeight: 'bold' }}>{log.performedByName || 'Unknown'}</td>
                                        <td>{log.action}</td>
                                        <td>{log.target}</td>
                                        <td>
                                            {log.details ? (
                                                <button onClick={() => alert(JSON.stringify(log.details, null, 2))} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>View JSON</button>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Admin Modal */}
            {showAdminModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Admin</h3>
                        <form onSubmit={handleCreateAdmin}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Username</label>
                                <input className="input-field" value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Email (Optional)</label>
                                <input className="input-field" type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Password</label>
                                <input className="input-field" type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Assign Events</label>
                                <select
                                    multiple
                                    className="input-field"
                                    style={{ height: '100px' }}
                                    value={adminForm.assignedEvents || []}
                                    onChange={e => {
                                        const values = Array.from(e.target.selectedOptions, option => option.value);
                                        setAdminForm({ ...adminForm, assignedEvents: values });
                                    }}
                                    required
                                >
                                    {events.map(ev => (
                                        <option key={ev._id} value={ev._id}>{ev.name} {ev.isActive ? '' : '(Inactive)'}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowAdminModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditAdminModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Edit Admin</h3>
                        <form onSubmit={handleUpdateAdmin}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Username</label>
                                <input
                                    className="input-field"
                                    value={editAdminForm.username}
                                    onChange={e => setEditAdminForm({ ...editAdminForm, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Email (Optional)</label>
                                <input
                                    className="input-field"
                                    type="email"
                                    value={editAdminForm.email}
                                    onChange={e => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>New Password (Optional)</label>
                                <input
                                    className="input-field"
                                    type="password"
                                    placeholder="Leave blank to keep unchanged"
                                    value={editAdminForm.password}
                                    onChange={e => setEditAdminForm({ ...editAdminForm, password: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowEditAdminModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add Expense Category</h3>
                        <form onSubmit={handleCreateCategory}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Category Name</label>
                                <input className="input-field" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required placeholder="e.g. Food, Venue, Logistics" />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Assign to Event</label>
                                <select
                                    className="input-field"
                                    value={categoryForm.eventId}
                                    onChange={e => setCategoryForm({ ...categoryForm, eventId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Event</option>
                                    {events.map(ev => (
                                        <option key={ev._id} value={ev._id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Category</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Other Modals... (Manage Events, Event Modal same as before) */}
            {showEventModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Add New Event</h3>
                        <form onSubmit={handleCreateEvent}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label>Event Name</label>
                                <input className="input-field" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowEventModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showManageEventsModal && selectedAdmin && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h3>Manage Events for {selectedAdmin.username}</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', margin: '1rem 0' }}>
                            {events.map(ev => (
                                <div key={ev._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id={`ev-${ev._id}`}
                                        checked={assignedEventsSelection.includes(ev._id)}
                                        onChange={() => toggleEventSelection(ev._id)}
                                        style={{ marginRight: '10px' }}
                                    />
                                    <label htmlFor={`ev-${ev._id}`} style={{ cursor: 'pointer', flex: 1 }}>
                                        {ev.name} {ev.isActive ? '' : <span style={{ fontSize: '0.8em', color: 'red' }}>(Inactive)</span>}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => setShowManageEventsModal(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSaveEvents} className="btn btn-primary">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
