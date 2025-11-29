import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is working!" });
});

// Sessions endpoint (without WhatsApp for now)
const sessions: any[] = [];
app.get("/sessions", (req, res) => {
  res.json({ sessions });
});

app.post("/session/start", (req, res) => {
  const { sessionId } = req.body;
  sessions.push({ sessionId, status: "pending" });
  res.json({ message: `Session ${sessionId} created` });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Test it: http://localhost:${PORT}/test`);
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  process.exit(0);
});
