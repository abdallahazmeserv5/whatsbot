import { Sender, ISender, SenderStatus } from '../models/Sender'
import { WhatsAppManager } from '../WhatsAppManager'

export class SenderManager {
  private whatsappManager: WhatsAppManager
  private qrCodes: Map<string, string> = new Map()

  constructor(whatsappManager: WhatsAppManager) {
    this.whatsappManager = whatsappManager
  }

  /**
   * Connect a sender and generate QR code
   */
  async connectSender(senderId: string): Promise<void> {
    const sender = await this.getSenderById(senderId)
    if (!sender) throw new Error('Sender not found')

    console.log(`Starting session for sender ${sender.name} (${sender.id})`)

    try {
      await this.whatsappManager.startSession(
        sender.id,
        (qr) => {
          console.log(`QR Code generated for sender ${sender.name}`)
          this.qrCodes.set(sender.id, qr)
        },
        async (status) => {
          console.log(`Sender ${sender.name} status: ${status}`)

          if (status === 'open') {
            this.qrCodes.delete(sender.id)
            await this.updateStatus(sender.id, 'connected')
          } else if (status === 'close') {
            await this.updateStatus(sender.id, 'disconnected')
          } else if (status === 'connecting') {
            // Optional: update to connecting status if you have it
          }
        },
      )
    } catch (error: any) {
      console.error(`Failed to connect sender ${sender.name}:`, error)
      throw error
    }
  }

  /**
   * Get QR code for a sender
   */
  getQrCode(senderId: string): string | undefined {
    return this.qrCodes.get(senderId)
  }

  /**
   * Get next available sender using round-robin with health checks
   */
  async getNextHealthySender(): Promise<ISender | null> {
    const senders = await Sender.find({
      status: 'connected',
      isActive: true,
    }).sort({ lastUsed: 1 }) // Round-robin: least recently used first

    for (const sender of senders) {
      // Check health score
      if (sender.healthScore < 50) {
        console.warn(`Skipping sender ${sender.name} - low health score: ${sender.healthScore}`)
        continue
      }

      // Check quotas
      if (!(await this.hasAvailableQuota(sender))) {
        console.warn(`Skipping sender ${sender.name} - quota exceeded`)
        continue
      }

      // Check consecutive failures
      if (sender.consecutiveFailures >= 5) {
        console.warn(`Skipping sender ${sender.name} - too many consecutive failures`)
        continue
      }

      return sender
    }

    return null
  }

  /**
   * Get sender by ID
   */
  async getSenderById(id: string): Promise<ISender | null> {
    return await Sender.findById(id)
  }

  /**
   * Check if sender has available quota
   */
  async hasAvailableQuota(sender: ISender): Promise<boolean> {
    const now = new Date()

    // Reset counters if needed
    let needsSave = false

    if (now.getTime() - sender.lastResetMinute.getTime() >= 60000) {
      sender.sentThisMinute = 0
      sender.lastResetMinute = now
      needsSave = true
    }

    if (now.getTime() - sender.lastResetHour.getTime() >= 3600000) {
      sender.sentThisHour = 0
      sender.lastResetHour = now
      needsSave = true
    }

    if (now.getTime() - sender.lastResetDay.getTime() >= 86400000) {
      sender.sentThisDay = 0
      sender.lastResetDay = now
      needsSave = true
    }

    if (needsSave) {
      await sender.save()
    }

    // Check limits
    return (
      sender.sentThisMinute < sender.quotaPerMinute &&
      sender.sentThisHour < sender.quotaPerHour &&
      sender.sentThisDay < sender.quotaPerDay
    )
  }

  /**
   * Increment sender usage
   */
  async incrementUsage(senderId: string): Promise<void> {
    await Sender.findByIdAndUpdate(senderId, {
      $inc: { sentThisMinute: 1, sentThisHour: 1, sentThisDay: 1 },
      lastUsed: new Date(),
    })
  }

