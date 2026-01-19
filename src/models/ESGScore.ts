import mongoose, { Schema, Document } from 'mongoose';

export interface IESGScore extends Document {
  companyId: mongoose.Types.ObjectId;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  overallScore: number;
  period: string;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ESGScoreSchema: Schema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  environmentalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  socialScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  governanceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  period: {
    type: String,
    required: true
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model<IESGScore>('ESGScore', ESGScoreSchema);

