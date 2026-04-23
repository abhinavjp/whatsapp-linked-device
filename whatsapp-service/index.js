const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const WebSocket = require('ws');
const pino = require('pino');
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 3000 });
const clients = new Set();
const logFilePath = path.join(__dirname, '..', 'whatsapp-service.log');
function logToFile(msg) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(logFilePath, formattedMsg);
    console.log(msg);
}

let sock = null;
let currentQr = null;
let currentStatus = 'disconnected';

logToFile('WhatsApp Microservice starting...');

async function connectToWhatsApp() {
    console.log('Starting WhatsApp connection...');
    const sessionsDir = path.join(__dirname, '..', 'whatsapp-sessions');
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    const { version, isLatest } = await fetchLatestWaWebVersion();
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);
    
    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'info' }),
        browser: ['Ubuntu', 'Chrome', '10.0.0'],
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            logToFile('New QR code generated');
            currentQr = qr;
            broadcast({ type: 'qr', data: qr });
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logToFile(`Connection closed. Reason: ${lastDisconnect?.error?.message || lastDisconnect?.error}`);
            logToFile(`Should reconnect: ${shouldReconnect}`);
            currentStatus = 'disconnected';
            currentQr = null;
            broadcast({ type: 'status', data: 'disconnected' });
            
            if (shouldReconnect) {
                logToFile('Restarting WhatsApp connection in 2 seconds...');
                setTimeout(connectToWhatsApp, 2000);
            }
        } else if (connection === 'open') {
            logToFile('WhatsApp connection opened successfully');
            currentStatus = 'connected';
            currentQr = null;
            broadcast({ type: 'status', data: 'connected' });
        }
    });
}

function broadcast(msg) {
    const msgStr = JSON.stringify(msg);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msgStr);
        }
    }
}

wss.on('connection', (ws) => {
    console.log('Backend connected to WhatsApp microservice');
    clients.add(ws);
    
    // Send the current state to the newly connected frontend
    if (currentStatus === 'connected') {
        ws.send(JSON.stringify({ type: 'status', data: 'connected' }));
    } else if (currentQr) {
        ws.send(JSON.stringify({ type: 'qr', data: currentQr }));
    } else {
        ws.send(JSON.stringify({ type: 'status', data: 'disconnected' }));
    }
    
    ws.on('close', () => {
        console.log('Backend disconnected');
        clients.delete(ws);
    });
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/send-message', async (req, res) => {
    const { to, text } = req.body;
    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    logToFile(`[HTTP] Received request to send message to ${jid}`);

    if (!sock || currentStatus !== 'connected') {
        logToFile(`[HTTP] Failed: WhatsApp not connected (Status: ${currentStatus})`);
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }

    try {
        logToFile(`[HTTP] Calling Baileys sendMessage to ${jid}...`);
        
        // Add a timeout to ensure we don't hang the HTTP request forever
        const sendPromise = sock.sendMessage(jid, { text });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Baileys sendMessage timeout')), 15000)
        );

        const result = await Promise.race([sendPromise, timeoutPromise]);
        
        logToFile(`[HTTP] Baileys reported success for ${jid}. Result: ${JSON.stringify(result)}`);
        res.status(200).json({ success: true });
    } catch (err) {
        logToFile(`[HTTP] Send failed for ${jid}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/session/disconnect', async (req, res) => {
    if (sock) {
        try {
            await sock.logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    }
    res.status(200).json({ success: true });
});

app.post('/api/session/reconnect', async (req, res) => {
    if (sock) {
        sock.end();
    }
    // Delete session files
    const sessionsDir = path.join(__dirname, '..', 'whatsapp-sessions');
    if (fs.existsSync(sessionsDir)) {
        fs.rmSync(sessionsDir, { recursive: true, force: true });
        console.log('Session directory cleared.');
    }
    setTimeout(connectToWhatsApp, 1000);
    res.status(200).json({ success: true });
});

app.listen(3001, () => {
    console.log('REST API listening on port 3001');
});

console.log('WhatsApp Microservice started on port 3000.');

// Initialize the WhatsApp connection loop on startup
connectToWhatsApp();
