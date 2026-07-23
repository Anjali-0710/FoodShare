import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'donor' | 'ngo' | 'admin';
  contactNumber: string;
  address?: string;
  status: 'active' | 'suspended' | 'pending';
  isActive: boolean;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  ngoCapacity?: number;
  foodTypePreference?: string[];
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  isVerified?: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['donor', 'ngo', 'admin'], required: true },
    contactNumber: { type: String, required: true },
    address: { type: String },
    status: { type: String, enum: ['active', 'suspended', 'pending'], default: 'active' },
    isActive: { type: Boolean, default: true },
    gpsLocation: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    ngoCapacity: { type: Number, default: 100 },
    foodTypePreference: { type: [String], default: [] },
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String },
    verificationExpires: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
);

export const User = model<IUser>('User', UserSchema);
export default User;
