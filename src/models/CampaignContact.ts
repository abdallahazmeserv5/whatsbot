import mongoose, { Schema, Document } from 'mongoose'

export type CampaignContactStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ICampaignContact extends Document {
  id: string
  campaignId: string
  phoneNumber: string
  variables: Record<string, string>
  status: CampaignContactStatus
  assignedSenderId: string | null
  attemptCount: number
  lastAttempt: Date | null
  errorMessage: string | null
  queuedAt: Date | null
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  failedAt: Date | null
  createdAt: Date
}

const CampaignContactSchema = new Schema<ICampaignContact>(
  {
    campaignId: { type: String, required: true, ref: 'Campaign' },
    phoneNumber: { type: String, required: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'pending',
    },
    assignedSenderId: { type: String, default: null },
    attemptCount: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    queuedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

// Indexes for performance
CampaignContactSchema.index({ campaignId: 1, status: 1 })
CampaignContactSchema.index({ phoneNumber: 1 })

export const CampaignContact = mongoose.model<ICampaignContact>(
  'CampaignContact',
  CampaignContactSchema,
)
