const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const WebSocket = require('ws');
const pino = require('pino');
const path = require('path');

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', async (ws) => {
    console.log('Backend connected to WhatsApp microservice');
    
    // Auth state is stored in the project-wide whatsapp-sessions directory
    const sessionsDir = path.join(__dirname, '..', 'whatsapp-sessions');
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('New QR code generated');
            ws.send(JSON.stringify({ type: 'qr', data: qr }));
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            ws.send(JSON.stringify({ type: 'status', data: 'disconnected' }));
            
            if (shouldReconnect) {
                // Reconnection logic could be added here, but for now we let the next connection attempt trigger it
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened successfully');
            ws.send(JSON.stringify({ type: 'status', data: 'connected' }));
        }
    });

    ws.on('close', () => {
        console.log('Backend disconnected');
        // We don't close the WhatsApp socket here to allow it to stay connected in the background
    });
});

console.log('WhatsApp Microservice started on port 3000.');
