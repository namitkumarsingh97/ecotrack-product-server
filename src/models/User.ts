import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
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
  plan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    default: 'starter'
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

export default mongoose.model<IUser>('User', UserSchema);

