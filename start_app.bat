@echo off
echo Starting WhatsApp Broadcast Service...

cd /d "%~dp0"
start "Broadcast Server" cmd /k "npm start"

cd client
start "Broadcast Client" cmd /k "npm run dev"

echo Services started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3000
pause
