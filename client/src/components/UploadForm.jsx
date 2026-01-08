import React, { useState } from 'react';

const UploadForm = () => {
    const [file, setFile] = useState(null);
    const [template, setTemplate] = useState('');
    const [status, setStatus] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSaveTemplate = async () => {
        if (!template) return;
        const res = await fetch('http://localhost:3000/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageTemplate: template })
        });
        if (res.ok) {
            setStatus('Template saved!');
            setTimeout(() => setStatus(''), 3000);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setStatus('Uploading...');

        try {
            const res = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setStatus(`Success! Added ${data.added} contacts (${data.total} found).`);
                setFile(null);
            } else {
                setStatus('Error: ' + data.error);
            }
        } catch (err) {
            setStatus('Upload failed.');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="card">
                <h2>1. Message Template</h2>
                <p>Set the message content that will be sent to all contacts.</p>
                <div className="form-group">
                    <label>Message Content</label>
                    <textarea
                        rows="5"
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        placeholder="Hello! Check out our new offer..."
                    />
                </div>
                <button className="btn-primary" onClick={handleSaveTemplate}>Save Template</button>
            </div>

            <div className="card">
                <h2>2. Upload Contacts</h2>
                <p>Upload a <strong>.txt</strong> file with one phone number per line.</p>
                <div className="form-group">
                    <label>Contact List File (.txt)</label>
                    <input type="file" accept=".txt,.csv" onChange={handleFileChange} />
                </div>
                <button className="btn-primary" onClick={handleUpload} disabled={!file}>
                    Upload & Add to Queue
                </button>
                {status && <p style={{ marginTop: '1rem', color: '#2ea043' }}>{status}</p>}
            </div>

            <div className="card" style={{ borderColor: 'rgba(218, 54, 51, 0.5)' }}>
                <h2 style={{ color: '#da3633' }}>⚡ Danger Zone</h2>
                <p><strong>Instant Mode:</strong> Bypasses all safety delays and limits. Sends to ALL pending contacts immediately (1 sec delay).</p>
                <button
                    className="btn-primary"
                    style={{ backgroundColor: '#da3633' }}
                    onClick={async () => {
                        if (!confirm('⚠️ ARE YOU SURE? This ignores safety limits and highers ban risk. Use for testing only.')) return;

                        setStatus('Initiating instant blast...');
                        try {
                            const res = await fetch('http://localhost:3000/api/force-send', { method: 'POST' });
                            const data = await res.json();
                            if (data.error) setStatus('Error: ' + data.error);
                            else setStatus(data.message);
                        } catch (e) {
                            setStatus('Failed to trigger instant send');
                        }
                    }}
                >
                    🚀 Send All Pending NOW
                </button>
            </div>

        </div>
    );
};

export default UploadForm;
