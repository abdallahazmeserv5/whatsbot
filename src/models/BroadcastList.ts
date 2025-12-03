import mongoose, { Schema, Document } from 'mongoose'

export interface IBroadcastList extends Document {
  id: string
  name: string
  sessionId: string
  totalMembers: number
  createdAt: Date
  updatedAt: Date
}

const BroadcastListSchema = new Schema<IBroadcastList>(
  {
    name: { type: String, required: true },
    sessionId: { type: String, required: true },
    totalMembers: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
)

export const BroadcastList = mongoose.model<IBroadcastList>('BroadcastList', BroadcastListSchema)
