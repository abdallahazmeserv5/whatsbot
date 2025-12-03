import { Worker, Job } from 'bullmq'
import { SenderManager } from '../services/SenderManager'
import { CampaignManager } from '../services/CampaignManager'
import { WhatsAppManager } from '../WhatsAppManager'
import { MessageLog } from '../models/MessageLog'
import { CampaignContact } from '../models/CampaignContact'
import { normalizePhoneNumber } from '../utils/helpers'

interface MessageJob {
  contactId: string
  campaignId: string
  message: string
  variables?: Record<string, string>
  senderIds?: string[] | null // Specific senders, or null for auto
}

export function createMessageWorker(
  senderManager: SenderManager,
  campaignManager: CampaignManager,
  whatsappManager: WhatsAppManager,
) {
  const worker = new Worker<MessageJob>(
    'message-queue',
    async (job: Job<MessageJob>) => {
      const { contactId, campaignId, message, variables, senderIds } = job.data

      console.log(`\n📨 Processing message job for contact: ${contactId}`)

      // Select sender
      let sender
      if (senderIds && senderIds.length > 0) {
        // Use specific senders (round-robin among them)
        for (const senderId of senderIds) {
          const s = await senderManager.getSenderById(senderId)
          if (s && s.status === 'connected' && (await senderManager.hasAvailableQuota(s))) {
            sender = s
            break
          }
        }
      } else {
        // Auto-select healthy sender
        sender = await senderManager.getNextHealthySender()
      }

      if (!sender) {
        throw new Error('No healthy sender available')
      }

      console.log(`📱 Using sender: ${sender.name} (${sender.phoneNumber})`)

      // Check quota
      if (!(await senderManager.hasAvailableQuota(sender))) {
        throw new Error(`Sender ${sender.name} quota exceeded`)
      }

      // Personalize message
      let personalizedMessage = message
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          personalizedMessage = personalizedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value)
        }
      }

      // Get contact info
      // Ensure contactId is a string (MongoDB ObjectIds can be passed as strings)
      const contactIdStr = typeof contactId === 'string' ? contactId : String(contactId)
      const contact = await CampaignContact.findById(contactIdStr)
      if (!contact) throw new Error(`Contact not found: ${contactIdStr}`)

      const jid = normalizePhoneNumber(contact.phoneNumber)

      // Human-like delay before starting
      const preDelay = Math.random() * (3000 - 1000) + 1000 // 1-3 seconds
      console.log(`⏳ Pre-delay: ${Math.round(preDelay)}ms`)
      await new Promise((resolve) => setTimeout(resolve, preDelay))

      // Get WhatsApp client
      const client = whatsappManager.getClient(sender.id)
      if (!client) {
        throw new Error(`WhatsApp client not found for sender ${sender.name}`)
      }

      // Get the socket for presence updates
      const socket = client.getSocket()
      if (!socket) {
        throw new Error(`WhatsApp socket not initialized for sender ${sender.name}`)
      }

      try {
        // Typing simulation
        console.log(`⌨️  Simulating typing...`)
        await socket.presenceSubscribe(jid)
        await socket.sendPresenceUpdate('composing', jid)

        // Random typing duration based on message length
        const baseTypingTime = personalizedMessage.length * 50 // 50ms per character
        const typingDuration = baseTypingTime + Math.random() * (2000 - 500) + 500 // Add 0.5-2s jitter
        const cappedTyping = Math.min(typingDuration, 5000) // Max 5 seconds
        console.log(`⌨️  Typing for: ${Math.round(cappedTyping)}ms`)
        await new Promise((resolve) => setTimeout(resolve, cappedTyping))

        // Send message
        console.log(`📤 Sending message...`)
        const result = await socket.sendMessage(jid, {
          text: personalizedMessage,
        })

        // Stop typing
        await socket.sendPresenceUpdate('paused', jid)

        // Update contact status
        await campaignManager.updateContactStatus(contactId, 'sent')

        // Log message
        const messageLog = new MessageLog({
          campaignId,
          contactId,
          phoneNumber: contact.phoneNumber,
          senderId: sender.id,
          message: personalizedMessage,
          status: 'sent',
          sentAt: new Date(),
        })
        await messageLog.save()

        // Update sender metrics
        await senderManager.incrementUsage(sender.id)
        await senderManager.updateHealth(sender.id, true)

        console.log(`✅ Message sent successfully to ${contact.phoneNumber}`)

        return {
          success: true,
          messageId: result?.key?.id || 'unknown',
          senderId: sender.id,
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`❌ Failed to send message: ${errorMessage}`)

        // Stop typing if error
        try {
          await socket.sendPresenceUpdate('paused', jid)
        } catch {}

        // Update contact as failed
        await campaignManager.updateContactStatus(contactId, 'failed', errorMessage)

        // Update sender health
        await senderManager.updateHealth(sender.id, false)

        throw error
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: 5, // Process 5 messages simultaneously
      limiter: {
        max: 20, // Max 20 jobs
        duration: 60000, // per minute (global rate limit)
      },
    },
  )

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`)
  })

  worker.on('failed', async (job, error) => {
    if (job) {
      console.error(`❌ Job ${job.id} failed: ${error.message}`)

      // Retry with exponential backoff
      if (job.attemptsMade < 3) {
        const delay = Math.pow(2, job.attemptsMade) * 2000 // 2s, 4s, 8s
        console.log(`🔄 Retrying job ${job.id} in ${delay}ms (attempt ${job.attemptsMade + 1}/3)`)
      } else {
        console.error(`⛔ Job ${job.id} exhausted all retries`)
      }
    }
  })

  worker.on('error', (error) => {
    console.error(`Worker error: ${error.message}`)
  })

  console.log('✅ Message worker started')

  return worker
}
