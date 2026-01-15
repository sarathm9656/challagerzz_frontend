import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Login = ({ setIsAdmin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [eventId, setEventId] = useState('');
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch Events on Mount
    React.useEffect(() => {
        axios.get('/api/auth/events')
            .then(res => setEvents(res.data))
            .catch(err => console.error("Error fetching events", err));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post('/api/auth/login', { username, password, eventId });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('role', res.data.role);
            localStorage.setItem('username', res.data.username);
            if (res.data.eventId) {
                localStorage.setItem('eventId', res.data.eventId);
            } else {
                localStorage.removeItem('eventId'); // Clear if no event selected
            }

            setIsAdmin(true);
            toast.success(`Welcome back, ${res.data.username}!`);
            if (res.data.role === 'superadmin') {
                navigate('/superadmin');
            } else if (res.data.role === 'admin') {
                navigate('/collection');
            } else {
                navigate('/');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            toast.error(msg);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleLogin}>

                    {/* Event Selection */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Event</label>
                        <select
                            className="input-field"
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                        >
                            <option value="">-- Select Event (Optional for Superadmin) --</option>
                            {events.map(ev => (
                                <option key={ev._id} value={ev._id}>{ev.name}</option>
                            ))}
                        </select>
                        <small style={{ color: 'gray', fontSize: '0.8rem' }}>Required for Admins. Optional for Super Admin.</small>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Username</label>
                        <input
                            type="text"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Password</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                        Login
                    </button>
                </form>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button onClick={() => navigate('/')} className="btn btn-secondary">
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
