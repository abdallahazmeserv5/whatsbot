import { AutoReplyConfig } from '../models/AutoReplyConfig'
import axios from 'axios'

export class AutoReplyService {
  private manager: any
  private config: typeof AutoReplyConfig.prototype | null = null
  private replyDelay = 2000 // 2 seconds

  constructor(manager: any) {
    this.manager = manager
    this.loadConfig()
  }

  private async loadConfig() {
    try {
      this.config = await AutoReplyConfig.findOne()
      console.log('📋 Auto-reply config loaded:', this.config)
    } catch (e) {
      console.error('❌ Error loading auto-reply config:', e)
    }
  }

  async handleIncomingMessage(receivedOnSession: string, from: string, _text: string) {
    // Fire and forget
    this.sendAutoReplyAsync(receivedOnSession, from, _text).catch((err) => {
      console.error('❌ Auto-reply background error:', err)
    })
  }

  private async sendAutoReplyAsync(receivedOnSession: string, from: string, _text: string) {
    try {
      console.log(`\n🤖 ===== Auto-reply triggered =====`)
      console.log(`📥 Message from ${from} on session: ${receivedOnSession}`)

      await this.loadConfig()
      if (!this.config) return console.log('⚠️ No config found')

      if (!this.config.isActive) {
        console.log('⏸️ Auto-reply is disabled')
        return
      }

      if (!this.config.messageContent) {
        console.log('⚠️ No message content configured')
        return
      }

      // KEY CHANGE: Use senderNumber if configured, otherwise use receiving session
      let sessionToUse = receivedOnSession

      if (this.config.senderNumber && this.config.senderNumber.trim()) {
        // Use the configured sender session (DIFFERENT from receiving session)
        sessionToUse = this.config.senderNumber
        console.log(
          `📤 Using configured sender session: ${sessionToUse} (received on: ${receivedOnSession})`,
        )
      } else {
        console.log(`📤 Using receiving session: ${sessionToUse}`)
      }

      // Wait for stabilization
      console.log(`⏳ Waiting ${this.replyDelay}ms...`)
      await new Promise((res) => setTimeout(res, this.replyDelay))

      const to = from
      const messageText = this.config.messageContent

      console.log(`📤 Sending auto-reply via HTTP from ${sessionToUse} to ${to}`)

      await axios.post('http://localhost:3001/message/send', {
        sessionId: sessionToUse,
        to: to,
        text: messageText,
      })

      console.log('✅ Auto-reply sent successfully!')
    } catch (error: any) {
      console.error('❌ Failed to send auto-reply:', error.response?.data || error.message)
    }
  }

  async getConfig() {
    let config = await AutoReplyConfig.findOne()

    if (!config) {
      config = new AutoReplyConfig({
        isActive: false,
        senderNumber: '',
        messageContent: 'Thank you for contacting us!',
      })
      await config.save()
    }

    return config
  }

  async updateConfig(data: { isActive: boolean; senderNumber: string; messageContent: string }) {
    let config = await AutoReplyConfig.findOne()

    if (!config) {
      config = new AutoReplyConfig(data)
    } else {
      Object.assign(config, data)
    }

    await config.save()

    this.config = config
    console.log('✅ Auto-reply config updated')

    return config
  }
}
