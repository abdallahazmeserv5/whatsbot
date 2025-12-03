import mongoose, { Schema, Document } from 'mongoose'

export interface IContact extends Document {
  id: string
  phoneNumber: string
  name: string | null
  customAttributes: Record<string, any>
  isAutoReplyDisabled: boolean
  autoReplyDisabledUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

const ContactSchema = new Schema<IContact>(
  {
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String, default: null },
    customAttributes: { type: Schema.Types.Mixed, default: {} },
    isAutoReplyDisabled: { type: Boolean, default: false },
    autoReplyDisabledUntil: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
)

export const Contact = mongoose.model<IContact>('Contact', ContactSchema)
