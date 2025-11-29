import {
  useMultiFileAuthState,
  AuthenticationState,
} from "@whiskeysockets/baileys";
import path from "path";
import fs from "fs";

export class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(__dirname, "../sessions");
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  async getAuthState(
    sessionId: string
  ): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    return { state, saveCreds };
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionPath = path.join(this.sessionsDir, sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
}
