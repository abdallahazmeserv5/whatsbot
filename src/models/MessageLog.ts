import mongoose, { Schema, Document } from 'mongoose'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

export interface IMessageLog extends Document {
  id: string
  campaignId: string | null
  contactId: string | null
  phoneNumber: string
  senderId: string
  message: string
  status: MessageStatus
  sentAt: Date
  deliveredAt: Date | null
  readAt: Date | null
  error: string | null
  metadata: any
}

const MessageLogSchema = new Schema<IMessageLog>(
  {
    campaignId: { type: String, default: null, ref: 'Campaign' },
    contactId: { type: String, default: null, ref: 'CampaignContact' },
    phoneNumber: { type: String, required: true },
    senderId: { type: String, required: true, ref: 'Sender' },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    error: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  {
    timestamps: false, // Using sentAt instead
  },
)

// Indexes for performance
MessageLogSchema.index({ campaignId: 1, sentAt: -1 })
MessageLogSchema.index({ senderId: 1, sentAt: -1 })
MessageLogSchema.index({ status: 1 })

export const MessageLog = mongoose.model<IMessageLog>('MessageLog', MessageLogSchema)
