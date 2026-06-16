import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  contactNumber: string;
  address?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  ngoCapacity?: number; // Only for NGO
  foodTypePreference?: string[]; // Only for NGO/Volunteer
  volunteerScore: number; // Only for Volunteer
  completedPickups: number; // Only for Volunteer
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  isActive?: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], required: true },
  contactNumber: { type: String, required: true },
  address: { type: String },
  gpsLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  ngoCapacity: { type: Number, default: 100 },
  foodTypePreference: { type: [String], default: [] },
  volunteerScore: { type: Number, default: 0 },
  completedPickups: { type: Number, default: 0 },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);
export default User;
