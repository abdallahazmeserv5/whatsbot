import express from "express";
import cors from "cors";
import { WhatsAppManager } from "./WhatsAppManager";
import { AppDataSource } from "./data-source";
import { startFlowWorker } from "./queues/flowQueue";
import { Flow } from "./entities/Flow";
import { FlowExecution } from "./entities/FlowExecution";
import qrcode from "qrcode-terminal";
import "reflect-metadata";
import { BulkMessageService } from "./services/BulkMessageService";
import { BroadcastService } from "./services/BroadcastService";
import { SenderManager } from "./services/SenderManager";
import { CampaignManager } from "./services/CampaignManager";
import { AutoReplyService } from "./services/AutoReplyService";
import { createSenderRoutes } from "./routes/senderRoutes";
import { createCampaignRoutes } from "./routes/campaignRoutes";
import { createAutoReplyRoutes } from "./routes/autoReplyRoutes";
import { createMessageWorker } from "./workers/messageWorker";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "500mb" })); // Increased limit for bulk messaging
app.use(express.urlencoded({ limit: "500mb", extended: true }));

// In-memory storage
const qrCodes = new Map<string, string>();
const sessionStatuses = new Map<string, string>();

// Initialize the WhatsApp Manager
const manager = new WhatsAppManager();

// Initialize services
const bulkMessageService = new BulkMessageService(manager);
const broadcastService = new BroadcastService(manager);
const senderManager = new SenderManager(manager);
const campaignManager = new CampaignManager();
const autoReplyService = new AutoReplyService(manager);

// Initialize Routes
app.use("/api/senders", createSenderRoutes(senderManager));
app.use("/api/campaigns", createCampaignRoutes(campaignManager));
app.use("/api/auto-reply", createAutoReplyRoutes(autoReplyService));

// Initialize Database
AppDataSource.initialize()
  .then(async () => {
    console.log("Database initialized successfully");

    // Connect auto-reply service to WhatsApp manager
    manager.setAutoReplyService(autoReplyService);

    // Initialize Enterprise Features
    await senderManager.restoreAllSessions();

    // Message worker requires Redis - commented out for now
    // createMessageWorker(senderManager, campaignManager, manager);

    console.log("✅ Enterprise WhatsApp System Initialized");
  })
  .catch((error) => {
    console.error("Error initializing database:", error);
  });

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

// Flow Management Endpoints
app.post("/flows", async (req, res) => {
  try {
    const { name, nodes, edges, triggerType, keywords, isActive } = req.body;
    const flowRepo = AppDataSource.getRepository(Flow);

    const flow = flowRepo.create({
      name,
      nodes,
      edges,
      triggerType,
      keywords,
      isActive: isActive !== undefined ? isActive : true,
    });

    await flowRepo.save(flow);
    res.json({ success: true, flow });
  } catch (error: any) {
    console.error("Error saving flow:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/flows", async (req, res) => {
  try {
    const flows = await AppDataSource.getRepository(Flow).find({
      order: { createdAt: "DESC" },
    });
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/flows/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const flowRepo = AppDataSource.getRepository(Flow);

    const flow = await flowRepo.findOne({ where: { id } });
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }

    flow.isActive = !flow.isActive;
    await flowRepo.save(flow);

    res.json({ success: true, flow });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/flows/:id/executions", async (req, res) => {
  try {
    const { id } = req.params;
    const executions = await AppDataSource.getRepository(FlowExecution).find({
      where: { flow: { id } },
      relations: ["contact"],
      order: { startedAt: "DESC" },
      take: 50,
    });
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BULK MESSAGING ENDPOINTS
// ============================================

app.post("/whatsapp/bulk-send", async (req, res) => {
  try {
    const { sessionId, numbers, message } = req.body;

    // sessionId is now optional - if not provided, will use all connected sessions
    if (!numbers || !message) {
      return res.status(400).json({
        error:
          "numbers and message are required. sessionId is optional (will use all sessions if not provided)",
      });
    }

    if (!Array.isArray(numbers)) {
      return res.status(400).json({ error: "numbers must be an array" });
    }

    const result = await bulkMessageService.sendBulkMessages({
      sessionId,
      numbers,
      message,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Bulk send error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BROADCAST LIST ENDPOINTS
// ============================================

app.post("/whatsapp/broadcast/create", async (req, res) => {
  try {
    const { sessionId, name, numbers } = req.body;

    if (!sessionId || !name || !numbers) {
      return res.status(400).json({
        error: "sessionId, name, and numbers are required",
      });
    }

    if (!Array.isArray(numbers)) {
      return res.status(400).json({ error: "numbers must be an array" });
    }

    const result = await broadcastService.createBroadcastList({
      sessionId,
      name,
      numbers,
    });

    res.json(result);
  } catch (error: any) {
    console.error("Broadcast create error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/whatsapp/broadcast", async (req, res) => {
  try {
    const broadcasts = await broadcastService.getAllBroadcastLists();
    res.json({ broadcasts });
  } catch (error: any) {
    console.error("Get broadcasts error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/whatsapp/broadcast/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await broadcastService.getBroadcastListById(id);

    if (!broadcast) {
      return res.status(404).json({ error: "Broadcast list not found" });
    }

    res.json(broadcast);
  } catch (error: any) {
    console.error("Get broadcast error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/whatsapp/broadcast/:id/send", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await broadcastService.sendToBroadcastList(id, { message });
    res.json(result);
  } catch (error: any) {
    console.error("Broadcast send error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/whatsapp/broadcast/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await broadcastService.deleteBroadcastList(id);
    res.json({ success: true, message: "Broadcast list deleted" });
  } catch (error: any) {
    console.error("Delete broadcast error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
