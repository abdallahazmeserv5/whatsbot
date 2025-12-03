import mongoose, { Schema, Document } from 'mongoose'

export interface IBroadcastGroup extends Document {
  id: string
  broadcastListId: string
  broadcastJid: string | null
  members: string[]
  memberCount: number
  createdAt: Date
}

const BroadcastGroupSchema = new Schema<IBroadcastGroup>(
  {
    broadcastListId: { type: String, required: true, ref: 'BroadcastList' },
    broadcastJid: { type: String, default: null },
    members: { type: [String], required: true },
    memberCount: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

export const BroadcastGroup = mongoose.model<IBroadcastGroup>(
  'BroadcastGroup',
  BroadcastGroupSchema,
)
