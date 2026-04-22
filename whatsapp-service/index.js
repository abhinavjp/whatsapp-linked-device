const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.send(JSON.stringify({ type: 'status', data: 'connected to nodejs' }));
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

console.log('WhatsApp Node.js Microservice running on ws://localhost:3000');
