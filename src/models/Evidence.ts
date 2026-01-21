import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidence extends Document {
  companyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  evidenceType: string; // e.g., "Electricity Bill", "POSH Policy", "GST Return"
  esgArea: 'Environmental' | 'Social' | 'Governance';
  linkedTo?: string; // Metric or data point it's linked to (e.g., "Energy Consumption", "Policy", "Compliance")
  status: 'Linked' | 'Missing' | 'Pending';
  tags?: {
    esgCategory: 'E' | 'S' | 'G';
    metric?: string; // e.g., "Energy", "Policy", "Training"
    year?: number;
    period?: string;
  };
  expiryDate?: Date;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema: Schema = new Schema({
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
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  evidenceType: {
    type: String,
    required: true,
    trim: true
  },
  esgArea: {
    type: String,
    enum: ['Environmental', 'Social', 'Governance'],
    required: true
  },
  linkedTo: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Linked', 'Missing', 'Pending'],
    default: 'Pending'
  },
  tags: {
    esgCategory: {
      type: String,
      enum: ['E', 'S', 'G']
    },
    metric: {
      type: String,
      trim: true
    },
    year: {
      type: Number
    },
    period: {
      type: String
    }
  },
  expiryDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
EvidenceSchema.index({ companyId: 1, esgArea: 1 });
EvidenceSchema.index({ companyId: 1, status: 1 });
EvidenceSchema.index({ expiryDate: 1 });

export default mongoose.model<IEvidence>('Evidence', EvidenceSchema);

