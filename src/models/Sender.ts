import mongoose, { Schema, Document } from 'mongoose'

export type SenderStatus = 'connected' | 'disconnected' | 'banned' | 'paused'

export interface ISender extends Document {
  id: string
  name: string
  phoneNumber: string
  status: SenderStatus
  sessionData: string | null
  qrCode: string | null
  lastConnected: Date | null
  quotaPerMinute: number
  quotaPerHour: number
  quotaPerDay: number
  sentThisMinute: number
  sentThisHour: number
  sentThisDay: number
  lastResetMinute: Date
  lastResetHour: Date
  lastResetDay: Date
  healthScore: number
  failureCount: number
  successCount: number
  lastFailure: Date | null
  consecutiveFailures: number
  lastUsed: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const SenderSchema = new Schema<ISender>(
  {
    name: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'banned', 'paused'],
      default: 'disconnected',
    },
    sessionData: { type: String, default: null },
    qrCode: { type: String, default: null },
    lastConnected: { type: Date, default: null },
    quotaPerMinute: { type: Number, default: 20 },
    quotaPerHour: { type: Number, default: 500 },
    quotaPerDay: { type: Number, default: 5000 },
    sentThisMinute: { type: Number, default: 0 },
    sentThisHour: { type: Number, default: 0 },
    sentThisDay: { type: Number, default: 0 },
    lastResetMinute: { type: Date, default: Date.now },
    lastResetHour: { type: Date, default: Date.now },
    lastResetDay: { type: Date, default: Date.now },
    healthScore: { type: Number, default: 100 },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    lastFailure: { type: Date, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    lastUsed: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
SenderSchema.index({ status: 1, isActive: 1, healthScore: 1 })

export const Sender = mongoose.model<ISender>('Sender', SenderSchema)
