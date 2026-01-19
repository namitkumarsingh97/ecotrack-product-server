import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  industry: string;
  employeeCount: number;
  annualRevenue: number;
  location: string;
  reportingYear: number;
  customFeatures?: string[]; // Array of custom feature IDs enabled for this company
  featureOverrides?: Record<string, boolean>; // Override specific features
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    required: true,
    enum: ['Manufacturing', 'IT/Software', 'Textiles', 'Pharmaceuticals', 'Food Processing', 'Automotive', 'Chemicals', 'Others']
  },
  employeeCount: {
    type: Number,
    required: true,
    min: 10,
    max: 500
  },
  annualRevenue: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  reportingYear: {
    type: Number,
    required: true,
    min: 2020,
    max: 2030
  },
  customFeatures: {
    type: [String],
    default: []
  },
  featureOverrides: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, {
  timestamps: true
});

export default mongoose.model<ICompany>('Company', CompanySchema);

