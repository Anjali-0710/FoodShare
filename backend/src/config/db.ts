import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async (): Promise<boolean> => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/foodshare';
  
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    console.log('✅ Connected to MongoDB Atlas/Local Database.');
    isConnected = true;
    return true;
  } catch (error: any) {
    console.error('⚠️ MongoDB connection failed:', error.message);
    console.log('ℹ️ Running in memory-fallback mode (demonstration state). No MongoDB server required!');
    isConnected = false;
    return false;
  }
};

export const getDbStatus = () => isConnected;
