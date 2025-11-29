import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { SessionManager } from "./SessionManager";
import pino from "pino";

export class WhatsAppClient {
  private socket: WASocket | null = null;
  private sessionManager: SessionManager;
  private sessionId: string;
  private qrCallback?: (qr: string) => void;
  private statusCallback?: (status: string) => void;

  constructor(
    sessionId: string,
    sessionManager: SessionManager,
    qrCallback?: (qr: string) => void,
    statusCallback?: (status: string) => void
  ) {
    this.sessionId = sessionId;
    this.sessionManager = sessionManager;
    this.qrCallback = qrCallback;
    this.statusCallback = statusCallback;
  }

  async initialize() {
    const { state, saveCreds } = await this.sessionManager.getAuthState(
      this.sessionId
    );

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We handle it via callback
      logger: pino({ level: "silent" }) as any,
    });

    this.socket.ev.on("creds.update", saveCreds);

    this.socket.ev.on(
      "connection.update",
      (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && this.qrCallback) {
          this.qrCallback(qr);
        }

        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as Boom)?.output?.statusCode !==
            DisconnectReason.loggedOut;
          console.log(
            `Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`
          );
          if (this.statusCallback) this.statusCallback("disconnected");
          if (shouldReconnect) {
            this.initialize();
          }
        } else if (connection === "open") {
          console.log(`Session ${this.sessionId} opened successfully`);
          if (this.statusCallback) this.statusCallback("connected");
        }
      }
    );
  }

  async sendMessage(to: string, text: string) {
    if (!this.socket) {
      throw new Error("Socket not initialized");
    }
    // Ensure 'to' is in the correct format (e.g., 1234567890@s.whatsapp.net)
    const jid = to.includes("@s.whatsapp.net") ? to : `${to}@s.whatsapp.net`;
    await this.socket.sendMessage(jid, { text });
  }
}
