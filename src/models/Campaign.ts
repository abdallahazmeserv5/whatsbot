import mongoose, { Schema, Document } from 'mongoose'

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
export type MediaType = 'image' | 'video' | 'document' | null

export interface ICampaign extends Document {
  id: string
  name: string
  status: CampaignStatus
  template: string
  mediaUrl: string | null
  mediaType: MediaType
  totalRecipients: number
  processedCount: number
  successCount: number
  failedCount: number
  scheduledStart: Date | null
  scheduledEnd: Date | null
  timeWindowStart: string | null
  timeWindowEnd: string | null
  timezone: string
  minDelay: number
  maxDelay: number
  enableTyping: boolean
  enableReadReceipts: boolean
  senderIds: string[] | null
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'failed'],
      default: 'draft',
    },
    template: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'document', null],
      default: null,
    },
    totalRecipients: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    timeWindowStart: { type: String, default: null },
    timeWindowEnd: { type: String, default: null },
    timezone: { type: String, default: 'UTC' },
    minDelay: { type: Number, default: 2000 },
    maxDelay: { type: Number, default: 5000 },
    enableTyping: { type: Boolean, default: true },
    enableReadReceipts: { type: Boolean, default: false },
    senderIds: { type: [String], default: null },
    createdBy: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
CampaignSchema.index({ status: 1, createdAt: -1 })

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema)
