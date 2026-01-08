const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const db = require('./database');

let client;
let qrCodeData = null;
let status = 'disconnected'; // disconnected, scanning, connected

const initializeClient = (io) => {
    console.log('Initializing WhatsApp Client...');

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: process.env.DATA_DIR ? path.join(process.env.DATA_DIR, '.wwebjs_auth') : './.wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        }
    });

    client.on('qr', (qr) => {
        console.log('QR RECEIVED');
        qrCodeData = qr;
        status = 'scanning';
        io.emit('qr', qr);
        io.emit('status', status);
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        status = 'connected';
        qrCodeData = null;
        io.emit('status', status);
        io.emit('ready');
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
        status = 'authenticated'; // Transitional state
        io.emit('status', status);
    });

    client.on('auth_failure', msg => {
        console.error('AUTHENTICATION FAILURE', msg);
        status = 'disconnected';
        io.emit('status', status);
    });

    client.on('disconnected', (reason) => {
        console.log('Client was logged out', reason);
        status = 'disconnected';
        io.emit('status', status);
        // Destroy and re-initialize
        client.destroy();
        client.initialize();
    });

    client.on('message', async msg => {
        // Handle incoming messages (replies)
        const senderNumber = msg.from.replace('@c.us', '');

        // Check if this number is in our contacts
        const updateResponse = db.prepare(`
      UPDATE contacts 
      SET response_received = 1, response_text = ?, status = 'replied'
      WHERE number = ?
    `);

        const info = updateResponse.run(msg.body, senderNumber);
        if (info.changes > 0) {
            console.log(`Received reply from ${senderNumber}: ${msg.body}`);
            io.emit('new_reply', { number: senderNumber, text: msg.body });
        }
    });

    client.initialize();
};

const getStatus = () => status;
const getQr = () => qrCodeData;
const getClient = () => client;

module.exports = {
    initializeClient,
    getStatus,
    getQr,
    getClient
};
