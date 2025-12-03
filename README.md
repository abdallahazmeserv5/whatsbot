# WhatsApp Service

Express-based WhatsApp service using Baileys for multi-session WhatsApp messaging.

## Overview

This service handles all WhatsApp operations for the Rayan Restaurant system. It runs independently from the main Next.js dashboard and provides REST API endpoints for WhatsApp functionality.

## Features

- Multi-session WhatsApp support
- QR code generation for session authentication
- Message sending (single and bulk)
- Broadcast lists
- Campaign management
- Auto-reply functionality
- Flow automation
- Session persistence with TypeORM

## Prerequisites

- Node.js 18+ or 20+
- PostgreSQL or SQLite database
- Redis (optional, for BullMQ message queuing)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Update the environment variables:
   - `PORT`: Server port (default: 3001)
   - `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
   - Database connection settings
   - Redis connection settings (if using)

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The service will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

### Session Management

#### Start a Session

```
POST /session/start
Body: { "sessionId": "string" }
```

#### Get QR Code

```
GET /session/:sessionId/qr
```

#### Get Session Status

```
GET /session/:sessionId/status
```

#### Get All Sessions

```
GET /sessions
```

#### Delete Session

```
DELETE /session/:sessionId
```

### Messaging

#### Send Message

```
POST /message/send
Body: { "sessionId": "string", "to": "string", "text": "string" }
```

#### Send Bulk Messages

```
POST /message/send-bulk
Body: { "sessionId": "string", "recipients": ["string"], "text": "string", "delayMs": number }
```

#### Broadcast to All Sessions

```
POST /message/send-all
Body: { "recipients": ["string"], "text": "string", "delayMs": number }
```

### Advanced Features

#### Bulk Messaging (with batching)

```
POST /whatsapp/bulk-send
Body: { "sessionId": "string", "numbers": ["string"], "message": "string" }
```

#### Broadcast Lists

```
POST /whatsapp/broadcast/create
GET /whatsapp/broadcast
GET /whatsapp/broadcast/:id
POST /whatsapp/broadcast/:id/send
DELETE /whatsapp/broadcast/:id
```

#### Campaigns

```
See /api/campaigns/* endpoints
```

#### Auto-Reply

```
See /api/auto-reply/* endpoints
```

#### Senders

```
See /api/senders/* endpoints
```

## Integration with Next.js Dashboard

The Next.js dashboard communicates with this service via HTTP requests. Make sure:

1. This service is running on port 3001
2. Next.js app has `WHATSAPP_SERVICE_URL=http://localhost:3001` in its `.env`
3. CORS is properly configured to allow requests from the Next.js app

## Architecture

```
┌─────────────────────────┐
│   Next.js Dashboard     │
│   (Port 3000)           │
│   - Payload CMS         │
│   - UI/Admin            │
└───────────┬─────────────┘
            │ HTTP API
            ▼
┌─────────────────────────┐
│  Express WhatsApp       │
│  Service (Port 3001)    │
│  - Baileys Integration  │
│  - Session Management   │
│  - Message Sending      │
└─────────────────────────┘
```

## Database Schema

The service uses TypeORM with the following entities:

- Flow
- FlowExecution
- Contact
- BroadcastList
- Campaign
- Sender
- AutoReply
- And more...

## Troubleshooting

### QR Code Not Generating

- Ensure the session directory has write permissions
- Check that Baileys is properly installed
- Verify no firewall is blocking the connection

### Messages Not Sending

- Verify the session is connected (status: 'open')
- Check phone number format (should include country code)
- Ensure WhatsApp Web is not logged in on another device

### CORS Errors

- Verify `ALLOWED_ORIGINS` includes your Next.js app URL
- Check that both services are running
- Ensure the Next.js app is using the correct `WHATSAPP_SERVICE_URL`

## License

MIT
