import React, { useEffect, useState } from 'react';

const ChatViewer = ({ socket }) => {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);

    const refreshContacts = () => {
        fetch('http://localhost:3000/api/contacts')
            .then(res => res.json())
            .then(data => setContacts(data));
    };

    useEffect(() => {
        refreshContacts();
        socket.on('new_reply', () => refreshContacts());
    }, [socket]);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: '1rem' }}>
            <div className="card" style={{ width: '300px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ margin: 0 }}>Conversations</h3>
                </div>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {contacts.length === 0 && <p style={{ padding: '1rem', color: '#8b949e' }}>No sent messages yet.</p>}
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            className="chat-row"
                            style={{ background: selectedContact?.id === contact.id ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                            onClick={() => setSelectedContact(contact)}
                        >
                            <div>
                                <div style={{ fontWeight: 600 }}>{contact.number}</div>
                                <div className="chat-message-preview">
                                    {contact.response_text ? '↩ ' + contact.response_text.substring(0, 20) + '...' : 'Sent broadcast'}
                                </div>
                            </div>
                            {contact.response_received === 1 && <span className="reply-badge">New</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedContact ? (
                    <>
                        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem' }}>
                            <h2 style={{ margin: 0 }}>{selectedContact.number}</h2>
                            <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                                Sent: {new Date(selectedContact.sent_at).toLocaleString()}
                            </span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Setup to show history. For now showing the broadcast and the last reply */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                <div style={{ background: '#238636', padding: '10px 15px', borderRadius: '15px 15px 0 15px', maxWidth: '70%' }}>
                                    <p style={{ margin: 0 }}>[Broadcast Message]</p>
                                    {/* Note: In a real app we would store the exact message body sent in history table, but for MVP we assume template */}
                                </div>
                            </div>

                            {selectedContact.response_text && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ background: '#1c2128', padding: '10px 15px', borderRadius: '15px 15px 15px 0', maxWidth: '70%', border: '1px solid #30363d' }}>
                                        <p style={{ margin: 0 }}>{selectedContact.response_text}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8b949e' }}>
                        Select a conversation to view details
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatViewer;
