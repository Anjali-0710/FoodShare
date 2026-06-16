import { Schema, model, Document } from 'mongoose';

export interface ISystemLog extends Document {
  action: string;
  performedBy: string; // User email or ID
  role: string;
  details: string;
  timestamp: Date;
}

const SystemLogSchema = new Schema<ISystemLog>({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  role: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const SystemLog = model<ISystemLog>('SystemLog', SystemLogSchema);
export default SystemLog;
