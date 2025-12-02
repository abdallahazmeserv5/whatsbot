# Backend Quick Reference Guide

## 🚀 Quick Start

### Server Initialization
```typescript
// Entry point: src/server.ts
1. Express app created
2. WhatsAppManager initialized
3. Services initialized
4. Database connected
5. Routes registered
6. Server starts on port 3000
```

## 📁 Project Structure

```
src/
├── server.ts              # Main Express server
├── WhatsAppManager.ts     # Manages all WhatsApp clients
├── WhatsAppClient.ts      # Single WhatsApp session wrapper
├── SessionManager.ts      # Session persistence
├── data-source.ts         # TypeORM database config
│
├── services/              # Business logic layer
│   ├── SenderManager.ts      # Sender management & health
│   ├── CampaignManager.ts    # Campaign orchestration
│   ├── BulkMessageService.ts # Parallel bulk messaging
│   ├── BroadcastService.ts   # Broadcast list management
│   ├── AutoReplyService.ts   # Auto-reply system
│   └── FlowExecutor.ts       # Flow automation engine
│
├── routes/                # API route handlers
│   ├── senderRoutes.ts
│   ├── campaignRoutes.ts
│   └── autoReplyRoutes.ts
│
├── entities/              # Database models
│   ├── Sender.ts
│   ├── Campaign.ts
│   ├── CampaignContact.ts
│   ├── Flow.ts
│   ├── FlowExecution.ts
│   └── ...
│
├── queues/                # Queue definitions
│   └── flowQueue.ts
│
└── workers/               # Background workers
    └── messageWorker.ts
```

## 🔑 Core Components

### WhatsAppManager
- **Purpose**: Central manager for all WhatsApp sessions
- **Key Methods**:
  - `startSession()` - Initialize new session
  - `sendMessage()` - Send single message
  - `sendBulkMessage()` - Send multiple messages
  - `broadcastMessage()` - Broadcast to all sessions

### SenderManager
- **Purpose**: Enterprise sender management
- **Features**: Health scoring, quota management, round-robin selection
- **Key Methods**:
  - `getNextHealthySender()` - Get best available sender
  - `hasAvailableQuota()` - Check quota limits
  - `updateHealth()` - Update sender health metrics

### CampaignManager
- **Purpose**: Campaign lifecycle management
- **Features**: Scheduling, personalization, status tracking
- **Key Methods**:
  - `createCampaign()` - Create new campaign
  - `startCampaign()` - Queue campaign messages
  - `getCampaignStats()` - Get campaign statistics

## 📊 Database Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Sender** | WhatsApp sender account | status, healthScore, quotaPerMinute/Hour/Day |
| **Campaign** | Marketing campaign | status, template, totalRecipients |
| **CampaignContact** | Campaign recipient | status, variables, phoneNumber |
| **Flow** | Automation workflow | nodes, edges, keywords, isActive |
| **FlowExecution** | Active flow instance | currentNodeId, variables, status |
| **AutoReplyConfig** | Auto-reply settings | isActive, senderNumber, messageContent |
| **BroadcastList** | Broadcast list | name, totalMembers, sessionId |
| **BroadcastGroup** | Broadcast chunk (256 max) | members, memberCount |

## 🛣️ API Endpoints

### Sender Management
```
GET    /api/senders              # List all senders
POST   /api/senders              # Create sender
GET    /api/senders/:id          # Get sender details
POST   /api/senders/:id/connect  # Connect sender (get QR)
GET    /api/senders/:id/qr       # Get QR code
GET    /api/senders/:id/stats    # Get sender statistics
DELETE /api/senders/:id          # Delete sender
```

### Campaign Management
```
GET    /api/campaigns            # List all campaigns
POST   /api/campaigns            # Create campaign
GET    /api/campaigns/:id        # Get campaign details
POST   /api/campaigns/:id/start  # Start campaign
POST   /api/campaigns/:id/pause  # Pause campaign
POST   /api/campaigns/:id/resume # Resume campaign
GET    /api/campaigns/:id/stats  # Get campaign statistics
DELETE /api/campaigns/:id        # Delete campaign
```

### Auto-Reply
```
GET    /api/auto-reply           # Get configuration
POST   /api/auto-reply           # Update configuration
```

### Direct Messaging
```
POST   /message/send             # Send single message
POST   /message/send-bulk        # Send bulk messages
POST   /whatsapp/bulk-send       # Bulk send (service)
```

