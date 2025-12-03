import { WhatsAppClient } from './WhatsAppClient'
import { SessionManager } from './SessionManager'
import { FlowExecutor } from './services/FlowExecutor'

export class WhatsAppManager {
  private clients: Map<string, WhatsAppClient> = new Map()
  private sessionManager: SessionManager
  private flowExecutor: FlowExecutor
  private autoReplyService?: any

  constructor() {
    this.sessionManager = new SessionManager()
    this.flowExecutor = new FlowExecutor(this)
  }

  setAutoReplyService(service: any) {
    this.autoReplyService = service
    console.log('✅ Auto-reply service connected to WhatsApp Manager')
  }

  async startSession(
    sessionId: string,
    qrCallback?: (qr: string) => void,
    statusCallback?: (status: string) => void,
  ) {
    // If session exists, check if it's connected
    if (this.clients.has(sessionId)) {
      const existingClient = this.clients.get(sessionId)
      const socket = existingClient?.getSocket()

      // If already connected, don't create a new session
      if (socket && socket.user && socket.user.id) {
        console.log(`Session ${sessionId} is already connected`)
        if (statusCallback) statusCallback('connected')
        return
      }

      // Session exists but not connected - delete it and create a new one
      console.log(`Session ${sessionId} exists but not connected, restarting...`)
      try {
        await existingClient?.destroy()
      } catch (e) {
        console.error('Error destroying old session:', e)
      }
      this.clients.delete(sessionId)
    }

    const client = new WhatsAppClient(
      sessionId,
      this.sessionManager,
      qrCallback,
      statusCallback,
      (msg) => {
        // Handle incoming message
        const from = msg.key.remoteJid
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text

        if (from && text) {
          this.flowExecutor.handleIncomingMessage(sessionId, from, text)

          // Trigger auto-reply
          if (this.autoReplyService) {
            this.autoReplyService.handleIncomingMessage(sessionId, from, text)
          }
        }
      },
    )
    await client.initialize()
    this.clients.set(sessionId, client)
  }

  getClient(sessionId: string): WhatsAppClient | undefined {
    return this.clients.get(sessionId)
  }

  async sendMessage(sessionId: string, to: string, text: string) {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }
    await client.sendMessage(to, text)
  }

  async deleteSession(sessionId: string) {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Close the connection
    await client.destroy()

    // Remove from clients map
    this.clients.delete(sessionId)

    // Delete session files
    await this.sessionManager.deleteSession(sessionId)

    console.log(`Session ${sessionId} deleted successfully`)
  }

  async sendBulkMessage(
    sessionId: string,
    recipients: string[],
    text: string,
    delayMs: number = 2000,
  ): Promise<{ recipient: string; status: string; error?: string }[]> {
    const client = this.clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const results: { recipient: string; status: string; error?: string }[] = []

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim()
      if (!recipient) continue

      try {
        await client.sendMessage(recipient, text)
        results.push({ recipient, status: 'success' })
      } catch (error: any) {
        results.push({
          recipient,
          status: 'failed',
          error: error.message,
        })
      }

      // Add delay between messages to prevent rate limiting (except for the last message)
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return results
  }

  async broadcastMessage(
    recipients: string[],
    text: string,
    delayMs: number = 2000,
  ): Promise<{ recipient: string; sessionId: string; status: string; error?: string }[]> {
    const results: {
      recipient: string
      sessionId: string
      status: string
      error?: string
    }[] = []

    for (const recipient of recipients) {
      const trimmedRecipient = recipient.trim()
      if (!trimmedRecipient) continue

      for (const [sessionId, client] of this.clients.entries()) {
        try {
          await client.sendMessage(trimmedRecipient, text)
          results.push({
            recipient: trimmedRecipient,
            sessionId,
            status: 'success',
          })
        } catch (error: any) {
          results.push({
            recipient: trimmedRecipient,
            sessionId,
            status: 'failed',
            error: error.message,
          })
        }

        // Add delay between messages
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return results
  }
}
