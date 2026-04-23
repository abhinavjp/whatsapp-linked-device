# WhatsApp Notification Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a WhatsApp notification form with local history, split the UI into setup/session views, and introduce robust REST endpoints for message sending.

**Architecture:** Hybrid approach where WebSockets stream live status/QRs, while HTTP REST endpoints handle commands (send message, reconnect, disconnect) to ensure resilience during server restarts.

**Tech Stack:** Angular 20, .NET Framework 4.7.2 (Web API), Node.js (Express/Baileys).

---

## User Review Required
Please review the task breakdown below. Once approved, we will execute it task-by-task.

## Proposed Changes

### Node.js Microservice (`whatsapp-service`)
#### [MODIFY] [package.json](file:///d:/Projects/whatsapp-linked-device/whatsapp-service/package.json)
#### [MODIFY] [index.js](file:///d:/Projects/whatsapp-linked-device/whatsapp-service/index.js)

### .NET Proxy (`Backend`)
#### [NEW] [WhatsAppController.cs](file:///d:/Projects/whatsapp-linked-device/Backend/Controllers/WhatsAppController.cs)
#### [MODIFY] [Backend.csproj](file:///d:/Projects/whatsapp-linked-device/Backend/Backend.csproj)

### Angular Frontend (`frontend`)
#### [MODIFY] [connection.service.ts](file:///d:/Projects/whatsapp-linked-device/frontend/src/app/services/connection.service.ts)
#### [MODIFY] [app.ts](file:///d:/Projects/whatsapp-linked-device/frontend/src/app/app.ts)
#### [MODIFY] [app.html](file:///d:/Projects/whatsapp-linked-device/frontend/src/app/app.html)
#### [MODIFY] [app.css](file:///d:/Projects/whatsapp-linked-device/frontend/src/app/app.css)

---

### Task 1: Node.js Microservice REST Endpoints

**Files:**
- Modify: `whatsapp-service/package.json`
- Modify: `whatsapp-service/index.js`

- [ ] **Step 1: Install Express and CORS**
```bash
cd whatsapp-service
npm install express cors
```

- [ ] **Step 2: Add REST server to `index.js`**
Add Express server and endpoints to `whatsapp-service/index.js`.
```javascript
// Add at the top
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Add near the websocket server setup
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/send-message', async (req, res) => {
    const { to, text } = req.body;
    if (!sock || currentStatus !== 'connected') {
        return res.status(400).json({ error: 'WhatsApp not connected' });
    }
    try {
        const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        console.log(`[HTTP] Sent message to ${jid}`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('[HTTP] Send failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/session/disconnect', async (req, res) => {
    if (sock) {
        sock.logout();
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
    }
    setTimeout(connectToWhatsApp, 1000);
    res.status(200).json({ success: true });
});

app.listen(3001, () => {
    console.log('REST API listening on port 3001');
});
```

- [ ] **Step 3: Commit**
```bash
git add whatsapp-service/package.json whatsapp-service/package-lock.json whatsapp-service/index.js
git commit -m "feat: add express rest endpoints to node microservice"
```

### Task 2: .NET Proxy API Controllers

**Files:**
- Create: `Backend/Controllers/WhatsAppController.cs`
- Modify: `Backend/Backend.csproj` (if using standard .NET Framework structure, file needs to be included, though Visual Studio handles this, we can just create the file).

- [ ] **Step 1: Create WhatsAppController**
```csharp
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;
using System.Text;

namespace Backend.Controllers
{
    [RoutePrefix("api/whatsapp")]
    public class WhatsAppController : ApiController
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private const string NodeBaseUrl = "http://localhost:3001/api";

        [HttpPost]
        [Route("send")]
        public async Task<IHttpActionResult> SendMessage([FromBody] dynamic payload)
        {
            var content = new StringContent(Newtonsoft.Json.JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/send-message", content);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }

        [HttpPost]
        [Route("disconnect")]
        public async Task<IHttpActionResult> Disconnect()
        {
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/session/disconnect", null);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }

        [HttpPost]
        [Route("reconnect")]
        public async Task<IHttpActionResult> Reconnect()
        {
            var response = await _httpClient.PostAsync($"{NodeBaseUrl}/session/reconnect", null);
            var responseString = await response.Content.ReadAsStringAsync();
            return Content(response.StatusCode, responseString);
        }
    }
}
```

- [ ] **Step 2: Commit**
```bash
git add Backend/Controllers/WhatsAppController.cs
git commit -m "feat: add whatsapp proxy controller in dotnet"
```

### Task 3: Angular Frontend Connection Service

**Files:**
- Modify: `frontend/src/app/services/connection.service.ts`

- [ ] **Step 1: Update ConnectionService with HTTP methods**
Update the service to import `HttpClient` and add methods for `sendMessage`, `reconnect`, and `disconnectServer`. Update reconnect logic in the websocket observable.

- [ ] **Step 2: Commit**
```bash
git add frontend/src/app/services/connection.service.ts
git commit -m "feat: add http methods to connection service"
```

### Task 4: Angular Frontend UI (app.ts / app.html)

**Files:**
- Modify: `frontend/src/app/app.ts`
- Modify: `frontend/src/app/app.html`
- Modify: `frontend/src/app/app.css`

- [ ] **Step 1: Update app.ts**
Add state variables: `phoneNumber`, `messageText`, `messageHistory` (array of objects with `id, to, text, status`). Add methods `sendMessage`, `triggerReconnect`, `triggerDisconnect`. 

- [ ] **Step 2: Update app.html**
Split UI using `*ngIf="isConnected && !qrData"` for Session View vs Setup View.
Session View:
- Header with Reconnect/Disconnect buttons.
- Form section (input for number, textarea for text).
- History section (ngFor over `messageHistory`).

- [ ] **Step 3: Update app.css**
Add styles for the new grid/flex layouts, history cards, and status indicators.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/app/app.ts frontend/src/app/app.html frontend/src/app/app.css
git commit -m "feat: implement notification form and history ui"
```

## Verification Plan
1. Restart .NET backend and Node.js microservice.
2. Start Angular frontend.
3. Verify Setup screen shows QR.
4. Scan QR, verify it switches to Session view.
5. Send a message to a valid number, verify history shows "Sending..." then "Sent".
6. Verify message is delivered on WhatsApp.
7. Click "Reconnect" and verify it drops session and generates a new QR code.