### Broadcast Lists
```
POST   /whatsapp/broadcast/create      # Create broadcast list
GET    /whatsapp/broadcast             # List all broadcasts
GET    /whatsapp/broadcast/:id         # Get broadcast details
POST   /whatsapp/broadcast/:id/send    # Send to broadcast list
DELETE /whatsapp/broadcast/:id         # Delete broadcast list
```

### Flow Management
```
POST   /flows                    # Create flow
GET    /flows                    # List all flows
PATCH  /flows/:id/toggle         # Toggle flow active status
GET    /flows/:id/executions     # Get flow executions
```

## 🔄 Common Flows

### 1. Connect a Sender
```
1. POST /api/senders (create sender)
2. POST /api/senders/:id/connect
3. GET /api/senders/:id/qr (get QR code)
4. Scan QR with WhatsApp
5. Status becomes "connected"
```

### 2. Create and Run Campaign
```
1. POST /api/campaigns (create with contacts)
2. POST /api/campaigns/:id/start
3. Messages queued in BullMQ
4. Message worker processes queue
5. Messages sent with delays
6. Status tracked per contact
```

### 3. Setup Auto-Reply
```
1. POST /api/auto-reply
   {
     "isActive": true,
     "senderNumber": "session-id",
     "messageContent": "Thank you!"
   }
2. Incoming messages trigger auto-reply
3. Reply sent after 2-second delay
```

### 4. Execute Flow
```
1. POST /flows (create flow with nodes)
2. Set keywords: ["hello", "hi"]
3. Flow triggers on keyword match
4. Nodes execute sequentially
5. Delay nodes scheduled in queue
6. Variables substituted in messages
```

## 🎯 Service Strategies

### BulkMessageService
- **Strategy**: Promise.all() - ALL messages fire simultaneously
- **Use Case**: Urgent broadcasts, maximum speed
- **Warning**: No throttling, use with caution

### BroadcastService
- **Strategy**: Groups of 256, 10-second delay between groups
- **Use Case**: Large-scale broadcasts with rate limit protection
- **Safety**: Built-in delays prevent bans

### CampaignManager
- **Strategy**: BullMQ queue with random delays (minDelay-maxDelay)
- **Use Case**: Scheduled campaigns with personalization
- **Features**: Typing simulation, health-aware sender selection

## 🔧 Configuration

### Environment Variables
```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
```

### Sender Quotas (Default)
- Per Minute: 20 messages
- Per Hour: 500 messages
- Per Day: 5000 messages

### Campaign Delays (Default)
- Min Delay: 2000ms (2 seconds)
- Max Delay: 5000ms (5 seconds)

## 📈 Health Monitoring

### Sender Health Score
- **Range**: 0-100
- **Increases**: +1 on success
- **Decreases**: -5 on failure
- **Auto-Pause**: After 10 consecutive failures
- **Skip Threshold**: Health < 50

### Campaign Status
- **draft**: Created but not started
- **running**: Messages being sent
- **paused**: Temporarily stopped
- **completed**: All messages processed
- **failed**: Campaign errors

## 🐛 Troubleshooting

### Session Not Connecting
- Check QR code is scanned
- Verify session files in `sessions/` directory
- Check console for connection errors

### Messages Not Sending
- Verify sender is "connected"
- Check sender quota limits
- Verify health score > 50
- Check for consecutive failures

### Campaign Stuck
- Check Redis connection
- Verify message worker is running
- Check campaign status in database
- Review worker logs

### Auto-Reply Not Working
- Verify `isActive = true` in config
- Check sender session is connected
- Verify message content is set
- Check console logs for errors

## 🔍 Debugging Tips

1. **Check Sender Health**:
   ```typescript
   GET /api/senders/:id/stats
   ```

2. **Check Campaign Progress**:
   ```typescript
   GET /api/campaigns/:id/stats
   ```

3. **View Flow Executions**:
   ```typescript
   GET /flows/:id/executions
   ```

4. **Monitor Queue**:
   - Check Redis for queued jobs
   - Review worker console logs
   - Check BullMQ dashboard (if available)

## 📚 Key Concepts

### Round-Robin Selection
Senders selected in rotation based on `lastUsed` timestamp, ensuring even distribution.

### Health-Aware Routing
Only healthy senders (score > 50, no consecutive failures, quota available) are selected.

### Variable Substitution
- `{{contact.name}}` - Contact name
- `{{contact.phoneNumber}}` - Phone number
- `{{flow.message}}` - Incoming message
- `{{flow.httpResponse}}` - HTTP response data

### Typing Simulation
Messages include typing indicators before sending, with duration based on message length.

### Staggered Delays
Campaign messages queued with random delays between minDelay and maxDelay to appear natural.

---

For detailed documentation, see [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md)

