# Backend Documentation - WhatsApp Automation System

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Services Layer](#services-layer)
5. [Database Entities](#database-entities)
6. [API Routes](#api-routes)
7. [Queue System](#queue-system)
8. [Workers](#workers)
9. [How Everything Works Together](#how-everything-works-together)
10. [Code Flow Examples](#code-flow-examples)
11. [Configuration](#configuration)

---

## Project Overview

This is a **WhatsApp Automation System** built with Node.js, TypeScript, Express, and Baileys (WhatsApp Web API). The system provides:

- **Multi-session WhatsApp Management**: Connect and manage multiple WhatsApp accounts
- **Bulk Messaging**: Send messages to large numbers of recipients
- **Campaign Management**: Create, schedule, and manage marketing campaigns
- **Auto-Reply System**: Automated responses to incoming messages
- **Flow Builder**: Visual workflow automation with conditions, delays, HTTP requests, and emails
- **Sender Management**: Enterprise-grade sender management with health monitoring and quota management
- **Broadcast Lists**: Create and manage broadcast lists for group messaging

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                          │
│                    (src/server.ts)                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
│   Routes     │ │  Services   │ │  Workers   │
│              │ │             │ │            │
│ - Senders    │ │ - Sender    │ │ - Message  │
│ - Campaigns  │ │ - Campaign  │ │   Worker   │
│ - Auto-Reply │ │ - Bulk      │ │ - Flow     │
│              │ │ - Broadcast  │ │   Worker   │
│              │ │ - Flow      │ │            │
└───────┬──────┘ └──────┬───────┘ └─────┬──────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │    WhatsAppManager            │
        │  (Manages all WhatsApp        │
        │   client connections)          │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │    WhatsAppClient              │
        │  (Baileys Socket Connection)  │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │    SessionManager              │
        │  (Handles session storage)     │
        └───────────────┬───────────────┘
                        │
        ┌───────────────▼───────────────┐
        │    TypeORM + PostgreSQL        │
        │    (Database Layer)            │
        └───────────────────────────────┘
```

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WhatsApp Library**: @whiskeysockets/baileys
- **ORM**: TypeORM
- **Database**: PostgreSQL (Neon)
- **Queue System**: BullMQ (Redis)
- **Email**: Nodemailer

---

## Core Components

### 1. WhatsAppManager (`src/WhatsAppManager.ts`)

**Purpose**: Central manager for all WhatsApp client connections.

**Key Responsibilities**:
- Manages multiple WhatsApp client instances (one per session)
- Handles session lifecycle (start, stop, delete)
- Routes messages to appropriate clients
- Coordinates bulk messaging and broadcasting
- Integrates with FlowExecutor and AutoReplyService

**Key Methods**:
```typescript
- startSession(sessionId, qrCallback, statusCallback): Initialize a new WhatsApp session
- sendMessage(sessionId, to, text): Send a single message
- sendBulkMessage(sessionId, recipients, text, delayMs): Send multiple messages with delays
- broadcastMessage(recipients, text, delayMs): Broadcast to all connected sessions
- deleteSession(sessionId): Remove and cleanup a session
```

**Internal Structure**:
- `clients: Map<string, WhatsAppClient>` - Stores active client instances
- `sessionManager: SessionManager` - Handles session persistence
- `flowExecutor: FlowExecutor` - Executes automation flows
- `autoReplyService: AutoReplyService` - Handles auto-replies

### 2. WhatsAppClient (`src/WhatsAppClient.ts`)

**Purpose**: Wrapper around Baileys socket connection for a single WhatsApp session.

**Key Responsibilities**:
- Establishes and maintains WebSocket connection to WhatsApp
- Handles QR code generation for authentication
- Manages connection state (connecting, connected, disconnected)
- Processes incoming messages
- Sends outgoing messages

**Key Methods**:
```typescript
- initialize(): Set up Baileys socket with authentication
- sendMessage(to, text): Send a WhatsApp message
- destroy(): Clean up connection and logout
```

**Event Handlers**:
- `connection.update`: Monitors connection state changes
- `messages.upsert`: Receives incoming messages
- `creds.update`: Saves authentication credentials

### 3. SessionManager (`src/SessionManager.ts`)

**Purpose**: Manages WhatsApp session persistence and authentication state.

**Key Responsibilities**:
- Stores session authentication data in filesystem
- Loads saved sessions on startup
- Deletes session data when sessions are removed

**Key Methods**:
```typescript
- getAuthState(sessionId): Load authentication state for a session
- deleteSession(sessionId): Remove session files
```

**Storage**: Sessions are stored in `sessions/` directory, one folder per session ID.

---

## Services Layer

The services layer contains business logic for different features. Each service is independent and can be used by routes or other services.

### 1. SenderManager (`src/services/SenderManager.ts`)

**Purpose**: Enterprise-grade sender management with health monitoring, quota management, and load balancing.

**Key Features**:
- **Health Scoring**: Tracks sender health (0-100 score)
- **Quota Management**: Enforces per-minute, per-hour, and per-day limits
- **Round-Robin Selection**: Distributes load evenly across healthy senders
- **Auto-Pause**: Automatically pauses senders with too many failures
- **Session Restoration**: Restores sender sessions on server startup

**Key Methods**:
```typescript
- createSender(data): Create a new sender account
- connectSender(senderId): Start WhatsApp connection for a sender
- getNextHealthySender(): Get the best available sender (round-robin)
- hasAvailableQuota(sender): Check if sender can send more messages
- incrementUsage(senderId): Update usage counters
- updateHealth(senderId, success): Update health metrics
- getSenderStats(senderId): Get statistics for a sender
```

**Sender Entity Fields**:
- `quotaPerMinute/Hour/Day`: Rate limits
- `sentThisMinute/Hour/Day`: Current usage counters
- `healthScore`: 0-100 health rating
- `successCount/failureCount`: Success/failure tracking
- `consecutiveFailures`: Tracks consecutive failures
- `status`: connected, disconnected, banned, paused

**Health Check Logic**:
- Senders with health score < 50 are skipped
- Senders with consecutive failures >= 5 are skipped
- Senders with exceeded quotas are skipped
- Auto-pause after 10 consecutive failures

### 2. CampaignManager (`src/services/CampaignManager.ts`)

**Purpose**: Manages marketing campaigns with scheduling, personalization, and tracking.

**Key Features**:
- **Contact Management**: Stores and manages campaign recipients
- **Blocklist Filtering**: Automatically filters blocked numbers
- **Scheduling**: Supports scheduled start/end times and time windows
- **Personalization**: Variable substitution in messages ({{name}}, {{phone}})
- **Status Tracking**: Tracks sent, delivered, read, failed statuses
- **Queue Integration**: Uses BullMQ to queue messages with delays

**Key Methods**:
```typescript
- createCampaign(data): Create campaign with contacts
- startCampaign(campaignId): Queue all campaign messages
- pauseCampaign(campaignId): Pause running campaign
- resumeCampaign(campaignId): Resume paused campaign
- getCampaignStats(campaignId): Get campaign statistics
- updateContactStatus(contactId, status): Update individual contact status
```

**Campaign Lifecycle**:
1. **Draft**: Campaign created but not started
2. **Running**: Messages being sent
3. **Paused**: Temporarily stopped
4. **Completed**: All messages processed
5. **Failed**: Campaign encountered errors

**Message Queuing**:
- Messages are queued with staggered delays (minDelay to maxDelay)
- Random delays prevent rate limiting
- Uses BullMQ for reliable message delivery

### 3. BulkMessageService (`src/services/BulkMessageService.ts`)

**Purpose**: High-performance bulk messaging with parallel execution.

**Key Features**:
- **Parallel Execution**: Sends all messages simultaneously using Promise.all()
- **No Throttling**: Designed for maximum speed (use with caution)
- **Error Resilience**: Continues on individual failures
- **Progress Tracking**: Logs progress every 50 messages

**Key Methods**:
```typescript
- sendBulkMessages(request): Send messages to multiple recipients in parallel
```

**Strategy**:
- Fires ALL messages at once (no delays)
- Each message is sent independently
- Failures don't stop other messages
- Returns detailed results for each recipient

**Use Case**: Best for urgent broadcasts where speed is critical.

### 4. BroadcastService (`src/services/BroadcastService.ts`)

**Purpose**: Manages broadcast lists with automatic chunking.

**Key Features**:
- **Automatic Chunking**: Splits large lists into groups of 256 (WhatsApp limit)
- **Group Management**: Creates and manages broadcast groups
- **Staggered Sending**: 10-second delay between groups, parallel within groups

**Key Methods**:
```typescript
- createBroadcastList(request): Create broadcast list with automatic chunking
- sendToBroadcastList(broadcastListId, request): Send to all groups
- getAllBroadcastLists(): Get all broadcast lists
- deleteBroadcastList(id): Remove broadcast list
```

**Sending Strategy**:
1. Split recipients into groups of 256
2. Send to all 256 recipients in a group simultaneously
3. Wait 10 seconds before next group
4. Repeat until all groups are sent

**Use Case**: Best for large-scale broadcasts with rate limit protection.

### 5. AutoReplyService (`src/services/AutoReplyService.ts`)

**Purpose**: Automated reply system for incoming messages.

**Key Features**:
- **Configurable Messages**: Set custom auto-reply messages
- **Sender Selection**: Can use different sender than receiving session
- **Active/Inactive Toggle**: Enable/disable auto-replies
- **Delay Support**: Configurable delay before sending reply

**Key Methods**:
```typescript
- handleIncomingMessage(sessionId, from, text): Process incoming message
- getConfig(): Get current auto-reply configuration
- updateConfig(data): Update auto-reply settings
```

**Configuration**:
- `isActive`: Enable/disable auto-reply
- `senderNumber`: Session ID to use for sending (can differ from receiving session)
- `messageContent`: Message to send as auto-reply

**Flow**:
1. Message received on session A
2. Auto-reply service triggered
3. Reply sent from session B (if configured) or session A
4. 2-second delay before sending (configurable)

### 6. FlowExecutor (`src/services/FlowExecutor.ts`)

**Purpose**: Executes visual workflow automation flows.

**Key Features**:
- **Node Execution**: Processes different node types (message, condition, delay, HTTP, email)
- **Variable Substitution**: Supports {{contact.name}}, {{flow.data}} syntax
- **Conditional Logic**: Branch flows based on message content
- **Delayed Execution**: Uses BullMQ for delayed node execution
- **HTTP Integration**: Makes external API calls
- **Email Integration**: Sends emails via SMTP

**Node Types**:
1. **Start Node**: Entry point for flows
2. **Message Node**: Sends WhatsApp message
3. **Condition Node**: Branches based on message content
4. **Delay Node**: Waits before continuing
5. **HTTP Request Node**: Calls external APIs
6. **Email Node**: Sends emails

**Key Methods**:
```typescript
- handleIncomingMessage(sessionId, from, text): Trigger flows on keyword match
- startFlow(flowId, contactId, triggerData): Start a flow execution
- executeNode(executionId, nodeId): Execute a specific node
```

**Variable System**:
- `{{contact.name}}`: Contact name
- `{{contact.phoneNumber}}`: Contact phone number
- `{{flow.message}}`: Incoming message
- `{{flow.httpResponse}}`: HTTP response data
- `{{flow.data}}`: Custom flow variables

---

## Database Entities

### Core Entities

#### 1. Sender (`src/entities/Sender.ts`)
Represents a WhatsApp sender account.

**Fields**:
- `id`: UUID primary key
- `name`: Unique sender name
- `phoneNumber`: Unique phone number
- `status`: connected | disconnected | banned | paused
- `sessionData`: Encrypted Baileys session JSON
- `quotaPerMinute/Hour/Day`: Rate limits
- `sentThisMinute/Hour/Day`: Current usage
- `healthScore`: 0-100 health rating
- `successCount/failureCount`: Statistics
- `consecutiveFailures`: Failure tracking
- `isActive`: Active flag

#### 2. Campaign (`src/entities/Campaign.ts`)
Represents a marketing campaign.

**Fields**:
- `id`: UUID primary key
- `name`: Campaign name
- `status`: draft | scheduled | running | paused | completed | failed
- `template`: Message template with variables
- `totalRecipients`: Total number of recipients
- `processedCount/successCount/failedCount`: Statistics
- `scheduledStart/End`: Scheduled times
- `timeWindowStart/End`: Allowed sending hours
- `minDelay/maxDelay`: Delay range in milliseconds
- `enableTyping`: Typing simulation flag
- `senderIds`: Array of assigned sender IDs

#### 3. CampaignContact (`src/entities/CampaignContact.ts`)
Represents a recipient in a campaign.

**Fields**:
- `id`: UUID primary key
- `campaignId`: Foreign key to Campaign
- `phoneNumber`: Recipient phone number
- `variables`: JSON object for personalization
- `status`: pending | queued | sent | delivered | read | failed
- `sentAt/deliveredAt/readAt/failedAt`: Timestamps
- `errorMessage`: Error details if failed
- `attemptCount`: Number of send attempts

#### 4. Flow (`src/entities/Flow.ts`)
Represents a visual automation flow.

**Fields**:
- `id`: UUID primary key
- `name`: Flow name
- `description`: Flow description
- `triggerType`: keyword | message | event
- `keywords`: Array of trigger keywords
- `nodes`: JSON array of ReactFlow nodes
- `edges`: JSON array of ReactFlow edges
- `isActive`: Active flag

#### 5. FlowExecution (`src/entities/FlowExecution.ts`)
Represents an active flow execution.

**Fields**:
- `id`: UUID primary key
- `flow`: Foreign key to Flow
- `contact`: Foreign key to Contact
- `currentNodeId`: Current node being executed
- `variables`: JSON object for flow variables
- `status`: running | completed | failed
- `startedAt/completedAt`: Timestamps

#### 6. AutoReplyConfig (`src/entities/AutoReplyConfig.ts`)
Stores auto-reply configuration.

**Fields**:
- `id`: UUID primary key
- `isActive`: Enable/disable flag
- `senderNumber`: Session ID for sending replies
- `messageContent`: Auto-reply message text

#### 7. BroadcastList (`src/entities/BroadcastList.ts`)
Represents a broadcast list.

**Fields**:
- `id`: UUID primary key
- `name`: List name
- `sessionId`: WhatsApp session ID
- `totalMembers`: Total number of members
- `groups`: Relation to BroadcastGroup entities

#### 8. BroadcastGroup (`src/entities/BroadcastGroup.ts`)
Represents a chunk of a broadcast list (max 256 members).

**Fields**:
- `id`: UUID primary key
- `broadcastListId`: Foreign key to BroadcastList
- `broadcastJid`: WhatsApp broadcast JID
- `members`: Array of phone numbers
- `memberCount`: Number of members

#### 9. Contact (`src/entities/Contact.ts`)
Represents a contact in the system.

**Fields**:
- `id`: UUID primary key
- `phoneNumber`: Contact phone number
- `name`: Contact name

#### 10. Blocklist (`src/entities/Blocklist.ts`)
Stores blocked phone numbers.

**Fields**:
- `id`: UUID primary key
- `phoneNumber`: Blocked phone number
- `reason`: Reason for blocking

#### 11. MessageLog (`src/entities/MessageLog.ts`)
Logs all sent messages.

**Fields**:
- `id`: UUID primary key
- `campaignId`: Associated campaign
- `contactId`: Recipient contact
- `senderId`: Sender used
- `message`: Message content
- `status`: sent | delivered | read | failed
- `sentAt`: Timestamp

---

## API Routes

### Server Entry Point (`src/server.ts`)

The main Express server that initializes all components and sets up routes.

**Initialization Flow**:
1. Create Express app with CORS and JSON parsing
2. Initialize WhatsAppManager
3. Initialize all services (BulkMessageService, BroadcastService, SenderManager, CampaignManager, AutoReplyService)
4. Initialize database connection (TypeORM)
5. Restore all sender sessions
6. Set up routes
7. Start server

### Route Modules

#### 1. Sender Routes (`src/routes/senderRoutes.ts`)
**Base Path**: `/api/senders`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all senders |
| GET | `/active` | Get active senders |
| GET | `/:id` | Get sender by ID |
| POST | `/` | Create new sender |
| DELETE | `/:id` | Delete sender |
| GET | `/:id/stats` | Get sender statistics |
| POST | `/:id/connect` | Connect sender (start WhatsApp session) |
| GET | `/:id/qr` | Get QR code for sender |

#### 2. Campaign Routes (`src/routes/campaignRoutes.ts`)
**Base Path**: `/api/campaigns`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all campaigns |
| GET | `/:id` | Get campaign by ID |
| POST | `/` | Create new campaign |
| POST | `/:id/start` | Start campaign |
| POST | `/:id/pause` | Pause campaign |
| POST | `/:id/resume` | Resume campaign |
| DELETE | `/:id` | Delete campaign |
| GET | `/:id/stats` | Get campaign statistics |

#### 3. Auto-Reply Routes (`src/routes/autoReplyRoutes.ts`)
**Base Path**: `/api/auto-reply`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get auto-reply configuration |
| POST | `/` | Update auto-reply configuration |

### Direct Server Routes

These routes are defined directly in `server.ts`:

#### Session Management
- `POST /session/start` - Start a WhatsApp session
- `GET /session/:sessionId/qr` - Get QR code for session
- `GET /session/:sessionId/status` - Get session status
- `GET /sessions` - Get all sessions
- `DELETE /session/:sessionId` - Delete session

#### Messaging
- `POST /message/send` - Send a single message
- `POST /message/send-bulk` - Send bulk messages
- `POST /message/send-all` - Broadcast to all sessions

#### Flow Management
- `POST /flows` - Create a flow
- `GET /flows` - Get all flows
- `PATCH /flows/:id/toggle` - Toggle flow active status
- `GET /flows/:id/executions` - Get flow executions

#### Bulk Messaging
- `POST /whatsapp/bulk-send` - Send bulk messages via BulkMessageService

#### Broadcast Lists
- `POST /whatsapp/broadcast/create` - Create broadcast list
- `GET /whatsapp/broadcast` - Get all broadcast lists
- `GET /whatsapp/broadcast/:id` - Get broadcast list by ID
- `POST /whatsapp/broadcast/:id/send` - Send to broadcast list
- `DELETE /whatsapp/broadcast/:id` - Delete broadcast list

---

## Queue System

### Flow Queue (`src/queues/flowQueue.ts`)

**Purpose**: Handles delayed execution of flow nodes (DelayNode).

**Technology**: BullMQ with Redis

**Features**:
- Optional Redis (can be disabled)
- Delayed job execution
- Job retry with exponential backoff

**Queue Name**: `flow-execution`

**Job Data**:
```typescript
{
  executionId: string,
  nodeId: string
}
```

**Usage**: When a DelayNode is encountered, the next node is scheduled with a delay.

### Message Queue (Campaign Worker)

**Purpose**: Processes campaign messages with rate limiting and retry logic.

**Technology**: BullMQ with Redis

**Queue Name**: `message-queue`

**Job Data**:
```typescript
{
  contactId: string,
  campaignId: string,
  message: string,
  variables?: Record<string, string>,
  senderIds?: string[] | null
}
```

**Features**:
- Concurrency: 5 messages simultaneously
- Rate Limiting: 20 jobs per minute (global)
- Retry: 3 attempts with exponential backoff
- Typing simulation
- Health-aware sender selection

---

## Workers

### Message Worker (`src/workers/messageWorker.ts`)

**Purpose**: Processes campaign messages from the queue.

**Key Responsibilities**:
1. **Sender Selection**: 
   - Uses specified senders if provided
   - Otherwise, selects healthy sender via round-robin
   - Checks quota availability

2. **Message Personalization**:
   - Replaces {{variable}} placeholders
   - Uses contact variables from database

3. **Human-like Behavior**:
   - Random pre-delay (1-3 seconds)
   - Typing simulation (based on message length)
   - Random typing duration with jitter

4. **Message Sending**:
   - Sends via WhatsApp client
   - Updates contact status
   - Logs message
   - Updates sender metrics

5. **Error Handling**:
   - Updates contact status to "failed"
   - Updates sender health score
   - Retries with exponential backoff

**Worker Configuration**:
- Concurrency: 5 (processes 5 messages at once)
- Rate Limit: 20 messages per minute (global)
- Retries: 3 attempts
- Backoff: Exponential (2s, 4s, 8s)

---

## How Everything Works Together

### 1. Server Startup Flow

```
1. Express app created
2. WhatsAppManager initialized
3. Services initialized (SenderManager, CampaignManager, etc.)
4. Database connection established
5. SenderManager.restoreAllSessions() called
   - Loads all active senders from database
   - Attempts to restore their WhatsApp sessions
6. Routes registered
7. Server starts listening on port 3000
```

### 2. Sender Connection Flow

```
1. POST /api/senders (create sender)
   → SenderManager.createSender()
   → Sender saved to database

2. POST /api/senders/:id/connect
   → SenderManager.connectSender()
   → WhatsAppManager.startSession()
   → WhatsAppClient.initialize()
   → QR code generated
   → User scans QR code
   → Session authenticated
   → Status updated to "connected"
```

### 3. Campaign Execution Flow

```
1. POST /api/campaigns (create campaign)
   → CampaignManager.createCampaign()
   → Contacts filtered (blocklist)
   → Campaign and contacts saved

2. POST /api/campaigns/:id/start
   → CampaignManager.startCampaign()
   → All contacts queued in BullMQ
   → Campaign status → "running"

3. Message Worker processes queue
   → Selects healthy sender
   → Personalizes message
   → Simulates typing
   → Sends message
   → Updates contact status
   → Updates sender metrics
```

### 4. Incoming Message Flow

```
1. WhatsApp message received
   → WhatsAppClient receives message
   → WhatsAppManager.messageCallback triggered

2. FlowExecutor.handleIncomingMessage()
   → Checks for active flows with matching keywords
   → If match found, starts flow execution

3. AutoReplyService.handleIncomingMessage()
   → Checks if auto-reply is active
   → Sends configured auto-reply message

4. Flow execution continues
   → Nodes executed sequentially
   → Delay nodes scheduled in queue
   → Variables substituted
   → Messages sent
```

### 5. Bulk Messaging Flow

```
1. POST /whatsapp/bulk-send
   → BulkMessageService.sendBulkMessages()
   → All messages sent in parallel (Promise.all)
   → Results returned immediately
```

### 6. Broadcast List Flow

```
1. POST /whatsapp/broadcast/create
   → BroadcastService.createBroadcastList()
   → Numbers chunked into groups of 256
   → BroadcastList and BroadcastGroups saved

2. POST /whatsapp/broadcast/:id/send
   → BroadcastService.sendToBroadcastList()
   → For each group:
     - Send to all 256 members simultaneously
     - Wait 10 seconds
     - Continue to next group
```

---

## Code Flow Examples

### Example 1: Sending a Single Message

```typescript
// 1. Client makes request
POST /message/send
{
  "sessionId": "sender-123",
  "to": "1234567890",
  "text": "Hello!"
}

// 2. Server.ts handles request
app.post("/message/send", async (req, res) => {
  const { sessionId, to, text } = req.body;
  await manager.sendMessage(sessionId, to, text);
  res.json({ message: "Message sent successfully" });
});

// 3. WhatsAppManager.sendMessage()
async sendMessage(sessionId: string, to: string, text: string) {
  const client = this.clients.get(sessionId);
  if (!client) throw new Error(`Session ${sessionId} not found`);
  await client.sendMessage(to, text);
}

// 4. WhatsAppClient.sendMessage()
async sendMessage(to: string, text: string) {
  const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
  await this.socket.sendMessage(jid, { text });
}

// 5. Baileys sends message via WhatsApp Web
```

### Example 2: Creating and Starting a Campaign

```typescript
// 1. Create campaign
POST /api/campaigns
{
  "name": "Summer Sale",
  "template": "Hi {{name}}, check out our summer sale!",
  "contacts": [
    { "phoneNumber": "1234567890", "variables": { "name": "John" } }
  ]
}

// 2. CampaignManager.createCampaign()
- Filters blocked numbers
- Creates Campaign entity
- Creates CampaignContact entities
- Saves to database

// 3. Start campaign
POST /api/campaigns/:id/start

// 4. CampaignManager.startCampaign()
- Gets all pending contacts
- Queues each contact in BullMQ with staggered delays
- Updates campaign status to "running"

// 5. Message Worker processes jobs
- Selects healthy sender
- Personalizes message: "Hi John, check out our summer sale!"
- Sends message
- Updates contact status to "sent"
```

### Example 3: Auto-Reply Flow

```typescript
// 1. Incoming message received
WhatsAppClient receives: "hello" from "1234567890@s.whatsapp.net"

// 2. WhatsAppManager triggers callbacks
this.flowExecutor.handleIncomingMessage(sessionId, from, text);
this.autoReplyService.handleIncomingMessage(sessionId, from, text);

// 3. AutoReplyService processes
- Loads config from database
- Checks if isActive = true
- Determines sender session (configured or receiving session)
- Waits 2 seconds
- Sends auto-reply via HTTP POST to /message/send

// 4. Message sent back to sender
```

### Example 4: Flow Execution

```typescript
// 1. Keyword "hello" triggers flow
FlowExecutor.handleIncomingMessage()
- Finds flow with keyword "hello"
- Creates FlowExecution
- Starts at StartNode

// 2. Execute MessageNode
- Parses variables: "Hi {{contact.name}}!"
- Sends: "Hi John!"

// 3. Execute ConditionNode
- Checks if message contains "yes"
- Branches to true/false path

// 4. Execute DelayNode
- Schedules next node in queue with 5-second delay
- Flow execution paused

// 5. Queue worker executes delayed node
- Continues flow execution
- Executes next node
```

---

## Configuration

### Environment Variables

```env
# Server
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS=true

# SMTP (for email nodes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Database Configuration (`src/data-source.ts`)

- **Type**: PostgreSQL (Neon)
- **Synchronize**: true (auto-creates tables)
- **SSL**: Enabled for cloud database

### Session Storage

- **Location**: `sessions/` directory
- **Structure**: One folder per session ID
- **Contents**: Baileys authentication files

---

## Key Design Patterns

### 1. Service Layer Pattern
Business logic separated into service classes, keeping routes thin.

### 2. Manager Pattern
WhatsAppManager acts as a facade, coordinating multiple clients.

### 3. Repository Pattern
TypeORM repositories abstract database access.

### 4. Queue Pattern
BullMQ handles asynchronous, delayed, and rate-limited operations.

### 5. Worker Pattern
Background workers process queued jobs independently.

### 6. Strategy Pattern
Different sending strategies (bulk, broadcast, campaign) for different use cases.

---

## Error Handling

### Service-Level Errors
- Services throw errors with descriptive messages
- Routes catch and return appropriate HTTP status codes

### Queue Job Errors
- Jobs retry automatically (3 attempts)
- Exponential backoff prevents overwhelming system
- Failed jobs logged for manual review

### WhatsApp Connection Errors
- Automatic reconnection on disconnect
- Health scores track connection reliability
- Auto-pause after repeated failures

---

## Performance Considerations

### 1. Parallel Execution
- BulkMessageService uses Promise.all() for maximum speed
- BroadcastService sends to 256 recipients simultaneously

### 2. Rate Limiting
- Sender quotas prevent overuse
- Global rate limits in message worker
- Staggered delays in campaigns

### 3. Database Optimization
- Indexes on frequently queried fields (status, isActive, healthScore)
- Efficient queries with TypeORM relations

### 4. Session Management
- Sessions persisted to filesystem
- Fast session restoration on startup

---

## Security Considerations

### 1. Session Security
- Session data stored securely in filesystem
- QR codes expire after connection

### 2. Input Validation
- Phone number normalization
- Blocklist filtering
- Variable sanitization

### 3. Rate Limiting
- Prevents abuse with quotas
- Protects against WhatsApp bans

---

## Future Enhancements

Potential improvements:
1. Webhook support for external integrations
2. Media message support (images, videos, documents)
3. Group management features
4. Advanced analytics and reporting
5. Multi-tenant support
6. API authentication (JWT)
7. WebSocket support for real-time updates
8. Message templates with media
9. A/B testing for campaigns
10. Scheduled message sending

---

## Conclusion

This backend system provides a robust, scalable foundation for WhatsApp automation. The modular architecture allows for easy extension and maintenance. Each service is independently testable and can be enhanced without affecting others.

The system handles:
- ✅ Multiple WhatsApp sessions
- ✅ Enterprise sender management
- ✅ Campaign automation
- ✅ Bulk messaging
- ✅ Auto-replies
- ✅ Visual flow automation
- ✅ Queue-based processing
- ✅ Health monitoring
- ✅ Rate limiting

For questions or contributions, refer to the main README.md file.

