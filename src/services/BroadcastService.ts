import { BroadcastList } from '../models/BroadcastList'
import { BroadcastGroup } from '../models/BroadcastGroup'
import { WhatsAppManager } from '../WhatsAppManager'
import { chunkArray, normalizePhoneNumber } from '../utils/helpers'
import {
  BroadcastCreateRequest,
  BroadcastCreateResponse,
  BroadcastSendRequest,
  BroadcastSendResponse,
  BroadcastGroupInfo,
} from '../types/whatsapp.types'

export class BroadcastService {
  constructor(private whatsAppManager: WhatsAppManager) {}

  /**
   * Create broadcast list with automatic chunking into 256-contact groups
   */
  async createBroadcastList(request: BroadcastCreateRequest): Promise<BroadcastCreateResponse> {
    const { sessionId, name, numbers } = request

    // Validate session
    const client = (this.whatsAppManager as any).clients.get(sessionId)
    if (!client) {
      throw new Error(`Session ${sessionId} not found or not connected`)
    }

    console.log(`Creating broadcast list "${name}" with ${numbers.length} contacts`)

    // Split numbers into chunks of 256
    const chunks = chunkArray(numbers, 256)
    console.log(`Will create ${chunks.length} broadcast groups`)

    // Create broadcast list entity
    const broadcastList = new BroadcastList({
      name,
      sessionId,
      totalMembers: numbers.length,
    })

    await broadcastList.save()

    // Create broadcast groups for each chunk
    const groupInfos: BroadcastGroupInfo[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      try {
        // Note: Baileys doesn't have a direct broadcast API like groupCreate
        // We'll store the groups and send messages individually to each member
        // This simulates broadcast behavior
        const broadcastGroup = new BroadcastGroup({
          broadcastListId: broadcastList.id,
          broadcastJid: `broadcast_${broadcastList.id}_${i}`,
          members: chunk,
          memberCount: chunk.length,
        })

        await broadcastGroup.save()

        groupInfos.push({
          id: broadcastGroup.id,
          broadcastJid: broadcastGroup.broadcastJid || `broadcast_${broadcastList.id}_${i}`,
          members: chunk,
          memberCount: chunk.length,
        })

        console.log(
          `Created broadcast group ${i + 1}/${chunks.length} with ${chunk.length} members`,
        )
      } catch (error: any) {
        console.error(`Failed to create group ${i + 1}:`, error.message)
      }
    }

    return {
      id: broadcastList.id,
      name: broadcastList.name,
      groupCount: groupInfos.length,
      totalMembers: numbers.length,
      groups: groupInfos,
    }
  }

  /**
   * Send message to all groups in a broadcast list
   * Sends to each group (256 numbers) simultaneously, with 10-second delay between groups
   */
  async sendToBroadcastList(
    broadcastListId: string,
    request: BroadcastSendRequest,
  ): Promise<BroadcastSendResponse> {
    const { message } = request

    // Get broadcast list
    const broadcastList = await BroadcastList.findById(broadcastListId)

    if (!broadcastList) {
      throw new Error(`Broadcast list ${broadcastListId} not found`)
    }

    // Get all groups for this broadcast list
    const groups = await BroadcastGroup.find({ broadcastListId: broadcastList.id })

    const client = (this.whatsAppManager as any).clients.get(broadcastList.sessionId)
    if (!client) {
      throw new Error(`Session ${broadcastList.sessionId} not found or not connected`)
    }

    console.log('\n' + '='.repeat(80))
    console.log(`📢 BROADCAST SENDING STARTED`)
    console.log(`Broadcast: ${broadcastList.name}`)
    console.log(`Total Groups: ${groups.length}`)
    console.log(`Total Recipients: ${broadcastList.totalMembers}`)
    console.log(`Strategy: Group-by-group with 10-second delay`)
    console.log(`Within each group: ALL 256 numbers send simultaneously`)
    console.log('='.repeat(80))

    const errors: string[] = []
    let groupsSent = 0
    const startTime = Date.now()

    // Ensure message is a string
    const messageText = String(message || '').trim()
    if (!messageText) {
      throw new Error('Message cannot be empty')
    }

    // Send to each group with 10-second delay between groups
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const groupStartTime = Date.now()

      try {
        console.log(`\n🔥 Group ${i + 1}/${groups.length}:`)
        console.log(`   Members: ${group.memberCount}`)
        console.log(`   Firing ALL ${group.memberCount} messages NOW...`)

        // Send to all members in this group SIMULTANEOUSLY
        await Promise.all(
          group.members.map(async (number: string) => {
            try {
              const jid = normalizePhoneNumber(number)
              await client.sendMessage(jid, messageText)
            } catch (error: any) {
              errors.push(`Failed to send to ${number}: ${error.message}`)
            }
          }),
        )

        const groupDuration = (Date.now() - groupStartTime) / 1000
        groupsSent++

        console.log(`   ✅ Group ${i + 1} complete in ${groupDuration.toFixed(2)}s`)
        console.log(`   Progress: ${groupsSent}/${groups.length} groups sent`)

        // Add 10-second delay BETWEEN groups (not after the last one)
        if (i < groups.length - 1) {
          console.log(`   ⏳ Waiting 10 seconds before next group...`)
          await new Promise((resolve) => setTimeout(resolve, 10000))
        }
      } catch (error: any) {
        errors.push(`Failed to send to group ${group.id}: ${error.message}`)
        console.error(`   ❌ Group ${i + 1} failed: ${error.message}`)
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000

    console.log('\n' + '='.repeat(80))
    console.log(`✅ BROADCAST COMPLETE`)
    console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)} seconds`)
    console.log(`📊 Groups Sent: ${groupsSent}/${groups.length}`)
    console.log(`📊 Total Recipients: ${broadcastList.totalMembers}`)
    console.log(`📊 Errors: ${errors.length}`)
    console.log('='.repeat(80) + '\n')

    return {
      success: true,
      groupsSent,
      totalRecipients: broadcastList.totalMembers,
      errors,
    }
  }

  /**
   * Get all broadcast lists
   */
  async getAllBroadcastLists() {
    return await BroadcastList.find().sort({ createdAt: -1 })
  }

  /**
   * Get broadcast list by ID
   */
  async getBroadcastListById(id: string) {
    return await BroadcastList.findById(id)
  }

  /**
   * Delete broadcast list
   */
  async deleteBroadcastList(id: string): Promise<void> {
    const broadcastList = await BroadcastList.findById(id)

    if (!broadcastList) {
      throw new Error(`Broadcast list ${id} not found`)
    }

    // Delete associated groups
    await BroadcastGroup.deleteMany({ broadcastListId: id })

    // Delete the broadcast list
    await broadcastList.deleteOne()
    console.log(`Deleted broadcast list ${id}`)
  }
}
