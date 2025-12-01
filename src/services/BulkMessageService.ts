import { WhatsAppManager } from "../WhatsAppManager";
import { normalizePhoneNumber, retryWithBackoff } from "../utils/helpers";
import {
  BulkSendRequest,
  BulkSendResponse,
  BulkSendResult,
} from "../types/whatsapp.types";

export class BulkMessageService {
  constructor(private whatsAppManager: WhatsAppManager) {}

  /**
   * Send bulk messages in parallel using Promise.all
   * No throttling - fires all messages instantly
   * Continues on error (ban-resistant)
   */
  async sendBulkMessages(request: BulkSendRequest): Promise<BulkSendResponse> {
    const { sessionId, numbers, message } = request;

    // Validate session exists
    const client = (this.whatsAppManager as any).clients.get(sessionId);
    if (!client) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`🚀 BULK SEND STARTING`);
    console.log(`Session: ${sessionId}`);
    console.log(`Total Messages: ${numbers.length}`);
    console.log(`Strategy: Promise.all() - ALL MESSAGES FIRE SIMULTANEOUSLY`);
    console.log(`No throttling, no delays, no limits!`);
    console.log("=".repeat(80));

    const startTime = Date.now();
    console.log(`⏰ Start Time: ${new Date(startTime).toISOString()}`);
    console.log(`🔥 FIRING ALL ${numbers.length} MESSAGES NOW...`);

    // Ensure message is a string
    const messageText = String(message || "").trim();
    if (!messageText) {
      throw new Error("Message cannot be empty");
    }

    let completedCount = 0;
    const total = numbers.length;

    // Send all messages in parallel with Promise.all
    // THIS FIRES ALL MESSAGES AT ONCE - NO THROTTLING
    const results: BulkSendResult[] = await Promise.all(
      numbers.map(async (number): Promise<BulkSendResult> => {
        try {
          const jid = normalizePhoneNumber(number);

          // Retry logic with exponential backoff
          // await retryWithBackoff(
          //   async () => {
          //     await client.sendMessage(jid, messageText);
          //   },
          //   1, // 3 retries
          //   300 // 1 second initial delay
          // );

          await client.sendMessage(jid, messageText);

          completedCount++;
          if (completedCount % 50 === 0 || completedCount === total) {
            console.log(
              `[BulkService] 📤 Progress: ${completedCount}/${total} (${(
                (completedCount / total) *
                100
              ).toFixed(1)}%)`
            );
          }

          return {
            number,
            status: "success",
          };
        } catch (error: any) {
          completedCount++;
          if (completedCount % 50 === 0 || completedCount === total) {
            console.log(
              `[BulkService] 📤 Progress: ${completedCount}/${total} (${(
                (completedCount / total) *
                100
              ).toFixed(1)}%)`
            );
          }

          console.error(`Failed to send to ${number}: ${error.message}`);
          return {
            number,
            status: "failed",
            error: error.message,
          };
        }
      })
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds

    // Calculate statistics
    const sent = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const errors = results.filter((r) => r.status === "failed");

    console.log("\n" + "=".repeat(80));
    console.log(`✅ BULK SEND COMPLETE`);
    console.log(`⏰ End Time: ${new Date(endTime).toISOString()}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📊 Sent: ${sent} ✅`);
    console.log(`📊 Failed: ${failed} ❌`);
    console.log(`📊 Total: ${numbers.length}`);
    console.log(
      `📊 Success Rate: ${((sent / numbers.length) * 100).toFixed(2)}%`
    );
    console.log(
      `⚡ Speed: ${(numbers.length / duration).toFixed(2)} messages/second`
    );
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      sent,
      failed,
      errors,
      results,
    };
  }

  /**
   * Handle connection loss gracefully
   * This method can be called when connection is lost
   */
  async handleConnectionLoss(sessionId: string): Promise<void> {
    console.log(
      `Connection lost for session ${sessionId}, attempting retry...`
    );

    try {
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if session is reconnected
      const client = (this.whatsAppManager as any).clients.get(sessionId);
      if (client) {
        console.log(`Session ${sessionId} reconnected successfully`);
      } else {
        console.error(`Session ${sessionId} could not be reconnected`);
      }
    } catch (error: any) {
      console.error(`Failed to handle connection loss:`, error.message);
    }
  }
}
