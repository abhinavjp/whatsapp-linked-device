# WhatsApp Linked Device Integration Design

## Overview
This document outlines the architecture and design for replacing the mocked WhatsApp Linked Device state management with a real, native implementation. The system will bridge an Angular 20 frontend and a legacy .NET Framework 4.7.2 Web API with a new Node.js microservice handling the actual WhatsApp Multi-Device protocol.

## Architecture & Data Flow

The system uses a Proxy/Gateway architectural pattern to ensure strict data isolation and security, keeping the .NET backend as the sole public-facing interface.

**Flow:** `Angular Frontend` <-> `.NET 4.7.2 Backend Proxy` <-> `Node.js Microservice` <-> `WhatsApp Servers`

### 1. Node.js WhatsApp Microservice
- **Location:** `whatsapp-service/`
- **Tech Stack:** Node.js, Express, `ws` (WebSockets), `@whiskeysockets/baileys`
- **Role:** Handles the official WhatsApp Noise protocol, cryptography, and connection management.
- **Responsibilities:**
  - Connect to WhatsApp servers.
  - Generate the QR code authentication string.
  - Parse and decrypt incoming messages.
  - Save cryptographic session state locally to `whatsapp-sessions/` via Baileys' file state.
- **Interface:** Exposes a local WebSocket server (e.g., `ws://localhost:3000`) meant *only* for the .NET backend.

### 2. .NET 4.7.2 Backend Proxy
- **Location:** `Backend/`
- **Role:** Acts as a secure proxy between the frontend and the microservice.
- **Responsibilities:**
  - `WhatsAppWebSocketMiddleware.cs` will be updated to act as a WebSocket pass-through.
  - Maintain the public WebSocket connection with the Angular client.
  - Connect a WebSocket client to the local Node.js microservice.
  - Relay QR codes, connection status updates, and messages transparently.
- **Design Principles:** 
  - Strictly adheres to SOLID principles.
  - Interfaces will be used to decouple proxy logic.
  - Full XML documentation for public members.

### 3. Angular 20 Frontend
- **Location:** `frontend/`
- **Role:** Display the real QR code and connection status.
- **Responsibilities:**
  - `connection.service.ts` will use the Observer/Pub-Sub pattern (via RxJS) to manage the socket stream.
  - Render the incoming authentication string as a scannable QR code using a library like `qrcode` or `angularx-qrcode`.
- **Design Principles:**
  - DRY: Reuse existing WebSocket models.
  - Full JSDoc documentation on components and services.

## Coding Standards & AI Context
- **SOLID, DRY, KISS** principles are strictly enforced across all 3 tiers.
- `CLAUDE.md` and `GEMINI.md` will be created at the project root to permanently store these guidelines, architectural decisions, and tech stack instructions for AI agents.
- Existing markdown files will be updated to reflect the introduction of the Node.js service.

## Testing & Verification
- Verify Node.js service generates valid auth strings.
- Verify .NET proxy correctly forwards WebSockets payloads without mutation.
- Verify Angular frontend renders scannable QR codes and reflects connection state successfully.
