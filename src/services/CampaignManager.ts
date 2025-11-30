import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Campaign, CampaignStatus } from "../entities/Campaign";
import { CampaignContact } from "../entities/CampaignContact";
import { Blocklist } from "../entities/Blocklist";
import { Queue } from "bullmq";

export class CampaignManager {
  private campaignRepo: Repository<Campaign>;
  private contactRepo: Repository<CampaignContact>;
  private blocklistRepo: Repository<Blocklist>;
  private messageQueue: Queue;

  constructor() {
    this.campaignRepo = AppDataSource.getRepository(Campaign);
    this.contactRepo = AppDataSource.getRepository(CampaignContact);
    this.blocklistRepo = AppDataSource.getRepository(Blocklist);

    // Initialize BullMQ queue
    this.messageQueue = new Queue("message-queue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    });
  }

  /**
   * Create campaign and upload contacts
   */
  async createCampaign(data: {
    name: string;
    template: string;
    contacts: Array<{
      phoneNumber: string;
      variables?: Record<string, string>;
    }>;
    scheduledStart?: Date;
    scheduledEnd?: Date;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    minDelay?: number;
    maxDelay?: number;
    enableTyping?: boolean;
    senderIds?: string[];
  }): Promise<Campaign> {
    // Filter out blocked numbers
    const blockedNumbers = await this.blocklistRepo.find();
    const blockedSet = new Set(blockedNumbers.map((b) => b.phoneNumber));

    const validContacts = data.contacts.filter(
      (c) => !blockedSet.has(c.phoneNumber)
    );

    if (validContacts.length === 0) {
      throw new Error("No valid contacts after filtering blocklist");
    }

    // Create campaign
    const campaign = this.campaignRepo.create({
      name: data.name,
      template: data.template,
      status: "draft",
      totalRecipients: validContacts.length,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      timeWindowStart: data.timeWindowStart,
      timeWindowEnd: data.timeWindowEnd,
      minDelay: data.minDelay || 2000,
      maxDelay: data.maxDelay || 5000,
      enableTyping: data.enableTyping !== false,
      senderIds: data.senderIds || null,
    });

    await this.campaignRepo.save(campaign);

    // Create contacts
    const contacts = validContacts.map((c) =>
      this.contactRepo.create({
        campaignId: campaign.id,
        phoneNumber: c.phoneNumber,
        variables: c.variables || {},
        status: "pending",
      })
    );

    await this.contactRepo.save(contacts);

    console.log(
      `✅ Campaign "${campaign.name}" created with ${validContacts.length} contacts`
    );
    if (data.contacts.length > validContacts.length) {
      console.log(
        `⚠️  Filtered out ${
          data.contacts.length - validContacts.length
        } blocked number(s)`
      );
    }

    return campaign;
  }

  /**
   * Start campaign - queue all messages
   */
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error("Campaign not found");

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      throw new Error(`Cannot start campaign with status: ${campaign.status}`);
    }

    // Get all pending contacts
    const contacts = await this.contactRepo.find({
      where: { campaignId, status: "pending" },
    });

    if (contacts.length === 0) {
      throw new Error("No pending contacts to send");
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log(`🚀 STARTING CAMPAIGN: ${campaign.name}`);
    console.log(`Total Contacts: ${contacts.length}`);
    console.log(`Min Delay: ${campaign.minDelay}ms`);
    console.log(`Max Delay: ${campaign.maxDelay}ms`);
    console.log("=".repeat(80));

    // Queue messages with staggered delays
    let cumulativeDelay = 0;
    for (const contact of contacts) {
      await this.messageQueue.add(
        "send-message",
        {
          contactId: contact.id,
          campaignId: campaign.id,
          message: campaign.template,
          variables: contact.variables,
          senderIds: campaign.senderIds,
        },
        {
          delay: cumulativeDelay,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );

      contact.status = "queued";
      contact.queuedAt = new Date();

      // Random delay between messages
      const randomDelay =
        Math.random() * (campaign.maxDelay - campaign.minDelay) +
        campaign.minDelay;
      cumulativeDelay += randomDelay;
    }

    await this.contactRepo.save(contacts);

    // Update campaign
    campaign.status = "running";
    campaign.startedAt = new Date();
    await this.campaignRepo.save(campaign);

    console.log(`✅ Queued ${contacts.length} messages`);
    console.log(
      `⏱️  Estimated completion: ${Math.round(cumulativeDelay / 60000)} minutes`
    );
    console.log("=".repeat(80) + "\n");
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error("Campaign not found");

    campaign.status = "paused";
    await this.campaignRepo.save(campaign);

    console.log(`⏸️  Campaign "${campaign.name}" paused`);
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign) throw new Error("Campaign not found");

    if (campaign.status !== "paused") {
      throw new Error("Can only resume paused campaigns");
    }

    campaign.status = "running";
    await this.campaignRepo.save(campaign);

    console.log(`▶️  Campaign "${campaign.name}" resumed`);
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign | null> {
    return await this.campaignRepo.findOne({ where: { id } });
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(): Promise<Campaign[]> {
    return await this.campaignRepo.find({
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<{
    total: number;
    pending: number;
    queued: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    successRate: number;
  } | null> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });
    if (!campaign) return null;

    const contacts = await this.contactRepo.find({
      where: { campaignId },
    });

    const stats = {
      total: contacts.length,
      pending: contacts.filter((c) => c.status === "pending").length,
      queued: contacts.filter((c) => c.status === "queued").length,
      sent: contacts.filter((c) => c.status === "sent").length,
      delivered: contacts.filter((c) => c.status === "delivered").length,
      read: contacts.filter((c) => c.status === "read").length,
      failed: contacts.filter((c) => c.status === "failed").length,
      successRate: 0,
    };

    const completed = stats.sent + stats.delivered + stats.read + stats.failed;
    if (completed > 0) {
      stats.successRate =
        ((stats.sent + stats.delivered + stats.read) / completed) * 100;
    }

    return stats;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await this.campaignRepo.delete({ id: campaignId });
    console.log(`🗑️  Campaign deleted: ${campaignId}`);
  }

  /**
   * Update contact status
   */
  async updateContactStatus(
    contactId: string,
    status: "sent" | "delivered" | "read" | "failed",
    errorMessage?: string
  ): Promise<void> {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId },
    });
    if (!contact) return;

    contact.status = status;

    switch (status) {
      case "sent":
        contact.sentAt = new Date();
        break;
      case "delivered":
        contact.deliveredAt = new Date();
        break;
      case "read":
        contact.readAt = new Date();
        break;
      case "failed":
        contact.failedAt = new Date();
        contact.errorMessage = errorMessage || null;
        contact.attemptCount++;
        break;
    }

    await this.contactRepo.save(contact);

    // Update campaign counters
    await this.updateCampaignCounters(contact.campaignId);
  }

  /**
   * Update campaign counters
   */
  private async updateCampaignCounters(campaignId: string): Promise<void> {
    const stats = await this.getCampaignStats(campaignId);
    if (!stats) return;

    await this.campaignRepo.update(
      { id: campaignId },
      {
        processedCount:
          stats.sent + stats.delivered + stats.read + stats.failed,
        successCount: stats.sent + stats.delivered + stats.read,
        failedCount: stats.failed,
      }
    );

    // Check if campaign is complete
    if (stats.pending === 0 && stats.queued === 0) {
      await this.campaignRepo.update(
        { id: campaignId },
        {
          status: "completed",
          completedAt: new Date(),
        }
      );
      console.log(`✅ Campaign ${campaignId} completed`);
    }
  }
}
