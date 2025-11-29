import express from "express";
import { WhatsAppManager } from "./WhatsAppManager";
import qrcode from "qrcode-terminal";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Initialize the WhatsApp Manager
const manager = new WhatsAppManager();

// In-memory storage
const qrCodes = new Map<string, string>();
const sessionStatuses = new Map<string, string>();

app.post("/session/start", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    await manager.startSession(
      sessionId,
      (qr) => {
        console.log(`QR Code for session ${sessionId}:`);
        qrcode.generate(qr, { small: true });
        qrCodes.set(sessionId, qr);
      },
      (status) => {
        console.log(`Session ${sessionId} status: ${status}`);
        sessionStatuses.set(sessionId, status);
      }
    );

    res.json({
      message: `Session ${sessionId} started. Check console for QR.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/session/:sessionId/qr", (req, res) => {
  const { sessionId } = req.params;
  const qr = qrCodes.get(sessionId);

  if (!qr) {
    return res
      .status(404)
      .json({ error: "QR code not found or session connected" });
  }

  res.json({ qr });
});

app.get("/session/:sessionId/status", (req, res) => {
  const { sessionId } = req.params;
  const status = sessionStatuses.get(sessionId) || "unknown";
  res.json({ status });
});

app.get("/sessions", (req, res) => {
  const sessions = Array.from(sessionStatuses.entries()).map(
    ([id, status]) => ({
      sessionId: id,
      status,
    })
  );
  res.json({ sessions });
});

app.post("/message/send", async (req, res) => {
  const { sessionId, to, text } = req.body;

  if (!sessionId || !to || !text) {
    return res
      .status(400)
      .json({ error: "sessionId, to, and text are required" });
  }

  try {
    await manager.sendMessage(sessionId, to, text);
    res.json({ message: "Message sent successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    await manager.deleteSession(sessionId);
    res.json({ message: `Session ${sessionId} deleted successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/message/send-bulk", async (req, res) => {
  const { sessionId, recipients, text, delayMs } = req.body;

  if (!sessionId || !recipients || !text) {
    return res
      .status(400)
      .json({ error: "sessionId, recipients, and text are required" });
  }

  if (!Array.isArray(recipients)) {
    return res.status(400).json({ error: "recipients must be an array" });
  }

  try {
    const results = await manager.sendBulkMessage(
      sessionId,
      recipients,
      text,
      delayMs
    );
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/message/send-all", async (req, res) => {
  const { recipients, text, delayMs } = req.body;

  if (!recipients || !text) {
    return res.status(400).json({ error: "recipients and text are required" });
  }

  if (!Array.isArray(recipients)) {
    return res.status(400).json({ error: "recipients must be an array" });
  }

  try {
    const results = await manager.broadcastMessage(recipients, text, delayMs);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
