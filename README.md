# WhatsApp Linked Device - Native Integration

This project implements a native WhatsApp Multi-Device (MD) gateway using a tri-tier architecture.

## Architecture

The system follows a **Proxy/Gateway pattern** to maintain security and data isolation:

1.  **Frontend (Angular 20)**: Connects to the .NET backend via WebSockets. Renders QR codes and displays connection status.
2.  **Backend Proxy (.NET Framework 4.7.2)**: Acts as a secure intermediary. Proxies WebSocket traffic between the frontend and the internal microservice.
3.  **WhatsApp Microservice (Node.js)**: Runs internally. Uses the `@whiskeysockets/baileys` library to handle the actual WhatsApp protocol, cryptography, and session management.

## Setup & Running

### 1. WhatsApp Microservice
```bash
cd whatsapp-service
npm install
node index.js
```

### 2. .NET Backend
Run the backend using Visual Studio or the provided `run.bat`. It will run on `http://localhost:9000`.

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

## AI Guidelines
- `CLAUDE.md`: Context and standards for Claude-based agents.
- `GEMINI.md`: Context and standards for Gemini-based agents.

## Principles
- **SOLID**: Each component has a single responsibility.
- **DRY**: Shared models and services.
- **KISS**: Simple WebSocket proxying without unnecessary complexity.
