import React, { useEffect, useState } from 'react';

const Dashboard = ({ socket }) => {
    const [stats, setStats] = useState({
        total: 0,
        sent: 0,
        pending: 0,
        replies: 0,
        recentBroadcasts: []
    });

    const refreshStats = () => {
        fetch('http://localhost:3000/api/status') // Just to ensure connectivity, but real stats from /api/stats
        fetch('http://localhost:3000/api/stats')
            .then(res => res.json())
            .then(data => setStats(data));
    };

    useEffect(() => {
        refreshStats();

        const interval = setInterval(refreshStats, 5000); // Poll every 5s for updates

        socket.on('broadcast_sent', () => refreshStats());
        socket.on('new_reply', () => refreshStats());

        return () => clearInterval(interval);
    }, [socket]);

    const responseRate = stats.sent > 0 ? ((stats.replies / stats.sent) * 100).toFixed(1) : 0;

    return (
        <div>
            <h2>Dashboard</h2>
            <div className="stats-grid">
                <div className="stat-box">
                    <div className="stat-label">Total Contacts</div>
                    <div className="stat-value">{stats.total}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Sent Messages</div>
                    <div className="stat-value">{stats.sent}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Pending</div>
                    <div className="stat-value" style={{ color: '#e3b341' }}>{stats.pending}</div>
                </div>
                <div className="stat-box">
                    <div className="stat-label">Response Rate</div>
                    <div className="stat-value" style={{ color: '#2ea043' }}>{responseRate}%</div>
                </div>
            </div>

            <div className="card">
                <h3>Recent Activity</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: '#8b949e' }}>
                            <th style={{ padding: '0.5rem' }}>Number</th>
                            <th style={{ padding: '0.5rem' }}>Status</th>
                            <th style={{ padding: '0.5rem' }}>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.recentBroadcasts.map(contact => (
                            <tr key={contact.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.8rem 0.5rem' }}>{contact.number}</td>
                                <td style={{ padding: '0.8rem 0.5rem' }}>
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: contact.status === 'replied' ? 'rgba(46, 160, 67, 0.2)' : 'rgba(255,255,255,0.1)',
                                        color: contact.status === 'replied' ? '#2ea043' : 'inherit'
                                    }}>
                                        {contact.status}
                                    </span>
                                </td>
                                <td style={{ padding: '0.8rem 0.5rem', color: '#8b949e' }}>
                                    {new Date(contact.sent_at).toLocaleTimeString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
