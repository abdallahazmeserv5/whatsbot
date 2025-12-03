import { Campaign, ICampaign, CampaignStatus } from '../models/Campaign'
import { CampaignContact, ICampaignContact } from '../models/CampaignContact'
import { Blocklist } from '../models/Blocklist'
import { Queue } from 'bullmq'

export class CampaignManager {
  private messageQueue: Queue | null = null

  constructor() {
    // BullMQ queue is optional - only initialize if Redis is available
    // Will be initialized on first use in startCampaign()
  }

  /**
   * Create campaign and upload contacts
   */
  async createCampaign(data: {
    name: string
    template: string
    contacts: Array<{
      phoneNumber: string
      variables?: Record<string, string>
    }>
    scheduledStart?: Date
    scheduledEnd?: Date
    timeWindowStart?: string
    timeWindowEnd?: string
    minDelay?: number
    maxDelay?: number
    enableTyping?: boolean
    senderIds?: string[]
  }): Promise<ICampaign> {
    // Filter out blocked numbers
    const blockedNumbers = await Blocklist.find()
    const blockedSet = new Set(blockedNumbers.map((b) => b.phoneNumber))

    const validContacts = data.contacts.filter((c) => !blockedSet.has(c.phoneNumber))

    if (validContacts.length === 0) {
      throw new Error('No valid contacts after filtering blocklist')
    }

    // Create campaign
    const campaign = new Campaign({
      name: data.name,
      template: data.template,
      status: 'draft',
      totalRecipients: validContacts.length,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      timeWindowStart: data.timeWindowStart,
      timeWindowEnd: data.timeWindowEnd,
      minDelay: data.minDelay || 2000,
      maxDelay: data.maxDelay || 5000,
      enableTyping: data.enableTyping !== false,
      senderIds: data.senderIds || null,
    })

    await campaign.save()

    // Create contacts
    const contacts = validContacts.map(
      (c) =>
        new CampaignContact({
          campaignId: campaign.id,
          phoneNumber: c.phoneNumber,
          variables: c.variables || {},
          status: 'pending',
        }),
    )

    await CampaignContact.insertMany(contacts)

    console.log(`✅ Campaign "${campaign.name}" created with ${validContacts.length} contacts`)
    if (data.contacts.length > validContacts.length) {
      console.log(
        `⚠️  Filtered out ${data.contacts.length - validContacts.length} blocked number(s)`,
      )
    }

    return campaign
  }

  /**
   * Start campaign - queue all messages
   */
  async startCampaign(campaignId: string): Promise<void> {
    // Initialize queue if not already done
    if (!this.messageQueue) {
      try {
        this.messageQueue = new Queue('message-queue', {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
        })
      } catch (error) {
        throw new Error(
          'Redis is required for campaigns. Please install and start Redis, or use the Auto Reply feature instead.',
        )
      }
    }

    const campaign = await Campaign.findById(campaignId)

    if (!campaign) throw new Error('Campaign not found')

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new Error(`Cannot start campaign with status: ${campaign.status}`)
    }

    // Get all pending contacts
    const contacts = await CampaignContact.find({ campaignId, status: 'pending' })

    if (contacts.length === 0) {
      throw new Error('No pending contacts to send')
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`🚀 STARTING CAMPAIGN: ${campaign.name}`)
    console.log(`Total Contacts: ${contacts.length}`)
    console.log(`Min Delay: ${campaign.minDelay}ms`)
    console.log(`Max Delay: ${campaign.maxDelay}ms`)
    console.log('='.repeat(80))

