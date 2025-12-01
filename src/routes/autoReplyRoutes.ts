import { Router } from "express";
import type { AutoReplyService } from "../services/AutoReplyService";

export function createAutoReplyRoutes(autoReplyService: AutoReplyService) {
  const router = Router();

  // Get current auto-reply configuration
  router.get("/", async (req, res) => {
    try {
      const config = await autoReplyService.getConfig();
      res.json(config);
    } catch (error: any) {
      console.error("Error getting auto-reply config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update auto-reply configuration
  router.post("/", async (req, res) => {
    try {
      const { isActive, senderNumber, messageContent } = req.body;

      if (isActive && (!senderNumber || !messageContent)) {
        return res.status(400).json({
          error: "senderNumber and messageContent are required when active",
        });
      }

      const config = await autoReplyService.updateConfig({
        isActive,
        senderNumber,
        messageContent,
      });

      res.json(config);
    } catch (error: any) {
      console.error("Error updating auto-reply config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
