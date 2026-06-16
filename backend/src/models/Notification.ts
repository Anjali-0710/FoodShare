import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId | string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  type: string;
  title: string;
  message: string;
  donationId?: Types.ObjectId | string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  donationId: { type: Schema.Types.ObjectId, ref: 'Donation' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Notification = model<INotification>('Notification', NotificationSchema);
export default Notification;
