const db = require('./database');

let isRunning = false;
let nextSendTime = Date.now();
const DAILY_LIMIT = 100;
const START_HOUR = 9; // 9 AM
const END_HOUR = 21; // 9 PM
const MIN_DELAY_MS = 1000 * 60 * 3; // 3 minutes
const MAX_DELAY_MS = 1000 * 60 * 12; // 12 minutes

const getRandomDelay = () => {
    return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
};

const getTodaySentCount = () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = db.prepare("SELECT COUNT(*) as count FROM contacts WHERE sent_at >= ?").get(startOfDay.toISOString()).count;
    return count;
};

const getMessageTemplate = () => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'message_template'").get();
    return row ? row.value : null;
};

const processQueue = async (io, getClient) => {
    try {
        const client = getClient();
        if (!client || !client.info) {
            console.log("Client not ready, skipping broadcast tick.");
            return;
        }

        const now = new Date();
        const hour = now.getHours();

        // Check time window
        if (hour < START_HOUR || hour >= END_HOUR) {
            console.log("Outside broadcasting hours. Waiting...");
            return;
        }

        // Check daily limit
        const sentToday = getTodaySentCount();
        if (sentToday >= DAILY_LIMIT) {
            console.log("Daily limit reached. Pausing until tomorrow.");
            return;
        }

        if (now.getTime() < nextSendTime) {
            // Not time yet
            return;
        }

        // Ready to send
        const contact = db.prepare("SELECT * FROM contacts WHERE status = 'pending' LIMIT 1").get();

        if (!contact) {
            console.log("No pending contacts.");
            return;
        }

        const template = getMessageTemplate();
        if (!template) {
            console.log("No message template set.");
            return;
        }

        // Send Message
        const chatId = `${contact.number}@c.us`;
        console.log(`Sending broadcast to ${contact.number}...`);

        try {
            await client.sendMessage(chatId, template);

            // Update DB
            db.prepare("UPDATE contacts SET status = 'sent', sent_at = ? WHERE id = ?").run(new Date().toISOString(), contact.id);

            // Notify UI
            io.emit('broadcast_sent', { number: contact.number });
            console.log(`Sent to ${contact.number}`);

            // Schedule next time
            const delay = getRandomDelay();
            nextSendTime = now.getTime() + delay;
            console.log(`Next message scheduled in ${(delay / 60000).toFixed(1)} minutes.`);

        } catch (err) {
            console.error(`Failed to send to ${contact.number}:`, err);
            db.prepare("UPDATE contacts SET status = 'failed' WHERE id = ?").run(contact.id);
        }

    } catch (error) {
        console.error("Scheduler error:", error);
    }
};

const startScheduler = (io, getClient) => {
    if (isRunning) return;
    isRunning = true;
    console.log("Scheduler started.");

    // Check every minute
    setInterval(() => processQueue(io, getClient), 60000);

    // Also run immediately to check
    processQueue(io, getClient);
};

module.exports = { startScheduler };
