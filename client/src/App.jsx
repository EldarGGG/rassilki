import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import QRCodeView from './components/QRCodeView';
import UploadForm from './components/UploadForm';
import Dashboard from './components/Dashboard';
import ChatViewer from './components/ChatViewer';

const socket = io('http://localhost:3000');

function App() {
  const [activeTab, setActiveTab] = useState('connect');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    socket.on('status', (status) => {
      setConnectionStatus(status);
      if (status === 'connected' && activeTab === 'connect') {
        setActiveTab('dashboard');
      }
    });

    // Poll for status initially
    fetch('http://localhost:3000/api/status')
      .then(res => res.json())
      .then(data => {
        if (data.status) setConnectionStatus(data.status);
      });

    return () => {
      socket.off('status');
    };
  }, [activeTab]);

  return (
    <div className="app-container">
      <nav className="sidebar">
        <h1 className="logo">Broadcast<span className="accent">Pro</span></h1>
        <div className="nav-items">
          <button
            className={activeTab === 'connect' ? 'active' : ''}
            onClick={() => setActiveTab('connect')}
          >
            Connect
            <span className={`status-dot ${connectionStatus}`}></span>
          </button>
          <button
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => setActiveTab('upload')}
          >
            New Campaign
          </button>
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeTab === 'chats' ? 'active' : ''}
            onClick={() => setActiveTab('chats')}
          >
            Messages
          </button>
        </div>
      </nav>

      <main className="content">
        {activeTab === 'connect' && <QRCodeView socket={socket} status={connectionStatus} />}
        {activeTab === 'upload' && <UploadForm />}
        {activeTab === 'dashboard' && <Dashboard socket={socket} />}
        {activeTab === 'chats' && <ChatViewer socket={socket} />}
      </main>
    </div>
  );
}

export default App;
