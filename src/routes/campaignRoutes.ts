import express from "express";
import { CampaignManager } from "../services/CampaignManager";

export const createCampaignRoutes = (campaignManager: CampaignManager) => {
  const router = express.Router();

  // Get all campaigns
  router.get("/", async (req, res) => {
    try {
      const campaigns = await campaignManager.getAllCampaigns();
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get campaign by ID
  router.get("/:id", async (req, res) => {
    try {
      const campaign = await campaignManager.getCampaignById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new campaign
  router.post("/", async (req, res) => {
    try {
      const {
        name,
        template,
        contacts,
        scheduledStart,
        scheduledEnd,
        timeWindowStart,
        timeWindowEnd,
        minDelay,
        maxDelay,
        enableTyping,
        senderIds,
      } = req.body;

      if (!name || !template || !contacts || !Array.isArray(contacts)) {
        return res.status(400).json({
          error: "Name, template, and contacts array are required",
        });
      }

      const campaign = await campaignManager.createCampaign({
        name,
        template,
        contacts,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
        timeWindowStart,
        timeWindowEnd,
        minDelay,
        maxDelay,
        enableTyping,
        senderIds,
      });

      res.status(201).json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Start campaign
  router.post("/:id/start", async (req, res) => {
    try {
      await campaignManager.startCampaign(req.params.id);
      res.json({ success: true, message: "Campaign started" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pause campaign
  router.post("/:id/pause", async (req, res) => {
    try {
      await campaignManager.pauseCampaign(req.params.id);
      res.json({ success: true, message: "Campaign paused" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resume campaign
  router.post("/:id/resume", async (req, res) => {
    try {
      await campaignManager.resumeCampaign(req.params.id);
      res.json({ success: true, message: "Campaign resumed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete campaign
  router.delete("/:id", async (req, res) => {
    try {
      await campaignManager.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get campaign stats
  router.get("/:id/stats", async (req, res) => {
    try {
      const stats = await campaignManager.getCampaignStats(req.params.id);
      if (!stats) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
