import mongoose, { Schema, Document } from 'mongoose'

export type FlowExecutionStatus = 'running' | 'completed' | 'paused' | 'failed'

export interface IFlowExecution extends Document {
  id: string
  flowId: string
  contactId: string
  currentNodeId: string
  variables: Record<string, any>
  status: FlowExecutionStatus
  startedAt: Date
  updatedAt: Date
}

const FlowExecutionSchema = new Schema<IFlowExecution>(
  {
    flowId: { type: String, required: true, ref: 'Flow' },
    contactId: { type: String, required: true, ref: 'Contact' },
    currentNodeId: { type: String, required: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['running', 'completed', 'paused', 'failed'],
      default: 'running',
    },
    startedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
)

export const FlowExecution = mongoose.model<IFlowExecution>('FlowExecution', FlowExecutionSchema)
