import express from "express";
import cors from "cors";
import { WhatsAppManager } from "./WhatsAppManager";
import { AppDataSource } from "./data-source";
import { startFlowWorker } from "./queues/flowQueue";
import { Flow } from "./entities/Flow";
import { FlowExecution } from "./entities/FlowExecution";
import qrcode from "qrcode-terminal";
import "reflect-metadata";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage
const qrCodes = new Map<string, string>();
const sessionStatuses = new Map<string, string>();

// Initialize Database
AppDataSource.initialize()
  .then(() => {
    console.log("Database initialized successfully");

    // Initialize BullMQ Worker
    const manager = new WhatsAppManager();
    const flowExecutor = manager["flowExecutor"];

    if (flowExecutor) {
      startFlowWorker(async (executionId: string, nodeId: string) => {
        await flowExecutor.executeNode(executionId, nodeId);
      });
      console.log("BullMQ worker started successfully");
    }
  })
  .catch((error) => {
    console.error("Error initializing database:", error);
  });

// Initialize the WhatsApp Manager
const manager = new WhatsAppManager();

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
