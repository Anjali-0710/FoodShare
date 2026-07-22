import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { getDbStatus } from '../config/db';
import { mockUsers, mockDonations } from '../config/mockDb';
import { predictFreshness, recommendNgo, predictDemand } from '../services/aiService';

// GET /api/ai/freshness-prediction
export const getFreshnessPrediction = async (req: Request, res: Response) => {
  const { foodType, preparationTime, bestBeforeDate, temperature } = req.query;

  if (!foodType || !preparationTime || !bestBeforeDate || !temperature) {
    return res.status(400).json({
      success: false,
      message: 'Please provide foodType, preparationTime, bestBeforeDate, and temperature in query parameters'
    });
  }

  try {
    const freshnessScore = predictFreshness({
      foodType: foodType as string,
      preparationTime: new Date(preparationTime as string),
      bestBeforeDate: new Date(bestBeforeDate as string),
      temperature: Number(temperature)
    });

    // Determine usability status
    let statusText = 'Excellent';
    let safetyWarning = 'Safe for direct immediate consumption.';
    
    if (freshnessScore < 20) {
      statusText = 'Spoiled/Expired';
      safetyWarning = 'Do not consume. Discard immediately.';
    } else if (freshnessScore < 50) {
      statusText = 'Needs Quick Consumption';
      safetyWarning = 'Consume only after thorough reheating.';
    } else if (freshnessScore < 80) {
      statusText = 'Good';
      safetyWarning = 'Safe to consume. Store in cool place.';
    }

    return res.status(200).json({
      success: true,
      freshnessScore,
      status: statusText,
      safetyWarning
    });
  } catch (error: any) {
    console.error('AI freshness error:', error);
    return res.status(500).json({ success: false, message: 'Freshness analysis calculation failed', error: error.message });
  }
};

// POST /api/ai/recommend-ngos
export const getNgoRecommendations = async (req: AuthenticatedRequest, res: Response) => {
  const { latitude, longitude, foodType, quantity } = req.body;

  if (!latitude || !longitude || !foodType || !quantity) {
    return res.status(400).json({
      success: false,
      message: 'Please provide latitude, longitude, foodType, and quantity of donation'
    });
  }

  try {
    const isDb = getDbStatus();
    let ngosData: any[] = [];

    if (isDb) {
      const dbNgos = await User.find({ role: 'ngo' });
      ngosData = dbNgos.map(n => ({
        id: n._id.toString(),
        name: n.name,
        lat: n.gpsLocation?.latitude || 28.6139,
        lon: n.gpsLocation?.longitude || 77.2090,
        capacity: n.ngoCapacity || 100,
        preferences: n.foodTypePreference || []
      }));
    } else {
      const mockNgos = mockUsers.filter(u => u.role === 'ngo');
      ngosData = mockNgos.map(n => ({
        id: n.id,
        name: n.name,
        lat: n.gpsLocation.latitude,
        lon: n.gpsLocation.longitude,
        capacity: n.ngoCapacity || 100,
        preferences: n.foodTypePreference || []
      }));
    }

    const recommendations = recommendNgo(
      Number(latitude),
      Number(longitude),
      foodType as string,
      Number(quantity),
      ngosData
    );

    return res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error: any) {
    console.error('AI NGO recommendation error:', error);
    return res.status(500).json({ success: false, message: 'NGO matchmaking calculation failed', error: error.message });
  }
};

// GET /api/ai/demand-prediction
export const getDemandPrediction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isDb = getDbStatus();
    let donationsHistory: any[] = [];

    if (isDb) {
      donationsHistory = await Donation.find({ status: 'Completed' }).select('foodType quantity unit createdAt');
    } else {
      donationsHistory = mockDonations.filter(d => d.status === 'Completed');
    }

    const predictions = predictDemand(donationsHistory);

    return res.status(200).json({
      success: true,
      predictions
    });
  } catch (error: any) {
    console.error('AI Demand prediction error:', error);
    return res.status(500).json({ success: false, message: 'Demand forecasting analysis failed', error: error.message });
  }
};

