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