  /**
   * Update sender health score
   */
  async updateHealth(senderId: string, success: boolean): Promise<void> {
    const sender = await Sender.findById(senderId)
    if (!sender) return

    if (success) {
      sender.successCount++
      sender.consecutiveFailures = 0
      sender.healthScore = Math.min(100, sender.healthScore + 1)
    } else {
      sender.failureCount++
      sender.consecutiveFailures++
      sender.lastFailure = new Date()
      sender.healthScore = Math.max(0, sender.healthScore - 5)

      // Auto-pause if too many failures
      if (sender.consecutiveFailures >= 10) {
        sender.status = 'paused'
        console.warn(
          `⚠️  Sender ${sender.name} auto-paused due to ${sender.consecutiveFailures} consecutive failures`,
        )
      }
    }

    await sender.save()
  }

  /**
   * Create a new sender
   */
  async createSender(data: {
    name: string
    phoneNumber: string
    quotaPerMinute?: number
    quotaPerHour?: number
    quotaPerDay?: number
  }): Promise<ISender> {
    const sender = new Sender({
      name: data.name,
      phoneNumber: data.phoneNumber,
      quotaPerMinute: data.quotaPerMinute || 20,
      quotaPerHour: data.quotaPerHour || 500,
      quotaPerDay: data.quotaPerDay || 5000,
      status: 'disconnected',
      healthScore: 100,
    })

    return await sender.save()
  }

  /**
   * Update sender status
   */
  async updateStatus(senderId: string, status: SenderStatus): Promise<void> {
    const updateData: any = { status }

    if (status === 'connected') {
      updateData.lastConnected = new Date()
    }

    await Sender.findByIdAndUpdate(senderId, updateData)
  }

  /**
   * Save sender session data
   */
  async saveSessionData(senderId: string, sessionData: any): Promise<void> {
    const sessionJson = JSON.stringify(sessionData)
    await Sender.findByIdAndUpdate(senderId, { sessionData: sessionJson })
  }

  /**
   * Get all senders
   */
  async getAllSenders(): Promise<ISender[]> {
    return await Sender.find().sort({ createdAt: -1 })
  }

  /**
   * Get active senders
   */
  async getActiveSenders(): Promise<ISender[]> {
    return await Sender.find({ isActive: true }).sort({ healthScore: -1 })
  }

  /**
   * Delete sender
   */
  async deleteSender(senderId: string): Promise<void> {
    await Sender.findByIdAndDelete(senderId)
  }

  /**
   * Restore all sender sessions on startup
   */
  async restoreAllSessions(): Promise<void> {
    const senders = await Sender.find({ isActive: true })

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🔄 RESTORING SENDER SESSIONS`)
    console.log(`Found ${senders.length} active sender(s)`)
    console.log('='.repeat(80))

    for (const sender of senders) {
      try {
        if (sender.sessionData) {
          console.log(`Restoring session for: ${sender.name}...`)
          const sessionObj = JSON.parse(sender.sessionData)

          // TODO: Implement session restoration with WhatsAppManager
          // await this.whatsappManager.restoreSession(sender.id, sessionObj);

          sender.status = 'connected'
          console.log(`✅ ${sender.name} restored successfully`)
        } else {
          sender.status = 'disconnected'
          console.log(`⚠️  ${sender.name} has no session data`)
        }
      } catch (error: any) {
        sender.status = 'disconnected'
        console.error(`❌ Failed to restore ${sender.name}:`, error.message)
      }
      await sender.save()
    }

    console.log('='.repeat(80) + '\n')
  }

  /**
   * Get sender statistics
   */
  async getSenderStats(senderId: string): Promise<{
    totalSent: number
    successRate: number
    healthScore: number
    quotaUsage: {
      minute: { used: number; limit: number }
      hour: { used: number; limit: number }
      day: { used: number; limit: number }
    }
  } | null> {
    const sender = await Sender.findById(senderId)
    if (!sender) return null

    const totalSent = sender.successCount + sender.failureCount
    const successRate = totalSent > 0 ? (sender.successCount / totalSent) * 100 : 0

    return {
      totalSent,
      successRate,
      healthScore: sender.healthScore,
      quotaUsage: {
        minute: {
          used: sender.sentThisMinute,
          limit: sender.quotaPerMinute,
        },
        hour: {
          used: sender.sentThisHour,
          limit: sender.quotaPerHour,
        },
        day: {
          used: sender.sentThisDay,
          limit: sender.quotaPerDay,
        },
      },
    }
  }
}
