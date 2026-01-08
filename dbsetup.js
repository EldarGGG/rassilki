const { spawn } = require('child_process');
const path = require('path');

console.log("--> Starting Database Setup...");

try {
    // We just require the database file, which initializes tables via better-sqlite3
    require('./server/database.js');
    console.log("--> Database initialized successfully.");
} catch (e) {
    console.error("--> Database initialization failed:", e);
    process.exit(1);
}

// Check for next command
const args = process.argv.slice(2);
if (args.length > 0) {
    const cmd = args[0];
    const cmdArgs = args.slice(1);

    console.log(`--> Starting application: ${cmd} ${cmdArgs.join(' ')}`);

    const child = spawn(cmd, cmdArgs, {
        stdio: 'inherit',
        env: process.env
    });

    child.on('close', (code) => {
        console.log(`--> Application exited with code ${code}`);
        process.exit(code);
    });

    child.on('error', (err) => {
        console.error("--> Failed to start application:", err);
        process.exit(1);
    });
} else {
    console.log("--> No further command specified. Exiting.");
}
