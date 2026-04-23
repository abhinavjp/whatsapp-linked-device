# WhatsApp Notification Feature Design

## 1. Context and Goals
The objective is to implement a feature to send WhatsApp messages (notifications) to specific numbers via the connected device. The UI will also be updated to clearly separate the setup phase (QR Code generation) from the active session phase, provide detailed connection status, and maintain a local history of sent messages. The system must be robust against server restarts.

## 2. Architecture: Hybrid REST + WebSocket
To ensure high resilience against server restarts while maintaining real-time capabilities:
- **WebSockets** will remain strictly for streaming unidirectional real-time events from the Node.js server down to the Angular frontend (QR codes, connection status, unexpected disconnects).
- **HTTP REST APIs** will be introduced for all commands from the Angular frontend to the server (Send Message, Reconnect, Disconnect). This ensures immediate failure feedback if a server restarts mid-command, avoiding silent message loss.

## 3. Node.js Microservice (`whatsapp-service`)
- **Express.js Integration**: Add `express` and `cors` to the existing service.
- **REST Endpoints**:
  - `POST /api/send-message`: Accepts `{ to: string, text: string }`. Calls `sock.sendMessage()` and returns HTTP 200 on success or 500/400 on failure.
  - `POST /api/session/reconnect`: Triggers a session disconnect and deletion of auth state, then restarts the WhatsApp connection loop to generate a new QR.
  - `POST /api/session/disconnect`: Disconnects the active session cleanly.
- **Logging**: Enhance the `pino` logger usage to exhaustively log HTTP requests, message payloads (excluding sensitive data if needed), and Baileys socket events for easier troubleshooting.

## 4. .NET Proxy Backend (`Backend`)
- **API Controllers**: Create a `WhatsAppController.cs`.
- **Proxy Endpoints**: Implement `POST /api/whatsapp/send`, `POST /api/whatsapp/reconnect`, and `POST /api/whatsapp/disconnect`. These endpoints will act as simple HTTP proxies, forwarding the requests via `HttpClient` to the Node.js microservice (`http://localhost:3000`).
- **Resilience**: Ensure proper timeout and error handling when calling the Node.js service, returning appropriate HTTP status codes to the frontend.

## 5. Angular Frontend (`frontend`)
- **Resilience / Reconnection Logic**: Update `ConnectionService` to attempt WebSocket reconnection every 3-5 seconds if the connection drops. The UI will reflect a "Reconnecting..." state.
- **UI Layout Split**:
  - **Setup View**: Displayed when `isConnected` is false or when a QR code is active. Shows connection instructions and the QR code.
  - **Session View**: Displayed when successfully connected to WhatsApp.
- **Session View Components**:
  - **Header**: Displays the current connection status (e.g., "Connected - Ready", "Issue: Network Drop"), session metadata (like connected phone if available), and buttons for **Reconnect** and **Disconnect**.
  - **Notification Form**: Inputs for Phone Number and Message Text, plus a Send button. Form disables while sending.
  - **Local History Log**: A list below the form displaying messages sent during the current browser session. Each entry shows the destination number, message snippet, timestamp, and live status (`Sending...`, `Sent ✅`, `Failed ❌: [reason]`).

## 6. Edge Cases & Error Handling
- **Server Restart**: If the Node/ .NET server restarts while sending, the HTTP POST fails. The frontend catches the error, marks the message as `Failed` in the history, and allows the user to retry once the WebSocket reconnects.
- **Invalid Number**: If WhatsApp rejects the number, the Node.js service catches the Baileys error and returns an HTTP 400 with the error detail, which is displayed in the frontend history log.
