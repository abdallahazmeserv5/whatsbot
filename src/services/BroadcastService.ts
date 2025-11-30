import { AppDataSource } from "../data-source";
import { BroadcastList } from "../entities/BroadcastList";
import { BroadcastGroup } from "../entities/BroadcastGroup";
import { WhatsAppManager } from "../WhatsAppManager";
import { chunkArray, normalizePhoneNumber } from "../utils/helpers";
import {
  BroadcastCreateRequest,
  BroadcastCreateResponse,
  BroadcastSendRequest,
  BroadcastSendResponse,
  BroadcastGroupInfo,
} from "../types/whatsapp.types";
import { Repository } from "typeorm";

export class BroadcastService {
  private get broadcastListRepo(): Repository<BroadcastList> {
    return AppDataSource.getRepository(BroadcastList);
  }

  private get broadcastGroupRepo(): Repository<BroadcastGroup> {
    return AppDataSource.getRepository(BroadcastGroup);
  }

  constructor(private whatsAppManager: WhatsAppManager) {}

  /**
   * Create broadcast list with automatic chunking into 256-contact groups
   */
  async createBroadcastList(
    request: BroadcastCreateRequest
  ): Promise<BroadcastCreateResponse> {
    const { sessionId, name, numbers } = request;

    // Validate session
    const client = (this.whatsAppManager as any).clients.get(sessionId);
    if (!client) {
      throw new Error(`Session ${sessionId} not found or not connected`);
    }

    console.log(
      `Creating broadcast list "${name}" with ${numbers.length} contacts`
    );

    // Split numbers into chunks of 256
    const chunks = chunkArray(numbers, 256);
    console.log(`Will create ${chunks.length} broadcast groups`);

    // Create broadcast list entity
    const broadcastList = this.broadcastListRepo.create({
      name,
      sessionId,
      totalMembers: numbers.length,
      groups: [],
    });

    await this.broadcastListRepo.save(broadcastList);

    // Create broadcast groups for each chunk
    const groupInfos: BroadcastGroupInfo[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Note: Baileys doesn't have a direct broadcast API like groupCreate
        // We'll store the groups and send messages individually to each member
        // This simulates broadcast behavior
        const broadcastGroup = this.broadcastGroupRepo.create({
          broadcastListId: broadcastList.id,
          broadcastJid: `broadcast_${broadcastList.id}_${i}`,
          members: chunk,
          memberCount: chunk.length,
        });

        await this.broadcastGroupRepo.save(broadcastGroup);

        groupInfos.push({
          id: broadcastGroup.id,
          broadcastJid: broadcastGroup.broadcastJid,
          members: chunk,
          memberCount: chunk.length,
        });

        console.log(
          `Created broadcast group ${i + 1}/${chunks.length} with ${
            chunk.length
          } members`
        );
      } catch (error: any) {
        console.error(`Failed to create group ${i + 1}:`, error.message);
      }
    }

    return {
      id: broadcastList.id,
      name: broadcastList.name,
      groupCount: groupInfos.length,
      totalMembers: numbers.length,
      groups: groupInfos,
    };
  }

  /**
   * Send message to all groups in a broadcast list
   * Sends to each group (256 numbers) simultaneously, with 10-second delay between groups
   */
  async sendToBroadcastList(
    broadcastListId: string,
    request: BroadcastSendRequest
  ): Promise<BroadcastSendResponse> {
    const { message } = request;

    // Get broadcast list with groups
    const broadcastList = await this.broadcastListRepo.findOne({
      where: { id: broadcastListId },
      relations: ["groups"],
    });

    if (!broadcastList) {
      throw new Error(`Broadcast list ${broadcastListId} not found`);
    }

    const client = (this.whatsAppManager as any).clients.get(
      broadcastList.sessionId
    );
    if (!client) {
      throw new Error(
        `Session ${broadcastList.sessionId} not found or not connected`
      );
    }

    console.log("\n" + "=".repeat(80));
    console.log(`📢 BROADCAST SENDING STARTED`);
    console.log(`Broadcast: ${broadcastList.name}`);
    console.log(`Total Groups: ${broadcastList.groups.length}`);
    console.log(`Total Recipients: ${broadcastList.totalMembers}`);
    console.log(`Strategy: Group-by-group with 10-second delay`);
    console.log(`Within each group: ALL 256 numbers send simultaneously`);
    console.log("=".repeat(80));

    const errors: string[] = [];
    let groupsSent = 0;
    const startTime = Date.now();

    // Ensure message is a string
    const messageText = String(message || "").trim();
    if (!messageText) {
      throw new Error("Message cannot be empty");
    }

    // Send to each group with 10-second delay between groups
    for (let i = 0; i < broadcastList.groups.length; i++) {
      const group = broadcastList.groups[i];
      const groupStartTime = Date.now();

      try {
        console.log(`\n🔥 Group ${i + 1}/${broadcastList.groups.length}:`);
        console.log(`   Members: ${group.memberCount}`);
        console.log(`   Firing ALL ${group.memberCount} messages NOW...`);

        // Send to all members in this group SIMULTANEOUSLY
        await Promise.all(
          group.members.map(async (number: string) => {
            try {
              const jid = normalizePhoneNumber(number);
              await client.sendMessage(jid, messageText);
            } catch (error: any) {
              errors.push(`Failed to send to ${number}: ${error.message}`);
            }
          })
        );

        const groupDuration = (Date.now() - groupStartTime) / 1000;
        groupsSent++;

        console.log(
          `   ✅ Group ${i + 1} complete in ${groupDuration.toFixed(2)}s`
        );
        console.log(
          `   Progress: ${groupsSent}/${broadcastList.groups.length} groups sent`
        );

        // Add 10-second delay BETWEEN groups (not after the last one)
        if (i < broadcastList.groups.length - 1) {
          console.log(`   ⏳ Waiting 10 seconds before next group...`);
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      } catch (error: any) {
        errors.push(`Failed to send to group ${group.id}: ${error.message}`);
        console.error(`   ❌ Group ${i + 1} failed: ${error.message}`);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;

    console.log("\n" + "=".repeat(80));
    console.log(`✅ BROADCAST COMPLETE`);
    console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`📊 Groups Sent: ${groupsSent}/${broadcastList.groups.length}`);
    console.log(`📊 Total Recipients: ${broadcastList.totalMembers}`);
    console.log(`📊 Errors: ${errors.length}`);
    console.log("=".repeat(80) + "\n");

    return {
      success: true,
      groupsSent,
      totalRecipients: broadcastList.totalMembers,
      errors,
    };
  }

  /**
   * Get all broadcast lists
   */
  async getAllBroadcastLists(): Promise<BroadcastList[]> {
    return await this.broadcastListRepo.find({
      relations: ["groups"],
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get broadcast list by ID
   */
  async getBroadcastListById(id: string): Promise<BroadcastList | null> {
    return await this.broadcastListRepo.findOne({
      where: { id },
      relations: ["groups"],
    });
  }

  /**
   * Delete broadcast list
   */
  async deleteBroadcastList(id: string): Promise<void> {
    const broadcastList = await this.broadcastListRepo.findOne({
      where: { id },
    });

    if (!broadcastList) {
      throw new Error(`Broadcast list ${id} not found`);
    }

    await this.broadcastListRepo.remove(broadcastList);
    console.log(`Deleted broadcast list ${id}`);
  }
}
