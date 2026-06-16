import { Schema, model, Document, Types } from 'mongoose';

export type DonationStatus = 'Pending' | 'Accepted' | 'Assigned' | 'Picked Up' | 'Delivered' | 'Completed' | 'Cancelled';

export interface IDonation extends Document {
  foodType: 'Cooked Food' | 'Vegetables' | 'Fruits' | 'Bakery Items' | 'Beverages' | 'Grocery Items';
  quantity: number;
  unit: 'Kg' | 'Liters' | 'Plates' | 'Packets';
  bestBeforeDate: Date;
  preparationTime: Date;
  temperature: number; // in Celsius, for freshness prediction
  donorId: Types.ObjectId | string;
  ngoId?: Types.ObjectId | string;
  volunteerId?: Types.ObjectId | string;
  status: DonationStatus;
  pickupAddress: string;
  gpsLocation: {
    latitude: number;
    longitude: number;
  };
  contactNumber: string;
  additionalNotes?: string;
  imageUrls: string[];
  freshnessScore?: number; // AI-predicted usability percentage (0-100)
  qrCode: string; // QR Verification code
  createdAt: Date;
}

const DonationSchema = new Schema<IDonation>({
  foodType: { 
    type: String, 
    enum: ['Cooked Food', 'Vegetables', 'Fruits', 'Bakery Items', 'Beverages', 'Grocery Items'], 
    required: true 
  },
  quantity: { type: Number, required: true },
  unit: { type: String, enum: ['Kg', 'Liters', 'Plates', 'Packets'], required: true },
  bestBeforeDate: { type: Date, required: true },
  preparationTime: { type: Date, default: Date.now },
  temperature: { type: Number, default: 25 },
  donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ngoId: { type: Schema.Types.ObjectId, ref: 'User' },
  volunteerId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Assigned', 'Picked Up', 'Delivered', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  pickupAddress: { type: String, required: true },
  gpsLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  contactNumber: { type: String, required: true },
  additionalNotes: { type: String },
  imageUrls: { type: [String], default: [] },
  freshnessScore: { type: Number },
  qrCode: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

export const Donation = model<IDonation>('Donation', DonationSchema);
export default Donation;
