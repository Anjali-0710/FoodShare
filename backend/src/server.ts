import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/db';
import { seedMockDatabase } from './config/mockDb';
import authRoutes from './routes/authRoutes';
import donationRoutes from './routes/donationRoutes';
import volunteerRoutes from './routes/volunteerRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import notificationRoutes from './routes/notificationRoutes';
import locationRoutes from './routes/locationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { notificationInterceptor } from './middleware/notificationInterceptor';

// Load Environment Configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(notificationInterceptor as any);

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount Specific API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Serve static frontend assets (Expo Web Build)
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA Fallback routing (for non-API paths)
app.get('*', (req, res) => {
  // Return JSON 404 for unmatched API routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ success: false, message: 'Resource path not found' });
  }
  res.sendFile(path.resolve(frontendDistPath, 'index.html'));
});


// Startup Orchestrator
const startServer = async () => {
  // Try connecting to database
  await connectDB();
  
  // Seed local structures for both mock memory state and Mongo
  await seedMockDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 FoodShare AI Backend listening on http://localhost:${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
