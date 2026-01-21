import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  relatedTo: 'Evidence' | 'Compliance' | 'Data' | 'Score';
  esgArea: 'Environmental' | 'Social' | 'Governance' | 'Overall';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate: Date;
  impact?: string; // e.g., "Environment score +8"
  impactScore?: number; // Estimated score improvement
  source: 'compliance' | 'missing-data' | 'expiring-document' | 'recommendation' | 'manual';
  sourceId?: string; // Reference to the source (e.g., compliance requirement ID, evidence ID)
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  relatedTo: {
    type: String,
    enum: ['Evidence', 'Compliance', 'Data', 'Score'],
    required: true
  },
  esgArea: {
    type: String,
    enum: ['Environmental', 'Social', 'Governance', 'Overall'],
    required: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Overdue'],
    default: 'Pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  impact: {
    type: String,
    trim: true
  },
  impactScore: {
    type: Number
  },
  source: {
    type: String,
    enum: ['compliance', 'missing-data', 'expiring-document', 'recommendation', 'manual'],
    required: true
  },
  sourceId: {
    type: String
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
TaskSchema.index({ companyId: 1, status: 1 });
TaskSchema.index({ companyId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, status: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);