    // Queue messages with staggered delays
    let cumulativeDelay = 0
    for (const contact of contacts) {
      await this.messageQueue.add(
        'send-message',
        {
          contactId: contact.id,
          campaignId: campaign.id,
          message: campaign.template,
          variables: contact.variables,
          senderIds: campaign.senderIds,
        },
        {
          delay: cumulativeDelay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      )

      contact.status = 'queued'
      contact.queuedAt = new Date()

      // Random delay between messages
      const randomDelay =
        Math.random() * (campaign.maxDelay - campaign.minDelay) + campaign.minDelay
      cumulativeDelay += randomDelay
    }

    await CampaignContact.bulkSave(contacts)

    // Update campaign
    campaign.status = 'running'
    campaign.startedAt = new Date()
    await campaign.save()

    console.log(`✅ Queued ${contacts.length} messages`)
    console.log(`⏱️  Estimated completion: ${Math.round(cumulativeDelay / 60000)} minutes`)
    console.log('='.repeat(80) + '\n')
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = await Campaign.findById(campaignId)

    if (!campaign) throw new Error('Campaign not found')

    campaign.status = 'paused'
    await campaign.save()

    console.log(`⏸️  Campaign "${campaign.name}" paused`)
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = await Campaign.findById(campaignId)

    if (!campaign) throw new Error('Campaign not found')

    if (campaign.status !== 'paused') {
      throw new Error('Can only resume paused campaigns')
    }

    campaign.status = 'running'
    await campaign.save()

    console.log(`▶️  Campaign "${campaign.name}" resumed`)
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<ICampaign | null> {
    return await Campaign.findById(id)
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(): Promise<ICampaign[]> {
    return await Campaign.find().sort({ createdAt: -1 })
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<{
    total: number
    pending: number
    queued: number
    sent: number
    delivered: number
    read: number
    failed: number
    successRate: number
  } | null> {
    const campaign = await Campaign.findById(campaignId)
    if (!campaign) return null

    const contacts = await CampaignContact.find({ campaignId })

    const stats = {
      total: contacts.length,
      pending: contacts.filter((c) => c.status === 'pending').length,
      queued: contacts.filter((c) => c.status === 'queued').length,
      sent: contacts.filter((c) => c.status === 'sent').length,
      delivered: contacts.filter((c) => c.status === 'delivered').length,
      read: contacts.filter((c) => c.status === 'read').length,
      failed: contacts.filter((c) => c.status === 'failed').length,
      successRate: 0,
    }

    const completed = stats.sent + stats.delivered + stats.read + stats.failed
    if (completed > 0) {
      stats.successRate = ((stats.sent + stats.delivered + stats.read) / completed) * 100
    }

    return stats
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    // Delete associated contacts
    await CampaignContact.deleteMany({ campaignId })

    // Delete campaign
    await Campaign.findByIdAndDelete(campaignId)
    console.log(`🗑️  Campaign deleted: ${campaignId}`)
  }

  /**
   * Update contact status
   */
  async updateContactStatus(
    contactId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    const contact = await CampaignContact.findById(contactId)
    if (!contact) return

    contact.status = status

    switch (status) {
      case 'sent':
        contact.sentAt = new Date()
        break
      case 'delivered':
        contact.deliveredAt = new Date()
        break
      case 'read':
        contact.readAt = new Date()
        break
      case 'failed':
        contact.failedAt = new Date()
        contact.errorMessage = errorMessage || null
        contact.attemptCount++
        break
    }

    await contact.save()

    // Update campaign counters
    await this.updateCampaignCounters(contact.campaignId)
  }

  /**
   * Update campaign counters
   */
  private async updateCampaignCounters(campaignId: string): Promise<void> {
    const stats = await this.getCampaignStats(campaignId)
    if (!stats) return

    await Campaign.findByIdAndUpdate(campaignId, {
      processedCount: stats.sent + stats.delivered + stats.read + stats.failed,
      successCount: stats.sent + stats.delivered + stats.read,
      failedCount: stats.failed,
    })

    // Check if campaign is complete
    if (stats.pending === 0 && stats.queued === 0) {
      await Campaign.findByIdAndUpdate(campaignId, {
        status: 'completed',
        completedAt: new Date(),
      })
      console.log(`✅ Campaign ${campaignId} completed`)
    }
  }
}
