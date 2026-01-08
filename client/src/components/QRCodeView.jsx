import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QRCodeView = ({ socket, status }) => {
    const [qrSrc, setQrSrc] = useState('');

    useEffect(() => {
        socket.on('qr', (qrData) => {
            QRCode.toDataURL(qrData)
                .then(url => {
                    setQrSrc(url);
                })
                .catch(err => console.error(err));
        });

        // Check if we can get QR via API if socket missed it
        if (status === 'scanning' || status === 'disconnected') {
            fetch('http://localhost:3000/api/status')
                .then(res => res.json())
                .then(data => {
                    if (data.qr) {
                        QRCode.toDataURL(data.qr)
                            .then(url => setQrSrc(url));
                    }
                });
        }
    }, [socket, status]);

    return (
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <h2>Connect WhatsApp</h2>
            <p style={{ color: '#8b949e', marginBottom: '2rem' }}>
                Open WhatsApp on your phone, go to Menu {'>'} Linked Devices, and scan the code below.
            </p>

            {status === 'connected' ? (
                <div style={{ padding: '3rem', color: '#2ea043' }}>
                    <h3>✅ Connected Successfully</h3>
                </div>
            ) : (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', display: 'inline-block' }}>
                    {qrSrc ? <img src={qrSrc} alt="QR Code" width="250" /> : <p style={{ color: 'black' }}>Waiting for QR...</p>}
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <p>Status: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{status}</span></p>
            </div>
        </div>
    );
};

export default QRCodeView;
