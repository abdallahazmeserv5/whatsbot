import express from "express";
import { SenderManager } from "../services/SenderManager";

export const createSenderRoutes = (senderManager: SenderManager) => {
  const router = express.Router();

  // Get all senders
  router.get("/", async (req, res) => {
    try {
      console.log("GET /api/senders - Fetching all senders...");
      const senders = await senderManager.getAllSenders();
      console.log("GET /api/senders - Found senders:", senders.length);
      res.json(senders);
    } catch (error: any) {
      console.error("GET /api/senders - Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get active senders
  router.get("/active", async (req, res) => {
    try {
      const senders = await senderManager.getActiveSenders();
      res.json(senders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sender by ID
  router.get("/:id", async (req, res) => {
    try {
      const sender = await senderManager.getSenderById(req.params.id);
      if (!sender) {
        return res.status(404).json({ error: "Sender not found" });
      }
      res.json(sender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new sender
  router.post("/", async (req, res) => {
    try {
      const { name, phoneNumber, quotaPerMinute, quotaPerHour, quotaPerDay } =
        req.body;

      if (!name || !phoneNumber) {
        return res
          .status(400)
          .json({ error: "Name and phone number are required" });
      }

      const sender = await senderManager.createSender({
        name,
        phoneNumber,
        quotaPerMinute,
        quotaPerHour,
        quotaPerDay,
      });

      res.status(201).json(sender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete sender
  router.delete("/:id", async (req, res) => {
    try {
      await senderManager.deleteSender(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sender stats
  router.get("/:id/stats", async (req, res) => {
    try {
      const stats = await senderManager.getSenderStats(req.params.id);
      if (!stats) {
        return res.status(404).json({ error: "Sender not found" });
      }
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Connect sender
  router.post("/:id/connect", async (req, res) => {
    try {
      await senderManager.connectSender(req.params.id);
      res.json({ success: true, message: "Connection process started" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get QR code
  router.get("/:id/qr", async (req, res) => {
    try {
      const qr = senderManager.getQrCode(req.params.id);
      if (!qr) {
        return res
          .status(404)
          .json({ error: "QR code not found or already connected" });
      }
      res.json({ qr });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
