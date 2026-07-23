import dotenv from 'dotenv';
// Load Environment Configurations
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/authRoutes';
import donationRoutes from './routes/donationRoutes';
import volunteerRoutes from './routes/volunteerRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notificationRoutes';
import locationRoutes from './routes/locationRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { notificationInterceptor } from './middleware/notificationInterceptor';
import { seedMockDatabase } from './config/mockDb';
import { testGroqConnection } from './services/groqService';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(notificationInterceptor as any);

app.use((req, res, next) => {
  const authPresent = req.headers.authorization ? 'YES' : 'NO';
  res.on('finish', () => {
    console.log(`[Request Log] Method: ${req.method} | URL: ${req.originalUrl || req.url} | Status Code: ${res.statusCode} | Authorization Present: ${authPresent}`);
  });
  next();
});

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    database: 'supabase',
  });
});

// Mount Specific API Routes
// Note: Auth/Data now handled by Supabase directly from frontend.
// These routes handle AI, email, upload, and legacy compatibility.
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

// Startup
const startServer = async () => {
  // Seed mock database for offline/demonstration flow compatibility
  await seedMockDatabase();

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn('\n⚠️  [WARN] GROQ_API_KEY is not configured in backend .env. AI chatbot queries will fail until a valid key is provided.\n');
  }

  // Run startup connection audit test
  await testGroqConnection();

  const host = process.env.HOST || '0.0.0.0';
  app.listen(Number(PORT), host, () => {
    console.log(`🚀 FoodReach Backend listening on http://${host}:${PORT}`);
    console.log(`📊 Database: Supabase PostgreSQL (always-on)`);
    console.log(`🔐 Auth: Supabase Auth`);
  });
};

startServer().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

export default app;
