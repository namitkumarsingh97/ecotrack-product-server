import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  companyId?: mongoose.Types.ObjectId; // Company (client) this user belongs to
  plan?: 'starter' | 'pro' | 'enterprise'; // Deprecated: Plan is now on Company. Kept for backward compatibility
  role: 'ADMIN' | 'USER' | 'AUDITOR';
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  plan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    default: null,
    required: false // Deprecated: Plan is now on Company
  },
  role: {
    type: String,
    enum: ['ADMIN', 'USER', 'AUDITOR'],
    default: 'USER'
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries by company
UserSchema.index({ companyId: 1 });

export default mongoose.model<IUser>('User', UserSchema);

