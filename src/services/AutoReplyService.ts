import { AppDataSource } from "../data-source";
import { AutoReplyConfig } from "../entities/AutoReplyConfig";
import axios from "axios";

export class AutoReplyService {
  private manager: any;
  private config: AutoReplyConfig | null = null;
  private replyDelay = 2000; // 2 seconds

  constructor(manager: any) {
    this.manager = manager;
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const repo = AppDataSource.getRepository(AutoReplyConfig);
      this.config = await repo.findOne({ where: {} });
      console.log("📋 Auto-reply config loaded:", this.config);
    } catch (e) {
      console.error("❌ Error loading auto-reply config:", e);
    }
  }

  async handleIncomingMessage(
    receivedOnSession: string,
    from: string,
    text: string
  ) {
    // Fire and forget
    this.sendAutoReplyAsync(receivedOnSession, from, text).catch((err) => {
      console.error("❌ Auto-reply background error:", err);
    });
  }

  private async sendAutoReplyAsync(
    receivedOnSession: string,
    from: string,
    text: string
  ) {
    try {
      console.log(`\n🤖 ===== Auto-reply triggered =====`);
      console.log(`📥 Message from ${from} on session: ${receivedOnSession}`);

      await this.loadConfig();
      if (!this.config) return console.log("⚠️ No config found");

      if (!this.config.isActive) {
        console.log("⏸️ Auto-reply is disabled");
        return;
      }

      if (!this.config.messageContent) {
        console.log("⚠️ No message content configured");
        return;
      }

      // KEY CHANGE: Use senderNumber if configured, otherwise use receiving session
      let sessionToUse = receivedOnSession;

      if (this.config.senderNumber && this.config.senderNumber.trim()) {
        // Use the configured sender session (DIFFERENT from receiving session)
        sessionToUse = this.config.senderNumber;
        console.log(
          `📤 Using configured sender session: ${sessionToUse} (received on: ${receivedOnSession})`
        );
      } else {
        console.log(`📤 Using receiving session: ${sessionToUse}`);
      }

      // Wait for stabilization
      console.log(`⏳ Waiting ${this.replyDelay}ms...`);
      await new Promise((res) => setTimeout(res, this.replyDelay));

      const to = from;
      const messageText = this.config.messageContent;

      console.log(
        `📤 Sending auto-reply via HTTP from ${sessionToUse} to ${to}`
      );

      await axios.post("http://localhost:3000/message/send", {
        sessionId: sessionToUse,
        to: to,
        text: messageText,
      });

      console.log("✅ Auto-reply sent successfully!");
    } catch (error: any) {
      console.error(
        "❌ Failed to send auto-reply:",
        error.response?.data || error.message
      );
    }
  }

  async getConfig(): Promise<AutoReplyConfig> {
    const repo = AppDataSource.getRepository(AutoReplyConfig);
    let config = await repo.findOne({ where: {} });

    if (!config) {
      config = repo.create({
        isActive: false,
        senderNumber: "",
        messageContent: "Thank you for contacting us!",
      });
      await repo.save(config);
    }

    return config;
  }

  async updateConfig(data: {
    isActive: boolean;
    senderNumber: string;
    messageContent: string;
  }): Promise<AutoReplyConfig> {
    const repo = AppDataSource.getRepository(AutoReplyConfig);
    let config = await repo.findOne({ where: {} });

    if (!config) {
      config = repo.create(data);
    } else {
      Object.assign(config, data);
    }

    await repo.save(config);

    this.config = config;
    console.log("✅ Auto-reply config updated");

    return config;
  }
}
