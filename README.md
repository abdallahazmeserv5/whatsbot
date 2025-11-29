# WhatsApp Automation System

A visual flow builder for creating WhatsApp automation workflows with support for conditions, delays, HTTP requests, and email integrations.

## Features

- 🎨 **Visual Flow Builder** - Drag-and-drop interface using React Flow
- 💬 **WhatsApp Integration** - Multi-session support with Baileys
- 🔀 **Conditional Logic** - Branch flows based on message content
- ⏱️ **Delays** - Schedule actions with BullMQ
- 🌐 **HTTP Requests** - Call external APIs
- 📧 **Email** - Send emails via SMTP
- 💾 **Database** - SQLite with TypeORM
- 🔄 **Variables** - Dynamic content with `{{contact.name}}`, `{{flow.data}}`

## Prerequisites

- Node.js 16+
- Redis (for DelayNode)
- SMTP credentials (for EmailNode)

## Installation

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your credentials
```

## Configuration

Edit `.env`:

```env
# Redis (required for delays)
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (required for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

PORT=3000
```

## Running

```bash
# Start Redis
redis-server

# Start backend
npm run dev

# Start frontend (new terminal)
cd client && npm run dev
```

Open `http://localhost:5173`

## Usage

### 1. Create WhatsApp Session

- Click "Add Session"
- Scan QR code with WhatsApp
- Wait for "Connected" status

### 2. Build a Flow

- Go to "Flow Builder"
- Drag nodes from sidebar
- Connect nodes
- Save flow

### 3. Trigger Flow

Send a message containing the keyword (default: "hello" or "hi")

## Node Types

| Node             | Description                     |
| ---------------- | ------------------------------- |
| **Start**        | Entry point for flows           |
| **Message**      | Send WhatsApp message           |
| **Condition**    | Branch based on message content |
| **Delay**        | Wait before continuing          |
| **HTTP Request** | Call external APIs              |
| **Email**        | Send emails                     |

## Variables

Use variables in any text field:

- `{{contact.name}}` - Contact name
- `{{contact.phoneNumber}}` - Phone number
- `{{flow.httpResponse}}` - HTTP response data
- `{{flow.message}}` - Incoming message

## Troubleshooting

**DelayNode not working**

- Ensure Redis is running: `redis-server`

**EmailNode not working**

- Check SMTP credentials in `.env`
- For Gmail, use App Password: https://myaccount.google.com/apppasswords

**Flow not triggering**

- Verify flow is active
- Check keywords match
- View server logs for errors

## Architecture

```
Client (React + React Flow)
  ↓
Server (Express + TypeORM)
  ↓
WhatsApp (Baileys) + BullMQ (Redis)
  ↓
SQLite Database
```

## Development

```bash
# Backend
npm run dev

# Frontend
cd client && npm run dev

# Build
npm run build (backend - TypeScript)
cd client && npm run build
```

## License

MIT
