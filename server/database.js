const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists if we were to put it in a specific folder, 
// but for now we'll keep it in the root or server folder.
const dbPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'broadcasts.db')
  : path.resolve(__dirname, '../broadcasts.db');
const db = new Database(dbPath);

console.log('Connected to SQLite database at', dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,
    name TEXT,
    status TEXT DEFAULT 'pending', -- pending, sent, failed, replied
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    response_received INTEGER DEFAULT 0,
    response_text TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Pre-populate settings if needed
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
insertSetting.run('daily_limit', '100');
insertSetting.run('start_hour', '8');
insertSetting.run('end_hour', '23');

module.exports = db;
