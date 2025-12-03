import mongoose, { Schema, Document } from 'mongoose'

export interface IAutoReplyConfig extends Document {
  id: string
  isActive: boolean
  senderNumber: string
  messageContent: string
  createdAt: Date
  updatedAt: Date
}

const AutoReplyConfigSchema = new Schema<IAutoReplyConfig>(
  {
    isActive: { type: Boolean, default: false },
    senderNumber: { type: String, default: '' },
    messageContent: { type: String, default: 'Thank you for contacting us!' },
  },
  {
    timestamps: true,
  },
)

export const AutoReplyConfig = mongoose.model<IAutoReplyConfig>(
  'AutoReplyConfig',
  AutoReplyConfigSchema,
)
