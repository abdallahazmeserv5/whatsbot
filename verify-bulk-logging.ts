import { AppDataSource } from "./src/data-source";
import { BulkMessageService } from "./src/services/BulkMessageService";
import { MessageLog } from "./src/entities/MessageLog";

async function verify() {
  console.log("🚀 Starting verification...");

  // 1. Initialize Database
  try {
    await AppDataSource.initialize();
    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }

  // 2. Mock WhatsAppManager and Client
  const mockClient = {
    sendMessage: async (jid: string, text: string) => {
      console.log(`[MockClient] Sending message to ${jid}: ${text}`);
      return { key: { id: "mock-msg-id" } };
    },
  };

  const mockWhatsAppManager = {
    clients: new Map([["test-session", mockClient]]),
  };

  // 3. Instantiate Service
  const service = new BulkMessageService(mockWhatsAppManager as any);

  // 4. Send Bulk Message
  const sessionId = "test-session";
  const number = "1234567890";
  const message = "Test message for logging verification";

  console.log("📤 Sending bulk message...");
  await service.sendBulkMessages({
    sessionId,
    numbers: [number],
    message,
  });

  // 5. Verify Log
  console.log("🔍 Verifying log in database...");
  const logRepo = AppDataSource.getRepository(MessageLog);

  // Wait a bit for async logging (though it's awaited in service, just to be safe)
  await new Promise((r) => setTimeout(r, 1000));

  const log = await logRepo.findOne({
    where: {
      senderId: sessionId,
      phoneNumber: number,
      message: message,
    },
    order: { sentAt: "DESC" },
  });

  if (log) {
    console.log("✅ Log found:", log);
    console.log("✅ Verification SUCCESS");
  } else {
    console.error("❌ Log NOT found");
    console.error("❌ Verification FAILED");
  }

  // Cleanup
  await AppDataSource.destroy();
}

verify();
