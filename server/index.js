const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { initializeClient, getStatus, getQr, getClient } = require('./whatsappClient');
const { startScheduler } = require('./scheduler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Vite client
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Upload config
const upload = multer({ dest: 'uploads/' });

// API Routes in a 'light' manner here, but ideally should be separate
app.get('/api/status', (req, res) => {
    res.json({ status: getStatus(), qr: getQr() });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const numbers = [];

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // Split by newlines and handle potential complications like \r
        const lines = fileContent.split(/\r?\n/);

        lines.forEach(line => {
            // Clean number: remove non-digits
            let cleanNumber = line.replace(/\D/g, '');
            if (cleanNumber.length > 5) { // Basic validation
                numbers.push(cleanNumber);
            }
        });

        // Bulk insert
        const insert = db.prepare('INSERT OR IGNORE INTO contacts (number) VALUES (?)');
        let addedCount = 0;
        const insertMany = db.transaction((nums) => {
            for (const num of nums) {
                const result = insert.run(num);
                if (result.changes > 0) addedCount++;
            }
        });

        insertMany(numbers);

        // Cleanup
        fs.unlinkSync(filePath);

        res.json({ success: true, added: addedCount, total: numbers.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

app.post('/api/settings', (req, res) => {
    const { messageTemplate } = req.body;
    if (messageTemplate) {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        stmt.run('message_template', messageTemplate);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Template is required' });
    }
});

app.get('/api/stats', (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
    const sent = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status IN ('sent', 'replied')").get().count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'pending'").get().count;
    const replies = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE response_received = 1").get().count;
    const recentBroadcasts = db.prepare("SELECT * FROM contacts WHERE status IN ('sent', 'replied') ORDER BY sent_at DESC LIMIT 10").all();

    res.json({ total, sent, pending, replies, recentBroadcasts });
});

app.get('/api/contacts', (req, res) => {
    // For chat view
    const contacts = db.prepare("SELECT * FROM contacts WHERE status IN ('sent', 'replied') ORDER BY sent_at DESC").all();
    res.json(contacts);
});

// Initialize WhatsApp and Scheduler
initializeClient(io);
startScheduler(io, getClient);

app.post('/api/force-send', async (req, res) => {
    const client = getClient();
    // Check if client is actually fully ready.
    if (!client || !client.info) {
        return res.status(503).json({ error: 'WhatsApp client is not ready/connected yet.' });
    }

    const pending = db.prepare("SELECT * FROM contacts WHERE status = 'pending'").all();
    const templateRow = db.prepare("SELECT value FROM settings WHERE key = 'message_template'").get();
    const template = templateRow ? templateRow.value : null;

    if (!template) {
        return res.status(400).json({ error: 'No message template set.' });
    }

    if (pending.length === 0) {
        return res.json({ success: true, count: 0, message: 'No pending contacts.' });
    }

    // Process in background so request doesn't timeout if list is huge
    // But for "Instant" feel, we might want to do at least one check. 
    // We'll send response immediately and process async.

    res.json({ success: true, message: `Started sending ${pending.length} messages...` });

    console.log(`[FORCE SEND] Starting blast of ${pending.length} messages.`);

    for (const contact of pending) {
        try {
            const chatId = `${contact.number}@c.us`;
            await client.sendMessage(chatId, template);

            db.prepare("UPDATE contacts SET status = 'sent', sent_at = ? WHERE id = ?").run(new Date().toISOString(), contact.id);
            io.emit('broadcast_sent', { number: contact.number });

            console.log(`[FORCE] Sent to ${contact.number}`);

            // Minimal 1s delay to prevent immediate network flag
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.error(`[FORCE] Failed to send to ${contact.number}`, err);
            db.prepare("UPDATE contacts SET status = 'failed' WHERE id = ?").run(contact.id);
        }
    }
    console.log(`[FORCE SEND] Completed.`);
});

// Serve Client
const clientBuildPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
        // Skip API routes again just in case (though express matches top-down)
        if (req.path.startsWith('/api')) return res.status(404).send('Not Found');
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
