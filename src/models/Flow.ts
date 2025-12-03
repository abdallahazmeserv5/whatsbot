import mongoose, { Schema, Document } from 'mongoose'

export type FlowTriggerType = 'keyword' | 'message' | 'event'

export interface IFlow extends Document {
  id: string
  name: string
  description: string | null
  triggerType: FlowTriggerType
  keywords: string[] | null
  nodes: any[]
  edges: any[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const FlowSchema = new Schema<IFlow>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    triggerType: {
      type: String,
      enum: ['keyword', 'message', 'event'],
      required: true,
    },
    keywords: { type: [String], default: null },
    nodes: { type: Schema.Types.Mixed, required: true },
    edges: { type: Schema.Types.Mixed, required: true },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
)

export const Flow = mongoose.model<IFlow>('Flow', FlowSchema)