import { callGroqApi, GroqError, ChatMessage } from '../services/groqService';
import jwt from 'jsonwebtoken';

const chatSessions = new Map<string, { role: 'user' | 'assistant'; content: string }[]>();

const getUserIdFromHeaders = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.sub || decoded?.id || null;
  } catch (_) {
    return null;
  }
};

// POST /api/ai/chat
export const chatWithAi = async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid message string in the request body.'
    });
  }

  // Resolve user/session key
  const userId = getUserIdFromHeaders(req.headers.authorization);
  const sessionKey = userId ? `user_${userId}` : `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`;

  // Get and maintain history
  let history = chatSessions.get(sessionKey) || [];
  history.push({ role: 'user', content: message });
  if (history.length > 14) {
    history = history.slice(-14);
  }
  chatSessions.set(sessionKey, history);

  const systemPrompt = `You are the official AI assistant for the FoodReach application.
Help users navigate and use the FoodReach platform. Explain features clearly, accurately, and politely.
Focus specifically on these key FoodReach areas:
- Food Donation: how donors can list donations, specify food type (cooked, grocery, fruits, etc.), quantity, shelf life (best before hours), and prep conditions.
- NGOs: how they view available listings, request/claim donations, and manage distribution.
- Volunteers: how they sign up, accept delivery routes, record navigation status, and deliver food safely.
- Food Requests: how organizations request donations.
- Pickup Scheduling: coordinating donation collection times and locations.
- Donation Tracking: real-time tracking of food status from listing to delivery completion.
- Authentication: donor, NGO, volunteer, and admin registration and login rules.
- Dashboards: specific panels for donors, NGOs, volunteers, and admin controls.
- Notifications: alerts sent for claims, assignments, and updates.
- Food Safety: shelf-life checks, storage guidelines, and fresh transit validation.

Response Guidelines:
1. Keep responses concise (about 200 words or less), unless the user specifically asks for more detail.
2. Format your replies clearly using Markdown headings (e.g. ### Title), bullet points, and numbered steps.
3. If the user asks something completely unrelated to the FoodReach platform, answer their question normally, but politely mention that you specialize in FoodReach features and platform navigation.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history
  ];

  try {
    const responseText = await callGroqApi(messages);
    
    // Save response to history
    history.push({ role: 'assistant', content: responseText });
    chatSessions.set(sessionKey, history);

    return res.status(200).json({
      success: true,
      reply: responseText
    });
  } catch (error: any) {
    // Log server error details locally
    console.error('[AI Chat Server-Side Error Log]:', error);

    let status = 500;
    let errorType = 'SERVICE_UNAVAILABLE';
    let msg = 'An unexpected error occurred in the AI assistant module.';

    if (error instanceof GroqError) {
      status = error.status;
      if (error.code === 'MISSING_API_KEY') {
        errorType = 'MISSING_API_KEY';
        msg = 'Groq API Key has not been configured. Please add a valid GROQ_API_KEY to the backend .env file.';
      } else if (
        error.code === 'INVALID_ARGUMENT' || 
        error.message.includes('API key') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('invalid_api_key') ||
        error.status === 401
      ) {
        errorType = 'INVALID_API_KEY';
        msg = error.message;
      } else if (error.code === 'TIMEOUT') {
        errorType = 'TIMEOUT';
        msg = 'Network timeout communicating with Groq API.';
      } else if (error.status === 429) {
        errorType = 'RATE_LIMIT';
        msg = error.message;
      } else {
        errorType = 'AI_ERROR';
        msg = error.message;
      }
    } else if (error.message && error.message.includes('timeout')) {
      errorType = 'TIMEOUT';
      msg = 'Connection timed out.';
    }

    return res.status(status).json({
      success: false,
      errorType,
      message: msg
    });
  }
};
