import axios from "axios";

const SERVER_URL = "http://localhost:3000";

async function startSession(sessionId: string) {
  try {
    const response = await axios.post(`${SERVER_URL}/session/start`, {
      sessionId,
    });
    console.log(`Start Session ${sessionId}:`, response.data);
  } catch (error: any) {
    console.error(
      `Error starting session ${sessionId}:`,
      error.response?.data || error.message
    );
  }
}

async function sendMessage(sessionId: string, to: string, text: string) {
  try {
    console.log(`\n🔍 WhatsAppClient.sendMessage called`);
    console.log(`   To: ${to}`);
    console.log(`   Text: ${text}`);
    console.log(`   Has sock: ${!!this.sock}`);
    console.log(`   Sock user: ${this.sock?.user ? "YES" : "NO"}`);
    const response = await axios.post(`${SERVER_URL}/message/send`, {
      sessionId,
      to,
      text,
    });
    console.log(`Message from ${sessionId} to ${to}:`, response.data);
  } catch (error: any) {
    console.error(
      `Error sending message from ${sessionId}:`,
      error.response?.data || error.message
    );
  }
}

async function main() {
  // 1. Start sessions (You need to scan QR codes manually after this)
  console.log("--- Starting Sessions ---");
  await startSession("session1");
  await startSession("session2");

  console.log(
    "\nPlease scan the QR codes in the server terminal for both sessions."
  );
  console.log("Waiting 30 seconds for you to scan...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // 2. Send concurrent messages
  console.log("\n--- Sending Concurrent Messages ---");
  const tasks = [
    sendMessage("session1", "1234567890", "Message 1 from Session 1"),
    sendMessage("session2", "0987654321", "Message 1 from Session 2"),
    sendMessage("session1", "1234567890", "Message 2 from Session 1"),
    sendMessage("session2", "0987654321", "Message 2 from Session 2"),
  ];

  await Promise.all(tasks);
  console.log("\n--- Done ---");
}

main();
