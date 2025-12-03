import mongoose, { Schema, Document } from 'mongoose'

export type BlocklistReason = 'opt_out' | 'spam' | 'manual'

export interface IBlocklist extends Document {
  id: string
  phoneNumber: string
  reason: BlocklistReason
  addedAt: Date
  notes: string | null
}

const BlocklistSchema = new Schema<IBlocklist>(
  {
    phoneNumber: { type: String, required: true, unique: true },
    reason: {
      type: String,
      enum: ['opt_out', 'spam', 'manual'],
      default: 'manual',
    },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, default: null },
  },
  {
    timestamps: false,
  },
)

// Index for performance
BlocklistSchema.index({ phoneNumber: 1 }, { unique: true })

export const Blocklist = mongoose.model<IBlocklist>('Blocklist', BlocklistSchema)
